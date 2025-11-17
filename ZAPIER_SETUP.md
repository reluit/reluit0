# Zapier Custom Action Setup

## 🎯 Creating a Custom Action in Zapier

### Step 1: Create a Custom Action

1. Go to [Zapier](https://zapier.com) and sign in
2. Click "Create Zap"
3. Choose your trigger (e.g., "New Form Submission", "New Contact", etc.)
4. For the action, search for **"Webhooks by Zapier"**
5. Select **"POST"** action

---

## 📋 Zapier Webhook Configuration

### Action Settings

**URL**:
```
https://www.reluit.com/api/admin/tenants/create
```

**Method**: `POST`

**Data Pass-Through**: `No`

**Headers**:
```
X-API-Key: aeb414d06a7ac3d50a07c0cd603f16046227fc8fbec4c4685de6798776bf9794
Content-Type: application/json
```

**Payload Type**: `json`

**Data** (JSON):
```json
{
  "name": "{{Company Name}}",
  "email": "{{Email Address}}",
  "slug": "{{Company Name}}"
}
```

---

## 🔧 Field Mapping Examples

### From Google Forms
```json
{
  "name": "{{What is your company name?}}",
  "email": "{{What is your email address?}}",
  "slug": "{{What is your company name?}}"
}
```

### From HubSpot (New Contact)
```json
{
  "name": "{{Company Name}}",
  "email": "{{Email}}",
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

### From Airtable (New Record)
```json
{
  "name": "{{Company}}",
  "email": "{{Email}}",
  "slug": "{{Company}}"
}
```

---

## 📝 Complete Zapier Action JSON

Here's the complete JSON you can use in Zapier's "Raw" mode:

```json
{
  "url": "https://www.reluit.com/api/admin/tenants/create",
  "method": "POST",
  "headers": {
    "X-API-Key": "aeb414d06a7ac3d50a07c0cd603f16046227fc8fbec4c4685de6798776bf9794",
    "Content-Type": "application/json"
  },
  "data": {
    "name": "{{Company Name}}",
    "email": "{{Email Address}}",
    "slug": "{{Company Name}}"
  }
}
```

---

## 🧪 Testing in Zapier

1. Click "Test" in Zapier
2. Check the response - you should see:
   ```json
   {
     "success": true,
     "tenant": {
       "id": "...",
       "name": "...",
       "slug": "..."
     },
     "dashboardUrl": "https://...",
     "message": "Tenant created successfully"
   }
   ```
3. If successful, activate your Zap!

---

## ⚠️ Important Notes

1. **Use `www.reluit.com`**: Always use `www.reluit.com`, not `reluit.com`
2. **Slug Formatting**: Zapier will automatically handle the slug, but you can also use a "Code by Zapier" step to format it (lowercase, replace spaces with hyphens)
3. **Email Optional**: Email is optional - if not provided, the user will need to claim their dashboard manually
4. **Unique Slugs**: If a slug already exists, the API will return an error. Consider adding a timestamp or random string to make it unique

---

## 🔄 Advanced: Format Slug with Code Step

If you want to format the slug properly, add a "Code by Zapier" step before the webhook:

**Input Data**:
- `companyName`: `{{Company Name}}`

**Code**:
```javascript
const companyName = inputData.companyName || '';
const slug = companyName
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .substring(0, 50);

return { slug };
```

Then use `{{slug}}` in your webhook payload.

---

## 📞 Response Handling

The API returns:
- `success`: `true` if successful
- `tenant`: Tenant details including ID and slug
- `dashboardUrl`: URL where the client can access their dashboard
- `message`: Success message

You can use these in subsequent Zapier steps if needed!

