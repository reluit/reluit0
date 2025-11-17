# API Usage Guide - Client Creation

## 🔑 API Keys

### CRON_SECRET
**Answer**: Yes, you can make it whatever you want! It's just a secret string to protect your cron endpoint.

**Example**: `my-super-secret-cron-key-2024`

**How to set**:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add: `CRON_SECRET` = `your-secret-here`
3. Redeploy

### ADMIN_API_KEY
**Generated API Key**: `aeb414d06a7ac3d50a07c0cd603f16046227fc8fbec4c4685de6798776bf9794`

**How to set**:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add: `ADMIN_API_KEY` = `aeb414d06a7ac3d50a07c0cd603f16046227fc8fbec4c4685de6798776bf9794`
3. Redeploy

---

## 🚀 Creating a Client Dashboard via API

### Endpoint
```
POST https://reluit.com/api/admin/tenants/create
```

### Authentication
Include your API key in one of these ways:

**Option 1: Header (Recommended)**
```bash
X-API-Key: aeb414d06a7ac3d50a07c0cd603f16046227fc8fbec4c4685de6798776bf9794
```

**Option 2: Authorization Header**
```bash
Authorization: Bearer aeb414d06a7ac3d50a07c0cd603f16046227fc8fbec4c4685de6798776bf9794
```

**Option 3: Body (Less Secure)**
```json
{
  "apiKey": "aeb414d06a7ac3d50a07c0cd603f16046227fc8fbec4c4685de6798776bf9794",
  ...
}
```

### Request Body

**Required Fields**:
- `name` (string): Company/tenant name

**Optional Fields**:
- `slug` (string): Custom URL slug (auto-generated if not provided)
- `domain` (string): Custom domain
- `subdomain` (string): Custom subdomain
- `email` (string): Primary user email

### Example Request

**Using cURL**:
```bash
curl -X POST "https://reluit.com/api/admin/tenants/create" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: aeb414d06a7ac3d50a07c0cd603f16046227fc8fbec4c4685de6798776bf9794" \
  -d '{
    "name": "Acme Corporation",
    "email": "admin@acme.com",
    "slug": "acme"
  }'
```

**Using JavaScript/Node.js**:
```javascript
const response = await fetch('https://reluit.com/api/admin/tenants/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'aeb414d06a7ac3d50a07c0cd603f16046227fc8fbec4c4685de6798776bf9794'
  },
  body: JSON.stringify({
    name: 'Acme Corporation',
    email: 'admin@acme.com',
    slug: 'acme'
  })
});

const data = await response.json();
console.log(data);
```

**Using Python**:
```python
import requests

url = "https://reluit.com/api/admin/tenants/create"
headers = {
    "Content-Type": "application/json",
    "X-API-Key": "aeb414d06a7ac3d50a07c0cd603f16046227fc8fbec4c4685de6798776bf9794"
}
data = {
    "name": "Acme Corporation",
    "email": "admin@acme.com",
    "slug": "acme"
}

response = requests.post(url, json=data, headers=headers)
print(response.json())
```

### Response

**Success (201 Created)**:
```json
{
  "success": true,
  "tenant": {
    "id": "uuid-here",
    "name": "Acme Corporation",
    "slug": "acme",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "dashboardUrl": "https://acme.reluit.com/dashboard",
  "message": "Tenant \"Acme Corporation\" created successfully"
}
```

**Error (400 Bad Request)**:
```json
{
  "error": "A tenant with slug \"acme\" already exists. Please provide a different slug."
}
```

**Error (401 Unauthorized)**:
```json
{
  "error": "Invalid API key"
}
```

---

## 🔗 Zapier Integration

### Step 1: Create a New Zap

1. Go to [Zapier](https://zapier.com) and create a new Zap
2. Choose your trigger (e.g., "New Form Submission", "New Contact", etc.)

### Step 2: Add Webhook Action

1. Search for "Webhooks by Zapier"
2. Select "POST" action
3. Configure:
   - **URL**: `https://reluit.com/api/admin/tenants/create`
   - **Method**: `POST`
   - **Data Pass-Through**: No
   - **Headers**:
     ```
     X-API-Key: aeb414d06a7ac3d50a07c0cd603f16046227fc8fbec4c4685de6798776bf9794
     Content-Type: application/json
     ```
   - **Data**:
     ```json
     {
       "name": "[Trigger Field: Company Name]",
       "email": "[Trigger Field: Email]",
       "slug": "[Trigger Field: Company Name] (lowercase, no spaces)"
     }
     ```

### Step 3: Test and Activate

1. Click "Test" to create a test tenant
2. Verify the tenant was created
3. Activate your Zap

---

## 📝 Field Mapping Examples

### From Google Forms
```json
{
  "name": "{{Company Name}}",
  "email": "{{Email Address}}",
  "slug": "{{Company Name}}"
}
```

### From HubSpot
```json
{
  "name": "{{Company Name}}",
  "email": "{{Contact Email}}",
  "slug": "{{Company Name}}"
}
```

### From Typeform
```json
{
  "name": "{{What is your company name?}}",
  "email": "{{What is your email?}}",
  "slug": "{{What is your company name?}}"
}
```

---

## 🧪 Testing Locally

If testing on localhost:

```bash
curl -X POST "http://localhost:3000/api/admin/tenants/create" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: aeb414d06a7ac3d50a07c0cd603f16046227fc8fbec4c4685de6798776bf9794" \
  -d '{
    "name": "Test Company",
    "email": "test@example.com"
  }'
```

---

## ⚠️ Important Notes

1. **Slug Uniqueness**: Slugs must be unique. If a slug already exists, the API will return an error.
2. **Auto-slug Generation**: If you don't provide a slug, one will be auto-generated from the name (lowercase, spaces replaced with hyphens).
3. **Email**: If provided, a user account will be created for that email.
4. **Dashboard URL**: The response includes the dashboard URL where the client can access their account.
5. **Setup Required**: After creation, clients need to:
   - Claim their dashboard (if email not provided)
   - Complete payment setup
   - Configure their voice agent

---

## 🔍 Troubleshooting

### "Invalid API key"
- Check that `ADMIN_API_KEY` is set in Vercel environment variables
- Verify the API key in your request matches exactly
- Redeploy after adding environment variable

### "Slug already exists"
- Choose a different slug
- Or let the API auto-generate one by omitting the `slug` field

### "Failed to create tenant"
- Check Vercel logs for detailed error messages
- Verify database connection
- Ensure Supabase is accessible

---

## 📞 Support

If you encounter issues:
1. Check Vercel function logs
2. Verify environment variables are set
3. Test with a simple cURL command first
4. Check database for existing tenants

