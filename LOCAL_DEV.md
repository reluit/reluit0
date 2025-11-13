# Local Development Guide

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp example.env .env.local
   # Edit .env.local with your actual Supabase credentials
   ```

3. **Start the dev server:**
   ```bash
   npm run dev
   ```

4. **Access the app:**
   - Server runs on `http://localhost:3000`

## Accessing Pages Locally

### Quick Access Routes

**Local Dev Dashboard (Easiest for UI work):**
- URL: `http://localhost:3000/dashboard`
- Loads the first tenant automatically
- Perfect for rapid UI prototyping!

**Admin Dashboard:**
- URL: `http://localhost:3000/admin`
- Create and manage tenants

**Tenant Dashboard (by slug):**
- URL: `http://localhost:3000/tenant/[slug]`
- Example: `http://localhost:3000/tenant/acme`
- Replace `[slug]` with the tenant slug from your database

**Tenant Dashboard (by domain - for testing):**
- URL: `http://localhost:3000/tenant/domain?domain=acme.reluit.com`
- This simulates accessing via subdomain

### Option 2: Simulate Subdomains with Hosts File (More Realistic)

To test subdomain routing locally, edit your `/etc/hosts` file:

```bash
sudo nano /etc/hosts
```

Add these lines:
```
127.0.0.1 admin.reluit.com
127.0.0.1 acme.reluit.com
127.0.0.1 your-tenant.reluit.com
```

Then access:
- **Admin:** `http://admin.reluit.com:3000`
- **Tenant:** `http://acme.reluit.com:3000` (or whatever tenant you created)

**Note:** You must include the port `:3000` when using custom domains locally.

### Option 3: Use a Local DNS Tool

You can use tools like:
- **dnsmasq** (macOS/Linux)
- **Acrylic DNS** (Windows)
- **localtest.me** (online service that resolves to 127.0.0.1)

## Creating Test Data

### Create a Tenant via Admin Dashboard

1. Go to `http://localhost:3000/admin`
2. Fill out the "Create Tenant" form:
   - Business name: e.g., "Acme Corp"
   - Subdomain: e.g., "acme"
   - Domain: e.g., "acme.reluit.com"
3. Click "Create Tenant"

### Create Test Call Data

You can insert test data directly into Supabase:

```sql
-- First, get a tenant_id from your tenants table
SELECT id, name FROM tenants LIMIT 1;

-- Insert an agent
INSERT INTO agents (tenant_id, name, role, metadata)
VALUES ('your-tenant-id', 'Support Agent', 'customer_support', '{}');

-- Insert call sessions
INSERT INTO call_sessions (
  tenant_id,
  agent_id,
  started_at,
  duration_seconds,
  cost_credits,
  llm_cost_usd,
  status,
  was_successful
)
VALUES (
  'your-tenant-id',
  'your-agent-id',
  NOW() - INTERVAL '1 day',
  120,
  500.00,
  0.05,
  'completed',
  true
);
```

## Troubleshooting

### CSS Not Loading
- Make sure you've restarted the dev server after CSS changes
- Clear browser cache (Cmd+Shift+R / Ctrl+Shift+R)
- Check browser console for errors

### Database Connection Issues
- Verify your `.env.local` has correct Supabase credentials
- Check Supabase dashboard → Project Settings → API
- Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set

### Subdomain Routing Not Working
- Remember: middleware bypasses subdomain routing for `localhost`
- Use direct routes (`/admin`, `/tenant/[slug]`) or set up hosts file
- Port must be included: `http://admin.reluit.com:3000`

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
npm run dev -- -p 3001
```

