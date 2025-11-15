# Reluit Partnership Dashboard

A multi-tenant B2B SaaS dashboard built with Next.js 16, Supabase, and Vercel. Features AI voice agents, analytics, integrations, and evaluation tools.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Vercel account (for deployment)

### Local Development

1. **Clone and Install**
```bash
git clone <repository>
cd reluit0
npm install
```

2. **Environment Setup**
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ROOT_DOMAIN=reluit.com
ADMIN_SUBDOMAIN=admin
NEXT_PUBLIC_SITE_URL=https://reluit.com
```

3. **Database Setup**
```bash
# Run the database migrations (tables are already created in Supabase)
# Seed initial tenants
npm run seed
```

4. **Start Development Server**
```bash
npm run dev
```

Visit:
- Local: http://localhost:3000/partnership/dashboard/home
- Partnership Demo: http://localhost:3000/partnership/dashboard/home

## 📁 Project Structure

```
src/
├── app/
│   ├── [slug]/                  # Multi-tenant routing
│   │   ├── dashboard/
│   │   │   ├── layout.tsx       # Tenant-aware dashboard layout
│   │   │   ├── home/page.tsx    # Analytics dashboard
│   │   │   ├── evaluate/page.tsx
│   │   │   ├── agent/page.tsx
│   │   │   ├── integrations/page.tsx
│   │   │   └── settings/page.tsx
│   │   └── layout.tsx           # Tenant provider wrapper
│   ├── api/                     # API routes
│   │   ├── tenant/              # Tenant data endpoints
│   │   ├── analytics/           # Dashboard metrics
│   │   ├── agents/              # Agent management
│   │   └── evaluations/         # Evaluation tools
│   └── dashboard/               # Legacy dashboard (for testing)
├── components/
│   ├── ui/                      # Reusable UI components
│   ├── integrations/            # Integration drawers
│   └── tenant-provider.tsx      # Tenant context provider
├── hooks/
│   └── use-tenant.ts            # Tenant data hook
├── lib/
│   ├── utils.ts                 # Utilities
│   └── composio.ts              # Composio integration
├── middleware.ts                # Subdomain routing logic
└── scripts/
    └── seed-tenants.ts          # Database seeding

