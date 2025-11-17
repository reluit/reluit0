# Environment Variables Setup

## 🔑 Required Environment Variables

### 1. CRON_SECRET
**Purpose**: Protects your cron job endpoint from unauthorized access

**Value**: You can use ANY string you want! It's just a secret password.

**Examples**:
- `my-super-secret-cron-key-2024`
- `reluit-cron-secret-12345`
- `a1b2c3d4e5f6g7h8i9j0`

**How to set in Vercel**:
1. Go to Vercel Dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add new variable:
   - **Name**: `CRON_SECRET`
   - **Value**: `your-secret-here` (use any string you want)
   - **Environment**: Production, Preview, Development (select all)
5. Click "Save"
6. **Redeploy** your project

---

### 2. ADMIN_API_KEY
**Purpose**: Authenticates API requests to create tenants programmatically

**Generated Value**: 
```
aeb414d06a7ac3d50a07c0cd603f16046227fc8fbec4c4685de6798776bf9794
```

**How to set in Vercel**:
1. Go to Vercel Dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add new variable:
   - **Name**: `ADMIN_API_KEY`
   - **Value**: `aeb414d06a7ac3d50a07c0cd603f16046227fc8fbec4c4685de6798776bf9794`
   - **Environment**: Production, Preview, Development (select all)
5. Click "Save"
6. **Redeploy** your project

---

## 📋 Quick Setup Checklist

- [ ] Set `CRON_SECRET` in Vercel (use any string you want)
- [ ] Set `ADMIN_API_KEY` in Vercel (use the generated key above)
- [ ] Redeploy your project
- [ ] Test the cron job (wait for 2 AM UTC or trigger manually)
- [ ] Test the API endpoint (use the API guide)

---

## 🧪 Testing After Setup

### Test Cron Job
```bash
curl -X GET "https://reluit.com/api/cron/sync-tools" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Test API Endpoint
```bash
curl -X POST "https://reluit.com/api/admin/tenants/create" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: aeb414d06a7ac3d50a07c0cd603f16046227fc8fbec4c4685de6798776bf9794" \
  -d '{
    "name": "Test Company",
    "email": "test@example.com"
  }'
```

---

## ⚠️ Important Notes

1. **CRON_SECRET**: Can be any string - it's just for basic authentication
2. **ADMIN_API_KEY**: Use the generated key above, or generate a new one if you prefer
3. **Redeploy Required**: After adding environment variables, you MUST redeploy for them to take effect
4. **Security**: Never commit these values to git or share them publicly

---

## 🔄 Generating a New API Key

If you want to generate a new API key:

**Using Node.js**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Using Python**:
```python
import secrets
print(secrets.token_hex(32))
```

**Using OpenSSL**:
```bash
openssl rand -hex 32
```

