/**
 * Test script to sync Composio tools to ElevenLabs
 * Run with: node scripts/test-tool-sync.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to load .env.local or .env file
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

// Import the sync function
// Since we're in a .mjs file, we need to use dynamic import or convert to TypeScript
// Let's use a simpler approach - directly test the logic

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY || process.env.NEXT_PUBLIC_COMPOSIO_API_KEY;

if (!ELEVENLABS_API_KEY) {
  console.error('Error: ELEVENLABS_API_KEY not found in environment variables');
  process.exit(1);
}

if (!COMPOSIO_API_KEY) {
  console.error('Error: COMPOSIO_API_KEY not found in environment variables');
  process.exit(1);
}

// Test the conversion functions
function convertComposioToolNameToReadable(composioName) {
  const withoutPrefix = composioName.replace(/^[A-Z]+_/, '');
  
  const words = withoutPrefix.split('_').map((word, index) => {
    const upperWord = word.toUpperCase();
    
    if (upperWord === 'CANCEL') return 'Cancel';
    if (upperWord === 'CREATE') return 'Create';
    if (upperWord === 'GET') return 'Get';
    if (upperWord === 'LIST') return 'List';
    if (upperWord === 'ADD') return 'Add';
    if (upperWord === 'UPDATE') return 'Update';
    if (upperWord === 'DELETE') return 'Delete';
    if (upperWord === 'SEARCH') return 'Search';
    
    if (upperWord === 'EVENT' && index > 0) return 'event';
    if (upperWord === 'EVENTS') return 'events';
    if (upperWord === 'USER' && index > 0) return 'user';
    if (upperWord === 'INVITEES') return 'invitees';
    if (upperWord === 'TYPE') return 'Type';
    if (upperWord === 'ID' || upperWord === 'IDS') return word;
    if (upperWord === 'CRM') return word;
    if (upperWord === 'UID') return 'uid';
    if (upperWord === 'NO') return 'No';
    if (upperWord === 'SHOW') return 'Show';
    if (upperWord === 'ONE') return 'One';
    if (upperWord === 'OFF') return 'Off';
    
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
  
  let result = words.join(' ');
  result = result.replace(/\bOne Off\b/gi, 'One-Off');
  
  return result;
}

function normalizeForMatching(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ')        // Normalize underscores to spaces
    .replace(/\s*-\s*/g, ' ')  // Normalize hyphens to spaces
    .replace(/\s+/g, ' ');     // Normalize multiple spaces
}

const ALLOWED_TOOLS = {
  calendly: [
    "Cancel event",
    "Cancel Event",
    "CANCEL_EVENT",
    "CALENDLY_CANCEL_EVENT",
    "Create One-Off Event Type",
    "Create One Off Event Type",
    "CREATE_ONE_OFF_EVENT_TYPE",
    "CALENDLY_CREATE_ONE_OFF_EVENT_TYPE",
    "Get event",
    "Get Event",
    "GET_EVENT",
    "CALENDLY_GET_EVENT",
    "Get user",
    "Get User",
    "GET_USER",
    "CALENDLY_GET_USER",
    "List event invitees",
    "List Event Invitees",
    "LIST_EVENT_INVITEES",
    "CALENDLY_LIST_EVENT_INVITEES",
    "List events",
    "List Events",
    "LIST_EVENTS",
    "CALENDLY_LIST_EVENTS",
  ],
};

function isToolAllowed(toolName, integrationType) {
  const normalizedIntegrationType = integrationType.toLowerCase();
  const allowedTools = ALLOWED_TOOLS[normalizedIntegrationType];
  
  if (!allowedTools) {
    return true;
  }
  
  const normalizedToolName = normalizeForMatching(toolName);
  
  let isAllowed = false;
  for (const allowed of allowedTools) {
    const normalizedAllowed = normalizeForMatching(allowed);
    if (normalizedAllowed === normalizedToolName) {
      isAllowed = true;
      break;
    }
  }
  
  if (!isAllowed) {
    const readableName = convertComposioToolNameToReadable(toolName);
    const normalizedReadable = normalizeForMatching(readableName);
    
    for (const allowed of allowedTools) {
      const normalizedAllowed = normalizeForMatching(allowed);
      if (normalizedAllowed === normalizedReadable) {
        isAllowed = true;
        break;
      }
    }
  }
  
  return isAllowed;
}

// Test with expected Calendly tool names
console.log('=== Testing Calendly Tool Name Conversion ===\n');

const testTools = [
  'CALENDLY_CANCEL_EVENT',
  'CALENDLY_CREATE_ONE_OFF_EVENT_TYPE',
  'CALENDLY_GET_EVENT',
  'CALENDLY_GET_USER',
  'CALENDLY_LIST_EVENT_INVITEES',
  'CALENDLY_LIST_EVENTS',
];

testTools.forEach(toolName => {
  const readable = convertComposioToolNameToReadable(toolName);
  const normalized = normalizeForMatching(readable);
  const allowed = isToolAllowed(toolName, 'calendly');
  
  console.log(`Tool: ${toolName}`);
  console.log(`  Readable: "${readable}"`);
  console.log(`  Normalized: "${normalized}"`);
  console.log(`  Allowed: ${allowed ? '✓ YES' : '✗ NO'}`);
  console.log('');
});

// Also test what the whitelist normalizes to
console.log('\n=== Whitelist Normalized Values ===\n');
ALLOWED_TOOLS.calendly.forEach(allowed => {
  console.log(`"${allowed}" -> "${normalizeForMatching(allowed)}"`);
});

