/**
 * Test script to actually fetch tools from Composio and test syncing
 * Run with: node scripts/test-composio-sync.mjs
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

const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY || process.env.NEXT_PUBLIC_COMPOSIO_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

if (!COMPOSIO_API_KEY) {
  console.error('Error: COMPOSIO_API_KEY not found in environment variables');
  process.exit(1);
}

if (!ELEVENLABS_API_KEY) {
  console.error('Error: ELEVENLABS_API_KEY not found in environment variables');
  process.exit(1);
}

// Import Composio SDK
let Composio;
try {
  const composioModule = await import('@composio/core');
  Composio = composioModule.Composio || composioModule.default || composioModule;
} catch (error) {
  console.error('Error importing Composio:', error);
  process.exit(1);
}

// Conversion functions (same as in tools.ts)
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
    .replace(/_/g, ' ')
    .replace(/\s*-\s*/g, ' ')
    .replace(/\s+/g, ' ');
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
      const allowedWithoutPrefix = allowed.replace(/^[A-Z]+[\s_]+/i, '');
      const normalizedAllowedWithoutPrefix = normalizeForMatching(allowedWithoutPrefix);
      if (normalizedAllowedWithoutPrefix === normalizedReadable) {
        isAllowed = true;
        break;
      }
    }
    
    // Special case matching: "Get Current user" should match "Get user"
    if (!isAllowed && normalizedReadable.includes('get current user')) {
      for (const allowed of allowedTools) {
        const normalizedAllowed = normalizeForMatching(allowed);
        if (normalizedAllowed === 'get user' || normalizedAllowed.includes('get user')) {
          isAllowed = true;
          break;
        }
      }
    }
    
    // Special case matching: "Get event Invitee" should match "List event invitees"
    if (!isAllowed && normalizedReadable.includes('get event invitee')) {
      for (const allowed of allowedTools) {
        const normalizedAllowed = normalizeForMatching(allowed);
        if (normalizedAllowed.includes('list event invitees') || normalizedAllowed.includes('get event invitee')) {
          isAllowed = true;
          break;
        }
      }
    }
  }
  
  return isAllowed;
}

