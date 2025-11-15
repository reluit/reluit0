# Deployment Guide - Vercel Production

## Overview
This guide covers deploying the Reluit Partnership multi-tenant dashboard to Vercel with subdomain routing and Supabase integration.

## Prerequisites
1. Vercel account
2. Supabase project
3. Domain configured (reluit.com and subdomains)
4. Environment variables configured

## 1. Environment Variables

Add these to your Vercel project settings:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]

# Root Domain Configuration
ROOT_DOMAIN=reluit.com

# Admin Configuration
ADMIN_SUBDOMAIN=admin

# Site URL
NEXT_PUBLIC_SITE_URL=https://reluit.com

# Composio Configuration
NEXT_PUBLIC_COMPOSIO_API_KEY=[your-composio-key]
COMPOSIO_ENVIRONMENT=production

# Integrations
NEXT_PUBLIC_CALENDLY_AUTH_CONFIG_ID=[your-auth-config-id]
NEXT_PUBLIC_CAL_AUTH_CONFIG_ID=[your-auth-config-id]
NEXT_PUBLIC_HUBSPOT_AUTH_CONFIG_ID=[your-auth-config-id]
NEXT_PUBLIC_PIPEDRIVE_AUTH_CONFIG_ID=[your-auth-config-id]
NEXT_PUBLIC_SALESFORCE_AUTH_CONFIG_ID=[your-auth-config-id]
```

## 2. Domain Configuration

### Root Domain (reluit.com)
1. In Vercel dashboard, go to your project
2. Navigate to Settings > Domains
3. Add domain: `reluit.com`
4. Follow DNS configuration instructions

### Subdomains (*.reluit.com)
Vercel automatically handles wildcard subdomains for domains added to your project.

For tenant subdomains (e.g., `tenant1.reluit.com`), ensure:
1. Domain points to Vercel servers
2. Wildcard DNS record: `*.reluit.com` → Vercel IP
3. Middleware handles subdomain extraction

## 3. Supabase Setup

### Create Tables
Run the migrations in order:

1. **Tenants Table** (already created)
   - Stores tenant information
   - Includes slug, name, branding, metadata

2. **Additional Tables** (created in migration)
   - `voice_profiles` - ElevenLabs voice configurations
   - `tenant_integrations` - Integration settings per tenant
   - `analytics_events` - Dashboard metrics
   - `conversation_history` - Call conversations
   - `evaluations` - Agent evaluations

### RLS Policies
All tables have RLS enabled with authenticated user policies.

### Seed Data
Create initial tenant:
```sql
INSERT INTO tenants (name, slug) VALUES ('Partnership', 'partnership');
```

## 4. Deployment Steps

### Via Vercel Dashboard
1. Connect GitHub repository to Vercel
2. Select framework preset: Next.js
3. Build command: `npm run build`
4. Output directory: `.next`
5. Add environment variables
6. Deploy

### Via CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Configure domains
vercel domains add reluit.com
vercel domains add *.reluit.com
```

## 5. Multi-Tenancy Routing

### Subdomain Structure
```
tenant1.reluit.com → [tenant1]/dashboard/home
tenant2.reluit.com → [tenant2]/dashboard/home
```

### Middleware
`src/middleware.ts` handles subdomain detection:
- Extracts subdomain from hostname
- Rewrites to `/[slug]/dashboard/*`
- Skips static files and API routes

### Page Structure
```
src/app/
  [slug]/              # Dynamic tenant routing
    dashboard/
      layout.tsx       # Tenant provider + dashboard layout
      home/page.tsx    # Home page
      evaluate/page.tsx
      agent/page.tsx
      integrations/page.tsx
      settings/page.tsx
```

## 6. API Endpoints

### Tenant Data
- `GET /api/tenant?slug={slug}` - Get tenant by slug
- Returns: tenant info, domains, agents, integrations

### Analytics
- `GET /api/analytics?tenant_id={id}&period={7d|30d|90d}`
- Returns: call metrics, charts data, summaries

### Agents
- `GET /api/agents?tenant_id={id}` - List agents
- `POST /api/agents` - Create agent

### Evaluations
- `GET /api/evaluations?tenant_id={id}` - List evaluations
- `POST /api/evaluations` - Create evaluation

## 7. ElevenLabs Integration

Voice profiles stored in Supabase:
```sql
-- Store ElevenLabs voice ID reference
INSERT INTO voice_profiles (
  tenant_id,
  name,
  elevenlabs_voice_id,
  settings
) VALUES (
  [tenant-id],
  'Professional Voice',
  'EXAVITQu4vr4xnSDxMaL',
  '{"stability": 0.75, "similarity_boost": 0.75}'
);
```

Client usage:
```typescript
// Fetch voice profiles
const { data: profiles } = await supabase
  .from('voice_profiles')
  .select('*')
  .eq('tenant_id', tenantId)
  .eq('is_active', true);

// Call ElevenLabs API with voice ID
const response = await fetch(
  `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
  {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      voice_settings: settings
    })
  }
);
```

## 8. Post-Deployment Checklist

- [ ] Verify environment variables set
- [ ] Test root domain (reluit.com)
- [ ] Test subdomain routing (tenant1.reluit.com)
- [ ] Verify Supabase connection
- [ ] Check RLS policies
- [ ] Test API endpoints
- [ ] Verify navigation links
- [ ] Test integrations (Calendly, HubSpot, etc.)
- [ ] Check analytics data loading
- [ ] Test agent creation
- [ ] Verify voice profiles

## 9. Troubleshooting

### Subdomain Not Working
1. Check DNS propagation (can take 24-48h)
2. Verify wildcard DNS record
3. Ensure domain added to Vercel
4. Check middleware configuration

### Database Connection Errors
1. Verify environment variables
2. Check Supabase project URL
3. Confirm service role key permissions
4. Review RLS policies

### 404 on Subdomain Pages
1. Check middleware.ts rewrites
2. Verify page structure
3. Ensure layout.tsx wraps with TenantProvider
4. Check navigation links include slug prefix

## 10. Monitoring

### Vercel Analytics
- Enable Vercel Analytics in dashboard
- Monitor function execution times
- Track page views and performance

### Supabase Monitoring
- Check Supabase dashboard for query performance
- Monitor RLS policy effectiveness
- Review database logs

### Error Tracking
Consider adding:
- Sentry for error tracking
- Vercel Logs for runtime errors
- Supabase logs for database issues

## Support

For deployment issues:
1. Check Vercel documentation: https://vercel.com/docs
2. Check Supabase docs: https://supabase.com/docs
3. Review Next.js deployment guide: https://nextjs.org/docs/deployment

## CI/CD Pipeline

### GitHub Actions Example
```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Vercel CLI
        run: npm install -g vercel@latest

      - name: Pull Vercel Environment Information
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build Project Artifacts
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy Project Artifacts to Vercel
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```

## Notes

- **Multi-tenancy**: Each tenant gets isolated data via tenant_id
- **Subdomains**: Automatically created via middleware routing
- **Voice Data**: Use ElevenLabs API on-demand, don't store audio files
- **Scalability**: Next.js + Vercel + Supabase scales automatically
- **Costs**: Monitor Vercel function invocations and Supabase usage