public/
└── *.png                        # Integration logos
```

## 🏗️ Architecture

### Multi-Tenancy
- **Subdomain-based**: Each tenant gets `tenant-name.reluit.com`
- **Middleware routing**: Automatically detects subdomain and routes to `/[slug]/dashboard/*`
- **Data isolation**: All queries scoped by `tenant_id`

### Database Schema

**Core Tables:**
- `tenants` - Tenant information and branding
- `tenant_domains` - Domain/subdomain mappings
- `tenant_users` - User-tenant relationships
- `agents` - AI agent configurations
- `call_sessions` - Call history and metrics

**Feature Tables:**
- `voice_profiles` - ElevenLabs voice configurations (API on-demand)
- `tenant_integrations` - Integration settings (Calendly, HubSpot, etc.)
- `analytics_events` - Dashboard metrics and events
- `conversation_history` - Call conversations
- `evaluations` - Agent performance evaluations

### API Design

All API endpoints follow RESTful conventions:
```
GET    /api/tenant?slug={slug}           # Get tenant by slug
GET    /api/analytics?tenant_id={id}     # Get dashboard metrics
GET    /api/agents?tenant_id={id}        # List agents
POST   /api/agents                       # Create agent
GET    /api/evaluations?tenant_id={id}   # List evaluations
POST   /api/evaluations                  # Create evaluation
```

## 🎨 Features

### Dashboard (Home)
- Call analytics with interactive charts
- Real-time metrics (calls, duration, cost)
- Configurable widgets (drag & drop)
- Date range filtering
- Success rate tracking

### Evaluate Page
- Agent performance evaluations
- Customizable evaluation criteria
- Scoring and feedback system
- Historical evaluation tracking

### Agent Page
- Voice profile management
- ElevenLabs integration
- Agent configuration
- Usage statistics

### Integrations Page
- Calendly, Cal.com
- HubSpot CRM
- Pipedrive CRM
- Salesforce CRM
- OAuth and API key support

### Settings Page
- Tenant branding
- User management
- Billing (future)
- API keys (future)

## 🔌 Integrations

### ElevenLabs (Voice)
- Voice synthesis via API
- Voice profiles stored in Supabase
- No audio files stored (on-demand generation)
- Real-time voice selection

### Calendly
- Appointment scheduling
- Webhook integration
- Booking tracking

### CRM Systems
- HubSpot, Pipedrive, Salesforce
- Lead capture and management
- Contact synchronization

## 🚢 Deployment

### Vercel (Recommended)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

**Quick Deploy:**
1. Connect GitHub repo to Vercel
2. Add environment variables
3. Add domain: `reluit.com`
4. Deploy automatically on `git push`

**Domain Setup:**
- Root: `reluit.com` → Main dashboard
- Wildcard: `*.reluit.com` → Tenant dashboards
- Auto-routing via middleware

### Environment Variables

Required for production:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Domain
ROOT_DOMAIN=reluit.com
ADMIN_SUBDOMAIN=admin
NEXT_PUBLIC_SITE_URL=https://reluit.com

# Integrations
NEXT_PUBLIC_COMPOSIO_API_KEY=...
NEXT_PUBLIC_CALENDLY_AUTH_CONFIG_ID=...
NEXT_PUBLIC_HUBSPOT_AUTH_CONFIG_ID=...
NEXT_PUBLIC_PIPEDRIVE_AUTH_CONFIG_ID=...
NEXT_PUBLIC_SALESFORCE_AUTH_CONFIG_ID=...
```

## 🔒 Security

### Row Level Security (RLS)
All tables use Supabase RLS with authenticated user policies.

### Data Isolation
- Tenant ID scoping on all queries
- Middleware validates subdomain
- API routes check tenant access

### Best Practices
- Service role key for server-side operations only
- Anon key for client-side (read-only)
- Environment variables for sensitive data
- No credentials in code

## 📊 Analytics

### Metrics Tracked
- Call volume and trends
- Call duration and success rates
- Cost tracking (credits and USD)
- Sentiment analysis
- Peak hours analysis
- Booking activity

### Data Flow
1. Call events logged to Supabase
2. Analytics API aggregates data
3. Dashboard charts visualize metrics
4. Real-time updates via React state

## 🎯 Voice Integration

### ElevenLabs API Usage
```typescript
// Fetch tenant's voice profiles
const { data: profiles } = await supabase
  .from('voice_profiles')
  .select('*')
  .eq('tenant_id', tenantId);

// Use voice ID with ElevenLabs API
const audio = await fetch(
  `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
  {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY!,
    },
    body: JSON.stringify({
      text: "Hello from Reluit!",
      voice_settings: settings
    })
  }
);
```

## 🧪 Testing

```bash
# Run linting
npm run lint

# Type checking
npm run build

# Seed test data
npm run seed
```

## 📚 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Deployment**: Vercel
- **Voice API**: ElevenLabs
- **Integrations**: Composio SDK

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Support

- Documentation: [DEPLOYMENT.md](./DEPLOYMENT.md)
- Issues: GitHub Issues
- Email: srirammk@reluit.com

## 🗺️ Roadmap

- [ ] Billing and subscriptions
- [ ] Advanced analytics
- [ ] More integrations
- [ ] Mobile app
- [ ] Webhook system
- [ ] Custom voice cloning
- [ ] A/B testing for agents
- [ ] Advanced security (2FA, SSO)

## 📊 Stats

- 6 core pages (Home, Evaluate, Agent, Integrations, Settings, Conversations)
- 10+ API endpoints
- 5 database tables
- 5+ integrations
- Multi-tenant ready
- Production deployable

---

**Built with ❤️ by Reluit Team**