async function main() {
  try {
    console.log('Initializing Composio client...');
    console.log('API Key present:', !!COMPOSIO_API_KEY);
    console.log('API Key length:', COMPOSIO_API_KEY?.length || 0);
    
    // Initialize Composio - try different ways
    let composio;
    if (typeof Composio === 'function') {
      composio = new Composio({ apiKey: COMPOSIO_API_KEY });
    } else if (Composio.default) {
      composio = new Composio.default({ apiKey: COMPOSIO_API_KEY });
    } else {
      composio = Composio.init({ apiKey: COMPOSIO_API_KEY });
    }
    
    console.log('\n=== Fetching Calendly tools from Composio ===\n');
    
    // Try to get tools for Calendly
    // First, let's try to get a user email or ID - we'll need this
    // For testing, let's try to get tools directly
    let tools;
    
    try {
      // Try getting tools for the CALENDLY toolkit - try multiple methods
      console.log('Attempting to fetch tools for CALENDLY toolkit...');
      
      // Method 1: getRawComposioTools (most comprehensive)
      try {
        tools = await composio.tools.getRawComposioTools({
          filterBy: {
            toolkits: ['CALENDLY'],
          },
        });
        console.log('Got tools using getRawComposioTools:', typeof tools, Array.isArray(tools));
      } catch (error1) {
        console.log('getRawComposioTools failed, trying get()...');
        // Method 2: tools.get
        try {
          tools = await composio.tools.get('test@example.com', {
            toolkits: ['CALENDLY'],
          });
          console.log('Got tools using tools.get:', typeof tools, Array.isArray(tools));
        } catch (error2) {
          console.error('Both methods failed:', error2.message);
          throw error2;
        }
      }
    } catch (error) {
      console.error('Error fetching tools:', error.message);
      throw error;
    }
    
    // Handle different response formats
    let toolsArray = [];
    if (Array.isArray(tools)) {
      toolsArray = tools;
    } else if (tools && typeof tools === 'object') {
      if (Array.isArray(tools.data)) {
        toolsArray = tools.data;
      } else if (Array.isArray(tools.tools)) {
        toolsArray = tools.tools;
      } else if (Array.isArray(tools.items)) {
        toolsArray = tools.items;
      } else {
        const keys = Object.keys(tools);
        console.log('Tools object keys:', keys.join(', '));
        for (const key of keys) {
          if (Array.isArray(tools[key])) {
            toolsArray = tools[key];
            break;
          }
        }
      }
    }
    
    console.log(`\nFound ${toolsArray.length} tool(s) from Composio\n`);
    
    if (toolsArray.length === 0) {
      console.log('No tools found. Showing first tool structure if available:');
      if (tools && typeof tools === 'object') {
        console.log(JSON.stringify(tools, null, 2).substring(0, 500));
      }
      return;
    }
    
    // Show all tools
    console.log('=== All Tools from Composio ===\n');
    toolsArray.forEach((tool, idx) => {
      const toolName = tool.name || tool.function?.name || tool.id || 'Unknown';
      console.log(`${idx + 1}. Tool name: "${toolName}"`);
      console.log(`   Keys: ${Object.keys(tool).join(', ')}`);
      if (tool.function) {
        console.log(`   Function name: ${tool.function.name || 'N/A'}`);
      }
      // Show full tool object for first few
      if (idx < 3) {
        console.log(`   Full tool: ${JSON.stringify(tool, null, 2).substring(0, 200)}...`);
      }
    });
    
    // Specifically look for "list" or "events" in tool names
    console.log('\n=== Tools containing "LIST" or "EVENTS" ===\n');
    const listOrEventsTools = toolsArray.filter(tool => {
      const name = (tool.name || tool.function?.name || '').toUpperCase();
      return name.includes('LIST') || (name.includes('EVENT') && name.includes('S'));
    });
    if (listOrEventsTools.length > 0) {
      listOrEventsTools.forEach(tool => {
        const name = tool.name || tool.function?.name || 'Unknown';
        console.log(`  - "${name}"`);
      });
    } else {
      console.log('  No tools found with "LIST" or plural "EVENTS"');
      console.log('\n  Checking all tools with "EVENT" in name:');
      const eventTools = toolsArray.filter(tool => {
        const name = (tool.name || tool.function?.name || '').toUpperCase();
        return name.includes('EVENT');
      });
      eventTools.forEach(tool => {
        const name = tool.name || tool.function?.name || 'Unknown';
        const readable = convertComposioToolNameToReadable(name);
        console.log(`    - "${name}" (readable: "${readable}")`);
      });
    }
    
    // Filter tools
    console.log('\n=== Filtering Tools ===\n');
    const filteredTools = toolsArray.filter((tool) => {
      const toolName = tool.name || tool.function?.name || "";
      const readableName = convertComposioToolNameToReadable(toolName);
      const allowed = isToolAllowed(toolName, 'calendly');
      
      console.log(`Tool: "${toolName}"`);
      console.log(`  Readable: "${readableName}"`);
      console.log(`  Allowed: ${allowed ? '✓ YES' : '✗ NO'}`);
      console.log('');
      
      return allowed;
    });
    
    console.log(`\n=== Results ===`);
    console.log(`Total tools: ${toolsArray.length}`);
    console.log(`Filtered (allowed): ${filteredTools.length}`);
    console.log(`Expected: 6`);
    
    // Find the tools we need
    const neededTools = [
      'Cancel event',
      'Create One-Off Event Type',
      'Get event',
      'Get user',
      'List event invitees',
      'List events',
    ];
    
    console.log('\n=== Looking for required tools ===');
    neededTools.forEach(needed => {
      const found = toolsArray.find(tool => {
        const name = tool.name || tool.function?.name || '';
        const readable = convertComposioToolNameToReadable(name);
        return normalizeForMatching(readable) === normalizeForMatching(needed);
      });
      
      if (found) {
        const name = found.name || found.function?.name || 'Unknown';
        const readable = convertComposioToolNameToReadable(name);
        console.log(`✓ "${needed}" -> Found as: "${name}" (readable: "${readable}")`);
      } else {
        console.log(`✗ "${needed}" -> NOT FOUND`);
        // Try to find similar
        const similar = toolsArray.filter(tool => {
          const name = tool.name || tool.function?.name || '';
          const readable = convertComposioToolNameToReadable(name);
          return readable.toLowerCase().includes(needed.toLowerCase().split(' ')[0]);
        });
        if (similar.length > 0) {
          console.log(`  Similar tools found:`);
          similar.forEach(t => {
            const n = t.name || t.function?.name || 'Unknown';
            const r = convertComposioToolNameToReadable(n);
            console.log(`    - "${n}" (readable: "${r}")`);
          });
        }
      }
    });
    
    if (filteredTools.length < 6) {
      console.log(`\n⚠️  Only ${filteredTools.length} tools matched, expected 6!`);
      console.log('\nAllowed tools:');
      filteredTools.forEach(tool => {
        const name = tool.name || tool.function?.name || 'Unknown';
        console.log(`  - ${name}`);
      });
    } else {
      console.log('\n✓ All 6 tools matched!');
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

main();

