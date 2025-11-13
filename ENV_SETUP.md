# Environment Variables Setup

This project uses environment variables for configuration. **Never commit `.env` files to git** - they are already in `.gitignore`.

## Local Development

1. Copy `example.env` to `.env.local`:
   ```bash
   cp example.env .env.local
   ```

2. Fill in your actual values in `.env.local`

3. Restart your dev server after making changes

## Vercel Production

Set these environment variables in your Vercel project:

### Required Variables

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Get from: Supabase Dashboard → Project Settings → API
   - Example: `https://xxxxx.supabase.co`

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Get from: Supabase Dashboard → Project Settings → API
   - This is the `anon` `public` key

3. **SUPABASE_SERVICE_ROLE_KEY**
   - Get from: Supabase Dashboard → Project Settings → API
   - This is the `service_role` `secret` key (keep this secret!)

4. **ROOT_DOMAIN**
   - Your root domain (e.g., `reluit.com`)

5. **ADMIN_SUBDOMAIN**
   - Admin subdomain (default: `admin`)

6. **NEXT_PUBLIC_SITE_URL**
   - Full URL for email redirects (e.g., `https://reluit.com`)

### How to Set in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable:
   - **Key**: Variable name (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
   - **Value**: Your actual value
   - **Environment**: Select `Production`, `Preview`, and/or `Development` as needed
4. Click **Save**
5. **Redeploy** your project for changes to take effect

### Important Notes

- Variables starting with `NEXT_PUBLIC_` are exposed to the browser
- `SUPABASE_SERVICE_ROLE_KEY` should **never** be exposed to the browser
- After adding/changing variables, trigger a new deployment
- Use different values for Production vs Preview/Development if needed

