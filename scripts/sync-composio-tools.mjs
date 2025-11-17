/**
 * Simplified Composio tools sync script
 * 
 * This script syncs Composio tools to ElevenLabs for a given tenant and user.
 * It fetches connected integrations, gets tools from Composio, filters them based
 * on a whitelist, and creates them in ElevenLabs (or uses existing ones).
 * 
 * Usage:
 *   node scripts/sync-composio-tools.mjs [tenantId] [userId]
 * 
 * If no arguments provided, it will list available tenants/users.
 * 
 * Example:
 *   node scripts/sync-composio-tools.mjs c1a9570a-8836-46a8-aab4-d0338a2ab239 056f60cc-b117-4ef9-9c0a-4f6b76a62500
 * 
 * The script will:
 * 1. Fetch connected integrations from the database
 * 2. Get tools from Composio for each integration
 * 3. Filter tools based on ALLOWED_TOOLS whitelist
 * 4. Create tools in ElevenLabs (or use existing ones)
 * 5. Return a summary of synced tools
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

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

// Required environment variables
const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY || process.env.NEXT_PUBLIC_COMPOSIO_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!COMPOSIO_API_KEY) {
  console.error('Error: COMPOSIO_API_KEY not found');
  process.exit(1);
}

if (!ELEVENLABS_API_KEY) {
  console.error('Error: ELEVENLABS_API_KEY not found');
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: Supabase credentials not found');
  process.exit(1);
}

// Initialize clients
let Composio;
try {
  const composioModule = await import('@composio/core');
  Composio = composioModule.Composio || composioModule.default || composioModule;
} catch (error) {
  console.error('Error importing Composio:', error);
  process.exit(1);
}

const composio = typeof Composio === 'function' 
  ? new Composio({ apiKey: COMPOSIO_API_KEY })
  : Composio.init({ apiKey: COMPOSIO_API_KEY });

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ElevenLabs API helpers
async function listElevenLabsTools() {
  const response = await fetch('https://api.elevenlabs.io/v1/convai/tools', {
    method: 'GET',
    headers: { 'xi-api-key': ELEVENLABS_API_KEY },
  });
  
  if (!response.ok) {
    console.error('Failed to list ElevenLabs tools');
    return [];
  }
  
  const data = await response.json();
  if (Array.isArray(data)) {
    return data.map(tool => ({
      id: tool.id || tool.tool_id,
      name: tool.tool_config?.name || tool.name || '',
    }));
  } else if (data.tools && Array.isArray(data.tools)) {
    return data.tools.map(tool => ({
      id: tool.id || tool.tool_id,
      name: tool.tool_config?.name || tool.name || '',
    }));
  }
  return [];
}

async function createElevenLabsTool(toolConfig) {
  const response = await fetch('https://api.elevenlabs.io/v1/convai/tools', {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(toolConfig),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create tool: ${errorText}`);
  }
  
  const data = await response.json();
  return { tool_id: data.id || data.tool_id || data.toolId };
}

// Simple normalization - just lowercase and replace spaces/underscores
function normalize(name) {
  return name
    .toLowerCase()
    .replace(/[_\s-]+/g, ' ')
    .trim();
}

// Convert Composio tool name to readable format
function toReadable(composioName) {
  const withoutPrefix = composioName.replace(/^[A-Z]+_/, '');
  const words = withoutPrefix.split('_').map(word => {
    const upper = word.toUpperCase();
    if (upper === 'CANCEL') return 'Cancel';
    if (upper === 'CREATE') return 'Create';
    if (upper === 'GET') return 'Get';
    if (upper === 'LIST') return 'List';
    if (upper === 'ADD') return 'Add';
    if (upper === 'UPDATE') return 'Update';
    if (upper === 'DELETE') return 'Delete';
    if (upper === 'EVENT' || upper === 'EVENTS') return upper === 'EVENTS' ? 'events' : 'event';
    if (upper === 'USER') return 'user';
    if (upper === 'INVITEES') return 'invitees';
    if (upper === 'TYPE') return 'Type';
    if (upper === 'ONE') return 'One';
    if (upper === 'OFF') return 'Off';
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
  return words.join(' ').replace(/\bOne Off\b/gi, 'One-Off');
}

// Convert to ElevenLabs format (underscores, no spaces)
function toElevenLabsName(name) {
  return name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').substring(0, 64);
}

// Allowed tools - simple list
const ALLOWED_TOOLS = {
  calendly: [
    'cancel event',
    'create one-off event type',
    'get event',
    'get user',
    'list event invitees',
    'list events',
  ],
};

// Simple check if tool is allowed
function isAllowed(toolName, integrationType) {
  const allowed = ALLOWED_TOOLS[integrationType.toLowerCase()];
  if (!allowed) return true; // Allow all if no whitelist
  
  const normalized = normalize(toolName);
  const readable = toReadable(toolName);
  const normalizedReadable = normalize(readable);
  
  // Check each allowed tool
  for (const a of allowed) {
    const normalizedAllowed = normalize(a);
    
    // Direct match
    if (normalized === normalizedAllowed || normalizedReadable === normalizedAllowed) {
      return true;
    }
    
    // Flexible matching: "Get Current user" should match "Get user"
    if (normalizedReadable.includes('get') && normalizedReadable.includes('user') && 
        normalizedAllowed.includes('get') && normalizedAllowed.includes('user')) {
      return true;
    }
    
    // Flexible matching: "List events" variations
    if (normalizedReadable.includes('list') && normalizedReadable.includes('event') && 
        normalizedAllowed.includes('list') && normalizedAllowed.includes('event')) {
      // But exclude "List event invitees" when looking for "List events"
      if (normalizedAllowed.includes('list events') && !normalizedReadable.includes('invitee') && !normalizedReadable.includes('type')) {
        return true;
      }
      // Match "List event invitees" - also match "Get event Invitee" as fallback
      if (normalizedAllowed.includes('list event invitees')) {
        if (normalizedReadable.includes('invitee') || normalizedReadable.includes('invitees')) {
          return true;
        }
      }
    }
    
    // Match "Get event Invitee" as fallback for "List event invitees" if no list version exists
    if (normalizedReadable.includes('get') && normalizedReadable.includes('event') && normalizedReadable.includes('invitee') &&
        normalizedAllowed.includes('list event invitees')) {
      return true;
    }
  }
  
  return false;
}

// Convert Composio tool to ElevenLabs format
function convertTool(composioTool, connectionId) {
  const rawName = composioTool.name || composioTool.function?.name || 'Unknown';
  const readableName = rawName.includes('_') ? toReadable(rawName) : rawName;
  const toolName = toElevenLabsName(readableName);
  const description = composioTool.description || composioTool.function?.description || '';
  const parameters = composioTool.parameters || composioTool.function?.parameters || {};
  
  // Convert parameters schema
  function convertSchema(schema) {
    if (!schema || typeof schema !== 'object') {
      return { type: 'object', properties: {}, required: [] };
    }
    
    if (schema.type === 'object') {
      const properties = {};
      const required = [];
      
      if (schema.properties) {
        for (const [key, prop] of Object.entries(schema.properties)) {
          properties[key] = convertProperty(prop);
          if (schema.required?.includes(key)) {
            required.push(key);
          }
        }
      }
      
      return { type: 'object', properties, required };
    }
    
    return { type: 'object', properties: {}, required: [] };
  }
  
  function convertProperty(prop) {
    if (!prop || typeof prop !== 'object') {
      return { type: 'string', description: 'Parameter value' };
    }
    
    if (prop.type === 'array') {
      return {
        type: 'array',
        description: prop.description || 'Array parameter',
        items: prop.items ? convertProperty(prop.items) : { type: 'string' },
      };
    }
    
    if (prop.type === 'object') {
      return convertSchema(prop);
    }
    
    const result = {
      type: prop.type || 'string',
      description: prop.description || `${prop.type || 'string'} value`,
    };
    
    if (prop.enum && Array.isArray(prop.enum)) {
      result.enum = prop.enum;
    }
    
    return result;
  }
  
  const parametersSchema = convertSchema(parameters);
  
  // Get site URL - use NEXT_PUBLIC_SITE_URL or construct from ROOT_DOMAIN
  const getSiteUrl = () => {
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      return process.env.NEXT_PUBLIC_SITE_URL;
    }
    const rootDomain = process.env.ROOT_DOMAIN || 'reluit.com';
    return `https://${rootDomain}`;
  };
  const webhookUrl = `${getSiteUrl()}/api/composio/execute`;
  
  return {
    tool_config: {
      type: 'webhook',
      name: toolName,
      description: description,
      api_schema: {
        url: webhookUrl,
        method: 'POST',
        path_params_schema: {},
        query_params_schema: null,
        request_body_schema: {
          type: 'object',
          properties: {
            connectionId: {
              type: 'string',
              constant_value: connectionId,
            },
            toolName: {
              type: 'string',
              constant_value: toolName,
            },
            parameters: parametersSchema,
          },
          required: ['parameters'],
        },
        request_headers: {
          'Content-Type': 'application/json',
        },
        content_type: 'application/json',
        auth_connection: null,
      },
      response_timeout_secs: 30,
    },
  };
}

// Main sync function
async function syncTools(tenantId, userId) {
  console.log(`\n=== Syncing Composio Tools ===`);
  console.log(`Tenant ID: ${tenantId}`);
  console.log(`User ID: ${userId}\n`);
  
  // Get connected integrations
  const { data: integrations, error: intError } = await supabase
    .from('tenant_integrations')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .eq('is_connected', true)
    .not('connection_id', 'is', null);
  
  if (intError) {
    console.error('Error fetching integrations:', intError);
    return { toolIds: [], errors: [intError.message] };
  }
  
  if (!integrations || integrations.length === 0) {
    console.log('No connected integrations found');
    return { toolIds: [], errors: [] };
  }
  
  console.log(`Found ${integrations.length} connected integration(s)\n`);
  
  // Get existing ElevenLabs tools
  const existingTools = await listElevenLabsTools();
  const existingByName = new Map();
  existingTools.forEach(tool => {
    if (tool.name) {
      existingByName.set(tool.name.toLowerCase(), tool.id);
    }
  });
  console.log(`Found ${existingTools.length} existing tool(s) in ElevenLabs\n`);
  
  const toolIds = [];
  const errors = [];
  const processed = new Set();
  
  // Process each integration
  for (const integration of integrations) {
    try {
      console.log(`\n--- Processing ${integration.integration_type} ---`);
      
      // Get tools from Composio
      // Try getRawComposioTools FIRST to get ALL available tools (not filtered by connection)
      let tools;
      const toolkitMap = {
        calendly: 'CALENDLY',
        hubspot: 'HUBSPOT',
        pipedrive: 'PIPEDRIVE',
        salesforce: 'SALESFORCE',
      };
      const toolkit = toolkitMap[integration.integration_type.toLowerCase()] || integration.integration_type.toUpperCase();
      
      // First, try getRawComposioTools to get ALL tools from the toolkit (with pagination)
      const getRawTools = composio.tools.getRawComposioTools || composio.tools['getRawComposioTools'];
      if (getRawTools) {
        try {
          console.log(`Trying getRawComposioTools with pagination...`);
          // Try with toolkit filter and pagination
          try {
            let allTools = [];
            let offset = 0;
            const limit = 50;
            let hasMore = true;
            let page = 1;
            
            while (hasMore) {
              try {
                console.log(`   getRawComposioTools page ${page} (offset: ${offset})...`);
                const pageTools = await getRawTools({
                  filterBy: {
                    toolkits: [toolkit],
                  },
                  limit: limit,
                  offset: offset,
                });
                
                let pageArray = Array.isArray(pageTools) ? pageTools : (pageTools?.data || pageTools?.tools || pageTools?.items || []);
                
                if (pageArray.length > 0) {
                  allTools = [...allTools, ...pageArray];
                  console.log(`   Got ${pageArray.length} tools (total: ${allTools.length})`);
                  
                  if (pageArray.length < limit) {
                    hasMore = false;
                  } else {
                    offset += pageArray.length;
                    page++;
                  }
                } else {
                  hasMore = false;
                }
              } catch (pageErr) {
                // If pagination fails, try without pagination
                if (offset === 0) {
                  console.log(`   Pagination not supported, trying without...`);
                  const allToolsResult = await getRawTools({
                    filterBy: {
                      toolkits: [toolkit],
                    },
                  });
                  allTools = Array.isArray(allToolsResult) ? allToolsResult : (allToolsResult?.data || allToolsResult?.tools || allToolsResult?.items || []);
                  console.log(`   Got ${allTools.length} tools without pagination`);
                } else {
                  console.log(`   Pagination error: ${pageErr.message}`);
                }
                hasMore = false;
              }
            }
            
            tools = allTools;
            console.log(`✓ Got ${allTools.length} total tool(s) using getRawComposioTools`);
          } catch (rawErr) {
            console.log(`getRawComposioTools failed: ${rawErr.message}`);
            throw rawErr;
          }
        } catch (err) {
          console.log(`getRawComposioTools failed: ${err.message}`);
          // Fall back to other methods
          try {
            // Try getting tools for the connection
            tools = await composio.tools.get(integration.connection_id);
            console.log(`Got tools using connection ID`);
          } catch (err2) {
            console.log(`Failed to get tools for connection: ${err2.message}`);
            console.log(`Trying toolkit-based fetch with user email...`);
            
            // Get user email for fallback
            const { data: tenantUser } = await supabase
              .from('tenant_users')
              .select('email')
              .eq('user_id', userId)
              .eq('tenant_id', tenantId)
              .maybeSingle();
            
            const userEmail = tenantUser?.email || userId;
            
            try {
              // Try with user email and toolkit - with pagination to get ALL tools
              console.log(`Fetching tools with pagination to get all tools...`);
              
              let allTools = [];
              let offset = 0;
              const limit = 50; // Try to get more per page
              let hasMore = true;
              let page = 1;
              
              while (hasMore) {
                try {
                  console.log(`   Fetching page ${page} (offset: ${offset})...`);
                  const pageTools = await composio.tools.get(userEmail, {
                    toolkits: [toolkit],
                    limit: limit,
                    offset: offset,
                  });
                  
                  let pageArray = Array.isArray(pageTools) ? pageTools : (pageTools?.data || pageTools?.tools || pageTools?.items || []);
                  
                  if (pageArray.length > 0) {
                    allTools = [...allTools, ...pageArray];
                    console.log(`   Got ${pageArray.length} tools (total so far: ${allTools.length})`);
                    
                    // Check if we got all tools (if response is less than limit, we're done)
                    if (pageArray.length < limit) {
                      hasMore = false;
                      console.log(`   Reached end (got ${pageArray.length} < ${limit})`);
                    } else {
                      offset += pageArray.length;
                      page++;
                    }
                  } else {
                    hasMore = false;
                    console.log(`   No more tools (empty page)`);
                  }
                } catch (pageErr) {
                  // If pagination fails, try without pagination params
                  if (offset === 0) {
                    console.log(`   Pagination params not supported, trying without them...`);
                    const allToolsResult = await composio.tools.get(userEmail, {
                      toolkits: [toolkit],
                    });
                    allTools = Array.isArray(allToolsResult) ? allToolsResult : (allToolsResult?.data || allToolsResult?.tools || allToolsResult?.items || []);
                    console.log(`   Got ${allTools.length} tools without pagination`);
                  } else {
                    console.log(`   Pagination error on page ${page}: ${pageErr.message}`);
                  }
                  hasMore = false;
                }
              }
              
              tools = allTools;
              console.log(`✓ Fetched ${allTools.length} total tool(s) with pagination`);
              
            } catch (err3) {
              console.log(`Failed with user email: ${err3.message}`);
              throw new Error(`All methods failed to fetch tools: ${err3.message}`);
            }
          }
        }
      } else {
        // Fallback if getRawComposioTools doesn't exist
        try {
          tools = await composio.tools.get(integration.connection_id);
          console.log(`Got tools using connection ID`);
        } catch (err) {
          console.log(`Failed to get tools for connection: ${err.message}`);
          throw err;
        }
      }
      
      
      // Extract tools array
      let toolsArray = [];
      if (Array.isArray(tools)) {
        toolsArray = tools;
      } else if (tools && tools.data) {
        toolsArray = tools.data;
      } else if (tools && tools.tools) {
        toolsArray = tools.tools;
      } else if (tools && tools.items) {
        toolsArray = tools.items;
      } else if (tools && typeof tools === 'object') {
        // Check all keys for arrays
        for (const key of Object.keys(tools)) {
          if (Array.isArray(tools[key])) {
            toolsArray = tools[key];
            console.log(`Found tools array in key: ${key}`);
            break;
          }
        }
      }
      
      console.log(`Found ${toolsArray.length} tool(s) from Composio`);
      
      // Check if there's pagination and we need to fetch more
      if (tools && typeof tools === 'object' && tools.hasMore && toolsArray.length > 0) {
        console.log(`⚠️  WARNING: API indicates more results available (hasMore: ${tools.hasMore})`);
        console.log(`   Current count: ${toolsArray.length}, Total: ${tools.total || 'unknown'}`);
      }
      
      // Debug output (can be removed in production)
      if (integration.integration_type.toLowerCase() === 'calendly') {
        const listEventsTool = toolsArray.find(tool => {
          const name = (tool.name || tool.function?.name || '').toUpperCase();
          return name === 'CALENDLY_LIST_EVENTS';
        });
        if (listEventsTool) {
          console.log(`✓ Found CALENDLY_LIST_EVENTS in ${toolsArray.length} tools`);
        }
      }
      
      // Filter allowed tools
      const filtered = toolsArray.filter(tool => {
        const name = tool.name || tool.function?.name || '';
        const allowed = isAllowed(name, integration.integration_type);
        if (allowed) {
          console.log(`  ✓ ${name}`);
        } else {
          console.log(`  ✗ ${name} (not allowed)`);
        }
        return allowed;
      });
      
      console.log(`Filtered to ${filtered.length} allowed tool(s)\n`);
      
      // Create tools in ElevenLabs
      for (const tool of filtered) {
        try {
          const rawName = tool.name || tool.function?.name || 'Unknown';
          const readableName = rawName.includes('_') ? toReadable(rawName) : rawName;
          const elevenLabsName = toElevenLabsName(readableName);
          const nameLower = elevenLabsName.toLowerCase();
          
          // Skip if already processed
          if (processed.has(nameLower)) {
            console.log(`  Skipping ${readableName} (already processed)`);
            continue;
          }
          
          // Check if exists
          const existingId = existingByName.get(nameLower);
          if (existingId) {
            console.log(`  Using existing tool: ${readableName} (${existingId})`);
            toolIds.push(existingId);
            processed.add(nameLower);
            continue;
          }
          
          // Create new tool
          processed.add(nameLower);
          const toolConfig = convertTool(tool, integration.connection_id);
          const result = await createElevenLabsTool(toolConfig);
          
          console.log(`  ✓ Created: ${readableName} -> ${result.tool_id}`);
          toolIds.push(result.tool_id);
        } catch (err) {
          const errorMsg = `Failed to create tool ${tool.name || 'unknown'}: ${err.message}`;
          console.error(`  ✗ ${errorMsg}`);
          errors.push(errorMsg);
        }
      }
    } catch (err) {
      const errorMsg = `Failed to sync ${integration.integration_type}: ${err.message}`;
      console.error(`✗ ${errorMsg}`);
      errors.push(errorMsg);
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Tools synced: ${toolIds.length}`);
  console.log(`Errors: ${errors.length}`);
  if (errors.length > 0) {
    console.log(`\nErrors:`);
    errors.forEach(e => console.log(`  - ${e}`));
  }
  
  return { toolIds, errors };
}

// Helper to list tenants/users
async function listTenants() {
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, slug')
    .limit(10);
  
  if (tenants && tenants.length > 0) {
    console.log('\nAvailable tenants:');
    tenants.forEach(t => {
      console.log(`  ${t.id} - ${t.name} (${t.slug})`);
    });
    
    // Get users for first tenant
    if (tenants.length > 0) {
      const { data: users } = await supabase
        .from('tenant_users')
        .select('user_id, email, tenant_id')
        .eq('tenant_id', tenants[0].id)
        .limit(5);
      
      if (users && users.length > 0) {
        console.log(`\nUsers for ${tenants[0].name}:`);
        users.forEach(u => {
          console.log(`  ${u.user_id} - ${u.email || 'no email'}`);
        });
      }
    }
  }
}

// Main execution
const tenantId = process.argv[2];
const userId = process.argv[3];

if (!tenantId || !userId) {
  console.error('Usage: node scripts/sync-composio-tools.mjs <tenantId> <userId>');
  console.error('\nListing available tenants/users...\n');
  listTenants()
    .then(() => {
      console.error('\nPlease provide tenant_id and user_id as arguments');
      process.exit(1);
    })
    .catch(err => {
      console.error('Error listing tenants:', err);
      process.exit(1);
    });
} else {
  syncTools(tenantId, userId)
    .then(result => {
      console.log('\n✓ Sync complete');
      process.exit(result.errors.length > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('\n✗ Fatal error:', error);
      process.exit(1);
    });
}

