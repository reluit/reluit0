/**
 * Test script for /api/composio/execute endpoint
 * Run with: node scripts/test-composio-execute.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const envFile of envFiles) {
    try {
      const envPath = join(__dirname, '..', envFile);
      const envContent = readFileSync(envPath, 'utf-8');
      envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=:#]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
    } catch (error) {
      // File doesn't exist, continue
    }
  }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: Supabase credentials not found');
  process.exit(1);
}

// Get site URL - prefer localhost for testing
const getSiteUrl = () => {
  // For testing, prefer localhost if available
  const testLocalhost = process.argv.includes('--local') || !process.env.NEXT_PUBLIC_SITE_URL;
  if (testLocalhost) {
    return 'http://localhost:3000';
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  const rootDomain = process.env.ROOT_DOMAIN || 'reluit.com';
  return `https://${rootDomain}`;
};

const siteUrl = getSiteUrl();
console.log(`Using site URL: ${siteUrl}`);
if (siteUrl.includes('localhost')) {
  console.log('(Make sure dev server is running: npm run dev)');
}

// Import Supabase
const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Get a test connection ID
console.log('\n=== Finding test connection ===');
const { data: integration, error: intError } = await supabase
  .from('tenant_integrations')
  .select('connection_id, integration_type, tenant_id')
  .eq('is_connected', true)
  .not('connection_id', 'is', null)
  .limit(1)
  .maybeSingle();

if (intError || !integration) {
  console.error('Error finding connection:', intError);
  console.error('No connected integrations found. Please connect an integration first.');
  process.exit(1);
}

console.log(`Found connection: ${integration.connection_id}`);
console.log(`Integration type: ${integration.integration_type}`);

// Get a test tool name for this integration
// Use the actual Composio tool name format (with prefix)
let testToolName = 'CALENDLY_GET_USER';
let testParameters = {};
if (integration.integration_type.toLowerCase() === 'calendly') {
  // Try CALENDLY_GET_CURRENT_USER which might not require parameters
  testToolName = 'CALENDLY_GET_CURRENT_USER';
  testParameters = {};
}

console.log(`\n=== Testing API endpoint ===`);
console.log(`URL: ${siteUrl}/api/composio/execute`);
console.log(`Connection ID: ${integration.connection_id}`);
console.log(`Tool Name: ${testToolName}`);
console.log(`Parameters: {}`);

// Make test request
try {
  const response = await fetch(`${siteUrl}/api/composio/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      connectionId: integration.connection_id,
      toolName: testToolName,
      parameters: testParameters,
    }),
  });

  const responseText = await response.text();
  let responseData;
  try {
    responseData = JSON.parse(responseText);
  } catch {
    responseData = responseText;
  }

  console.log(`\n=== Response ===`);
  console.log(`Status: ${response.status} ${response.statusText}`);
  console.log(`Body:`, JSON.stringify(responseData, null, 2));

  if (response.ok) {
    console.log('\n✓ API endpoint is working!');
  } else {
    console.log('\n✗ API endpoint returned an error');
  }
} catch (error) {
  console.error('\n✗ Error calling API:', error.message);
  if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
    console.error('\nMake sure your dev server is running: npm run dev');
  }
  process.exit(1);
}

