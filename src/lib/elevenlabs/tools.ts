import { ELEVENLABS_API_KEY } from "./client";
import { getComposioClient } from "@/lib/composio";
import { getUserIntegrations } from "@/lib/integrations";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/clients";

/**
 * Convert Composio tool name format to human-readable format
 * Examples:
 * - "CALENDLY_CANCEL_EVENT" -> "Cancel event"
 * - "HUBSPOT_CREATE_CONTACT" -> "Create contact"
 * - "SALESFORCE_GET_ACCOUNT" -> "Get account"
 */
function convertComposioToolNameToReadable(composioName: string): string {
  // Remove integration prefix (e.g., "CALENDLY_", "HUBSPOT_", etc.)
  const withoutPrefix = composioName.replace(/^[A-Z]+_/, '');
  
  // Convert SNAKE_CASE to readable format
  const words = withoutPrefix.split('_').map((word, index) => {
    const upperWord = word.toUpperCase();
    
    // Handle special cases - action words are capitalized
    if (upperWord === 'CANCEL') return 'Cancel';
    if (upperWord === 'CREATE') return 'Create';
    if (upperWord === 'GET') return 'Get';
    if (upperWord === 'LIST') return 'List';
    if (upperWord === 'ADD') return 'Add';
    if (upperWord === 'UPDATE') return 'Update';
    if (upperWord === 'DELETE') return 'Delete';
    if (upperWord === 'SEARCH') return 'Search';
    
    // Handle special nouns - some are lowercase, some capitalized
    if (upperWord === 'EVENT' && index > 0) return 'event';  // lowercase if not first word
    if (upperWord === 'EVENTS') return 'events';
    if (upperWord === 'USER' && index > 0) return 'user';  // lowercase if not first word
    if (upperWord === 'CURRENT') return 'Current';  // Keep "Current" capitalized
    if (upperWord === 'INVITEE') return 'Invitee';  // Keep "Invitee" capitalized (singular)
    if (upperWord === 'INVITEES') return 'invitees';  // Plural is lowercase
    if (upperWord === 'TYPE') return 'Type';
    if (upperWord === 'ID' || upperWord === 'IDS') return word;
    if (upperWord === 'CRM') return word;
    if (upperWord === 'UID') return 'uid';
    if (upperWord === 'NO') return 'No';
    if (upperWord === 'SHOW') return 'Show';
    if (upperWord === 'ONE') return 'One';
    if (upperWord === 'OFF') return 'Off';
    
    // Default: capitalize first letter, lowercase rest
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
  
  // Join words and handle special cases like "One Off" -> "One-Off"
  let result = words.join(' ');
  
  // Handle "One Off" -> "One-Off" for Calendly
  result = result.replace(/\bOne Off\b/gi, 'One-Off');
  
  return result;
}

/**
 * Convert tool name to ElevenLabs-compatible format (alphanumeric, underscores, hyphens only)
 * Examples:
 * - "Cancel Event" -> "Cancel_Event"
 * - "Get Event" -> "Get_Event"
 * - "Create One-Off Event Type" -> "Create_One_Off_Event_Type"
 */
function convertToElevenLabsToolName(name: string): string {
  // Replace spaces with underscores, remove any invalid characters
  return name
    .replace(/\s+/g, '_')  // Replace spaces with underscores
    .replace(/[^a-zA-Z0-9_-]/g, '')  // Remove any invalid characters
    .substring(0, 64);  // Limit to 64 characters
}

/**
 * Convert Composio tool to ElevenLabs webhook tool format
 */
function convertComposioToolToElevenLabs(
  composioTool: any,
  connectionId: string
): any {
  // Extract tool information
  const rawToolName = composioTool.name || composioTool.function?.name || "Unknown Tool";
  // Store the original Composio tool name (needed for execution)
  const composioToolName = rawToolName; // e.g., "CALENDLY_GET_USER"
  // Convert Composio format to readable format for display
  const readableName = rawToolName.includes('_') 
    ? convertComposioToolNameToReadable(rawToolName)
    : rawToolName;
  // Convert to ElevenLabs-compatible format (no spaces, only alphanumeric, underscores, hyphens)
  const toolName = convertToElevenLabsToolName(readableName); // e.g., "Get_user"
  const toolDescription = composioTool.description || composioTool.function?.description || "";
  
  // Get parameters schema from Composio tool
  const parameters = composioTool.parameters || composioTool.function?.parameters || {};
  
  // Convert JSON schema to ElevenLabs format
  const convertJsonSchema = (schema: any): any => {
    if (!schema || typeof schema !== "object") {
      return { type: "object", properties: {}, required: [] };
    }

    if (schema.type === "object") {
      const properties: Record<string, any> = {};
      const required: string[] = [];

      if (schema.properties) {
        for (const [key, prop] of Object.entries(schema.properties as Record<string, any>)) {
          properties[key] = convertJsonSchemaProperty(prop);
          if (schema.required?.includes(key)) {
            required.push(key);
          }
        }
      }

      return {
        type: "object",
        properties,
        required,
        description: schema.description || "",
      };
    }

    return { type: "object", properties: {}, required: [] };
  };

  const convertJsonSchemaProperty = (prop: any): any => {
    if (!prop || typeof prop !== "object") {
      return { type: "string", description: "Parameter value" };
    }

    if (prop.type === "array") {
      const items = prop.items ? convertJsonSchemaProperty(prop.items) : { type: "string", description: "Array item" };
      return {
        type: "array",
        description: prop.description || "Array parameter",
        items: items,
      };
    }

    if (prop.type === "object") {
      return convertJsonSchema(prop);
    }

    // Handle literal types
    // Ensure description is always set (required by ElevenLabs)
    const description = prop.description || (prop.type === "integer" ? "Integer value" : prop.type === "number" ? "Number value" : prop.type === "boolean" ? "Boolean value" : "String value");
    
    const result: any = {
      type: prop.type || "string",
      description: description,
    };
    
    // Only add enum if it exists
    if (prop.enum && Array.isArray(prop.enum)) {
      result.enum = prop.enum;
    }
    
    return result;
  };

  // Build the webhook URL - Use the actual site URL from environment
  // Fallback to localhost for development, or construct from ROOT_DOMAIN
  // IMPORTANT: Use www.reluit.com to avoid 307 redirects (Vercel redirects reluit.com -> www.reluit.com)
  const getSiteUrl = () => {
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      // Ensure we use www. prefix if it's reluit.com to avoid redirects
      const url = process.env.NEXT_PUBLIC_SITE_URL;
      if (url.includes('reluit.com') && !url.includes('www.')) {
        return url.replace('reluit.com', 'www.reluit.com');
      }
      return url;
    }
    // Fallback: construct from ROOT_DOMAIN if available, use www. prefix
    const rootDomain = process.env.ROOT_DOMAIN || "reluit.com";
    // Always use www. prefix for reluit.com to avoid 307 redirects
    const domain = rootDomain === "reluit.com" ? "www.reluit.com" : rootDomain;
    return `https://${domain}`;
  };
  const webhookUrl = `${getSiteUrl()}/api/composio/execute`;
  
  // Build request body schema from parameters
  const parametersSchema = convertJsonSchema(parameters);

  // Create ElevenLabs webhook tool config
  // Use constant_value for connectionId and toolName since they're known at creation time
  return {
    tool_config: {
      type: "webhook",
      name: toolName,
      description: toolDescription,
      api_schema: {
        url: webhookUrl,
        method: "POST",
        path_params_schema: {},
        query_params_schema: null,
        request_body_schema: {
          type: "object",
          properties: {
            connectionId: {
              type: "string",
              constant_value: connectionId,
            },
            toolName: {
              type: "string",
              constant_value: composioToolName, // Use original Composio format (e.g., "CALENDLY_GET_USER")
            },
            parameters: parametersSchema,
          },
          required: ["parameters"],
        },
        request_headers: {
          "Content-Type": "application/json",
        },
        content_type: "application/json",
        auth_connection: null,
      },
      response_timeout_secs: 30,
      disable_interruptions: false,
      force_pre_tool_speech: false,
      assignments: [],
      tool_call_sound: null,
      tool_call_sound_behavior: "auto",
      dynamic_variables: {},
      execution_mode: "immediate",
    },
  };
}

/**
 * List all existing tools in ElevenLabs
 */
export async function listElevenLabsTools(): Promise<Array<{ id: string; name: string; description?: string }>> {
  try {
    const response = await fetch("https://api.elevenlabs.io/v1/convai/tools", {
      method: "GET",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      console.error("Failed to list ElevenLabs tools");
      return [];
    }

    const data = await response.json();
    // Handle different response formats
    if (Array.isArray(data)) {
      return data.map((tool: any) => ({
        id: tool.id,
        name: tool.tool_config?.name || tool.name || "",
        description: tool.tool_config?.description || tool.description || "",
      }));
    } else if (data.tools && Array.isArray(data.tools)) {
      return data.tools.map((tool: any) => ({
        id: tool.id,
        name: tool.tool_config?.name || tool.name || "",
        description: tool.tool_config?.description || tool.description || "",
      }));
    }
    
    return [];
  } catch (error) {
    console.error("Error listing ElevenLabs tools:", error);
    return [];
  }
}

/**
 * Get tool details by ID from ElevenLabs
 */
export async function getElevenLabsTool(toolId: string): Promise<{ id: string; name: string; description?: string } | null> {
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/convai/tools/${toolId}`, {
      method: "GET",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      return null;
    }

    const tool = await response.json();
    return {
      id: tool.id,
      name: tool.tool_config?.name || tool.name || "",
      description: tool.tool_config?.description || tool.description || "",
    };
  } catch (error) {
    console.error("Error fetching tool details:", error);
    return null;
  }
}

/**
 * Create a tool in ElevenLabs
 */
export async function createElevenLabsTool(toolConfig: any): Promise<{ toolId: string }> {
  const response = await fetch("https://api.elevenlabs.io/v1/convai/tools", {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(toolConfig),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("ElevenLabs tool creation error:", errorText);
    throw new Error(`Failed to create tool in ElevenLabs: ${errorText}`);
  }

  const data = await response.json();
  return { toolId: data.id };
}

/**
 * Allowed tools for each integration (whitelist)
 */
const ALLOWED_TOOLS: Record<string, string[]> = {
  hubspot: [
    "Create contact",
    "Create ticket",
    "Create tickets",
    "Get contact IDs",
    "Get ticket",
    "Get tickets",
    "List contacts",
    "Merge contacts",
    "Partially update CRM object by ID",
    "Read a page of objects by type",
    "Read contact",
    "Read contacts",
    "Read crm object by id",
    "Search contacts by criteria",
    "Update contact",
    "Update ticket",
    "Update tickets",
  ],
  salesforce: [
    "Add contact to campaign",
    "Add lead to campaign",
    "Complete task",
    "Create account",
    "Create campaign",
    "Create contact",
    "Create lead",
    "Create note",
    "Create opportunity",
    "Create task",
    "Delete account",
    "Delete contact",
    "Delete lead",
    "Get account",
    "Get contact",
    "Get lead",
    "Get opportunity",
    "Get user info",
    "List accounts",
    "List contacts",
    "List leads",
    "List opportunities",
    "List pricebook entries",
    "List pricebooks",
    "Retrieve lead by id",
    "Retrieve opportunities data",
    "Retrieve specific contact by id",
    "Search accounts",
    "Search campaigns",
    "Search contacts",
    "Search leads",
    "Search notes",
    "Search opportunities",
    "Search tasks",
    "Update account",
    "Update contact",
    "Update lead",
    "Update opportunity",
  ],
  pipedrive: [
    "Add a call log",
    "Add a deal",
    "Add a lead",
    "Add an activity",
    "Add a note",
    "Add a person",
    "Add a product",
    "Add a task",
    "Find users by name",
    "Get all call logs assigned to a particular user",
    "Get all leads",
    "Get all persons",
    "Get all products",
    "Get all tasks",
    "Get details of a call log",
    "Get one lead",
    "Search leads",
    "Search persons",
    "Search products",
    "Update a deal",
    "Update a person",
  ],
  cal: [
    "Cancel booking via uid",
    "Check calendar availability",
    "Confirm booking by uid",
    "Create phone call event",
    "Decline booking with reason",
    "Delete event type by id",
    "Delete selected slot",
    "Fetch all bookings",
    "Get available slots info",
    "Post a new booking request",
    "Reschedule booking by uid",
    "Retrieve calendar list",
  ],
  calendly: [
    // Get user — fetch the user's UUID/URI to scope other calls
    "Get user",
    "Get User",
    "GET_USER",
    "CALENDLY_GET_USER",
    
    // Get current user — confirm authenticated context and IDs
    "Get current user",
    "Get Current user",
    "Get Current User",
    "GET_CURRENT_USER",
    "CALENDLY_GET_CURRENT_USER",
    
    // List user event types — enumerate meeting types the agent can book
    "List user event types",
    "List User Event Types",
    "LIST_USER_EVENT_TYPES",
    "CALENDLY_LIST_USER_EVENT_TYPES",
    "List event types",
    "List Event Types",
    "LIST_EVENT_TYPES",
    "CALENDLY_LIST_EVENT_TYPES",
    
    // List user availability schedules — read default availability windows
    "List user availability schedules",
    "List User Availability Schedules",
    "LIST_USER_AVAILABILITY_SCHEDULES",
    "CALENDLY_LIST_USER_AVAILABILITY_SCHEDULES",
    "List availability schedules",
    "List Availability Schedules",
    "LIST_AVAILABILITY_SCHEDULES",
    "CALENDLY_LIST_AVAILABILITY_SCHEDULES",
    "Get user availability schedule",
    "Get User Availability Schedule",
    "GET_USER_AVAILABILITY_SCHEDULE",
    "CALENDLY_GET_USER_AVAILABILITY_SCHEDULE",
    
    // List user busy times — check real‑time free/busy for the next 7 days
    "List user busy times",
    "List User Busy Times",
    "LIST_USER_BUSY_TIMES",
    "CALENDLY_LIST_USER_BUSY_TIMES",
    "List busy times",
    "List Busy Times",
    "LIST_BUSY_TIMES",
    "CALENDLY_LIST_BUSY_TIMES",
    
    // Create single use scheduling link — generate a one‑time booking link
    "Create single use scheduling link",
    "Create Single Use Scheduling Link",
    "CREATE_SINGLE_USE_SCHEDULING_LINK",
    "CALENDLY_CREATE_SINGLE_USE_SCHEDULING_LINK",
    "Create single-use scheduling link",
    "Create Single-Use Scheduling Link",
    "CREATE_SINGLE_USE_SCHEDULING_LINK",
    
    // Create scheduling link — make a reusable link with a max bookings limit
    "Create scheduling link",
    "Create Scheduling Link",
    "CREATE_SCHEDULING_LINK",
    "CALENDLY_CREATE_SCHEDULING_LINK",
    
    // List event type hosts — pick the correct host when multiple users share an event type
    "List event type hosts",
    "List Event Type Hosts",
    "LIST_EVENT_TYPE_HOSTS",
    "CALENDLY_LIST_EVENT_TYPE_HOSTS",
    "Get event type hosts",
    "Get Event Type Hosts",
    "GET_EVENT_TYPE_HOSTS",
    "CALENDLY_GET_EVENT_TYPE_HOSTS",
    
    // List events — verify bookings or show upcoming meetings
    "List events",
    "List Events",
    "LIST_EVENTS",
    "CALENDLY_LIST_EVENTS",
    "Get events",
    "Get Events",
    "GET_EVENTS",
    "CALENDLY_GET_EVENTS",
    "Fetch events",
    "Fetch Events",
    "FETCH_EVENTS",
    "CALENDLY_FETCH_EVENTS",
    
    // Get event — retrieve details for a specific booked event
    "Get event",
    "Get Event",
    "GET_EVENT",
    "CALENDLY_GET_EVENT",
    
    // List webhook subscriptions — optional, mirror bookings to your system
    "List webhook subscriptions",
    "List Webhook Subscriptions",
    "LIST_WEBHOOK_SUBSCRIPTIONS",
    "CALENDLY_LIST_WEBHOOK_SUBSCRIPTIONS",
    "Get webhook subscriptions",
    "Get Webhook Subscriptions",
    "GET_WEBHOOK_SUBSCRIPTIONS",
    "CALENDLY_GET_WEBHOOK_SUBSCRIPTIONS",
    
    // List routing forms — optional, ask pre‑screen questions on the call
    "List routing forms",
    "List Routing Forms",
    "LIST_ROUTING_FORMS",
    "CALENDLY_LIST_ROUTING_FORMS",
    "Get routing forms",
    "Get Routing Forms",
    "GET_ROUTING_FORMS",
    "CALENDLY_GET_ROUTING_FORMS",
  ],
};

/**
 * Normalize tool name for comparison (case-insensitive, trim whitespace)
 */
function normalizeToolName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Normalize tool name for flexible matching (handles hyphens, underscores, case, etc.)
 */
function normalizeForMatching(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ')        // Normalize underscores to spaces
    .replace(/\s*-\s*/g, ' ')  // Normalize hyphens to spaces
    .replace(/\s+/g, ' ');     // Normalize multiple spaces
}

/**
 * Check if a tool is allowed for the given integration
 */
function isToolAllowed(toolName: string, integrationType: string): boolean {
  const normalizedIntegrationType = integrationType.toLowerCase();
  const allowedTools = ALLOWED_TOOLS[normalizedIntegrationType];
  
  if (!allowedTools) {
    // If integration not in whitelist, allow all tools (backward compatibility)
    console.warn(`No whitelist found for integration: ${integrationType}, allowing all tools`);
    return true;
  }
  
  // Normalize the input tool name (with prefix if present)
  const normalizedToolName = normalizeForMatching(toolName);
  console.log(`    [isToolAllowed] Input: "${toolName}" -> normalized: "${normalizedToolName}"`);
  
  // Try direct match first (normalized, with or without prefix)
  let isAllowed = false;
  let matchedEntry = '';
  
  for (const allowed of allowedTools) {
    const normalizedAllowed = normalizeForMatching(allowed);
    if (normalizedAllowed === normalizedToolName) {
      isAllowed = true;
      matchedEntry = allowed;
      break;
    }
  }
  
  // If no direct match, try converting Composio format to readable format (removes prefix)
  if (!isAllowed) {
    const readableName = convertComposioToolNameToReadable(toolName);
    const normalizedReadable = normalizeForMatching(readableName);
    console.log(`    [isToolAllowed] Converted to readable: "${readableName}" -> normalized: "${normalizedReadable}"`);
    
    // Try matching the readable version
    for (const allowed of allowedTools) {
      const normalizedAllowed = normalizeForMatching(allowed);
      // Match if normalized versions are equal (handles prefix differences)
      if (normalizedAllowed === normalizedReadable) {
        isAllowed = true;
        matchedEntry = allowed;
        break;
      }
      // Also try matching after removing integration prefix from whitelist entry
      const allowedWithoutPrefix = allowed.replace(/^[A-Z]+[\s_]+/i, '');
      const normalizedAllowedWithoutPrefix = normalizeForMatching(allowedWithoutPrefix);
      if (normalizedAllowedWithoutPrefix === normalizedReadable) {
        isAllowed = true;
        matchedEntry = allowed;
        break;
      }
    }
    
    // Special case matching: "Get Current user" should match "Get user"
    if (!isAllowed && normalizedReadable.includes('get current user')) {
      for (const allowed of allowedTools) {
        const normalizedAllowed = normalizeForMatching(allowed);
        if (normalizedAllowed === 'get user' || normalizedAllowed.includes('get user')) {
          isAllowed = true;
          matchedEntry = allowed;
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
          matchedEntry = allowed;
          break;
        }
      }
    }
    
    // Special case matching: "List events" - be very flexible, match any tool that could list events
    // Check if whitelist has "List events" and tool name suggests listing/listing events
    if (!isAllowed) {
      const hasListEventsInWhitelist = allowedTools.some(a => 
        normalizeForMatching(a).includes('list events')
      );
      
      if (hasListEventsInWhitelist) {
        const upperToolName = toolName.toUpperCase();
        const normalizedReadable = normalizeForMatching(convertComposioToolNameToReadable(toolName));
        
        // Match if tool name contains LIST/GET/FETCH and EVENT(S) - very flexible
        // Also check for SCHEDULED_EVENT which might be the "list events" endpoint
        const couldBeListEvents = (
          (upperToolName.includes('LIST') || upperToolName.includes('GET') || upperToolName.includes('FETCH')) &&
          (upperToolName.includes('EVENT') || upperToolName.includes('EVENTS') || upperToolName.includes('SCHEDULED')) &&
          !upperToolName.includes('EVENT_TYPE') && // Exclude event types
          !upperToolName.includes('EVENT_INVITEE') && // Exclude event invitees
          !upperToolName.includes('CANCEL') && // Exclude cancel
          !upperToolName.includes('CREATE') && // Exclude create
          !upperToolName.includes('DELETE') && // Exclude delete
          !upperToolName.includes('UPDATE') && // Exclude update
          !upperToolName.includes('CURRENT_USER') && // Exclude get current user
          !upperToolName.includes('GROUP') && // Exclude groups
          !upperToolName.includes('ORGANIZATION') && // Exclude organization
          !upperToolName.includes('INVITEE_NO_SHOW') && // Exclude invitee no show
          !upperToolName.includes('WEBHOOK') && // Exclude webhooks
          !upperToolName.includes('SHARE') && // Exclude shares
          !upperToolName.includes('SCHEDULING_LINK') // Exclude scheduling links
        ) || (
          normalizedReadable.includes('list') && 
          (normalizedReadable.includes('event') || normalizedReadable.includes('events') || normalizedReadable.includes('scheduled')) &&
          !normalizedReadable.includes('type') &&
          !normalizedReadable.includes('invitee') &&
          !normalizedReadable.includes('current user') &&
          !normalizedReadable.includes('group') &&
          !normalizedReadable.includes('organization')
        );
        
        if (couldBeListEvents) {
          for (const allowed of allowedTools) {
            const normalizedAllowed = normalizeForMatching(allowed);
            if (normalizedAllowed.includes('list events')) {
              isAllowed = true;
              matchedEntry = allowed;
              console.log(`    [isToolAllowed] ✓ Special match: "${toolName}" matches "List events" requirement`);
              break;
            }
          }
        }
        
      }
    }
    
    if (isAllowed) {
      console.log(`    [isToolAllowed] ✓ Matched "${toolName}" -> "${readableName}" against whitelist entry "${matchedEntry}"`);
    } else {
      console.log(`    [isToolAllowed] ✗ No match found for "${toolName}" (readable: "${readableName}")`);
      console.log(`    [isToolAllowed] Normalized values: tool="${normalizedReadable}", checking against ${allowedTools.length} whitelist entries`);
      // Show a few normalized whitelist entries for comparison
      const sampleNormalized = allowedTools.slice(0, 5).map(a => normalizeForMatching(a));
      console.log(`    [isToolAllowed] Sample normalized whitelist: ${sampleNormalized.join(', ')}`);
    }
  } else {
    console.log(`    [isToolAllowed] ✓ Direct match for "${toolName}" against "${matchedEntry}"`);
  }
  
  return isAllowed;
}

/**
 * Get all tools from user's connected Composio apps and create them in ElevenLabs
 */
export async function syncComposioToolsToElevenLabs(
  tenantId: string,
  userId: string
): Promise<{ toolIds: string[]; errors: string[] }> {
  const toolIds: string[] = [];
  const errors: string[] = [];
  const processedToolNames = new Set<string>(); // Track tools we've already processed

  try {
    // First, get all existing tools from ElevenLabs to avoid duplicates
    console.log("Fetching existing ElevenLabs tools to check for duplicates...");
    const existingTools = await listElevenLabsTools();
    // Create a map of tool name (lowercase, ElevenLabs format) to tool ID for quick lookup
    const existingToolsByName = new Map<string, string>();
    existingTools.forEach(tool => {
      if (tool.name) {
        // Tool names in ElevenLabs are already in the correct format (no spaces)
        existingToolsByName.set(tool.name.toLowerCase(), tool.id);
      }
    });
    console.log(`Found ${existingTools.length} existing tool(s) in ElevenLabs`);
    // Get user's connected integrations
    const supabase = createSupabaseServiceRoleClient();
    const { data: integrations, error: intError } = await supabase
      .from("tenant_integrations")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .eq("is_connected", true)
      .not("connection_id", "is", null);

    if (intError) {
      console.error("Error fetching integrations:", intError);
      return { toolIds: [], errors: [`Failed to fetch integrations: ${intError.message}`] };
    }

    const connectedIntegrations = (integrations || []) as any[];

    if (connectedIntegrations.length === 0) {
      console.log("No connected integrations found for user");
      return { toolIds: [], errors: [] };
    }

    console.log(`Found ${connectedIntegrations.length} connected integration(s)`);

    const composio = getComposioClient();

    // Get email from tenant_users table
    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("email")
      .eq("user_id", userId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    const userEmail = tenantUser?.email || userId;
    console.log(`Using user email for Composio: ${userEmail}`);

    // For each connected integration, get tools and create them in ElevenLabs
    for (const integration of connectedIntegrations) {
      try {
        if (!integration.connection_id) {
          console.log(`Skipping integration ${integration.integration_type} - no connection_id`);
          continue;
        }

        console.log(`Fetching tools for integration: ${integration.integration_type}, connection: ${integration.connection_id}`);

        // Map integration type to toolkit name
        // Some integrations might have different toolkit names
        const toolkitMap: Record<string, string> = {
          calendly: "CALENDLY",
          cal: "CAL",
          hubspot: "HUBSPOT",
          pipedrive: "PIPEDRIVE",
          salesforce: "SALESFORCE",
        };
        
        const toolkitName = toolkitMap[integration.integration_type.toLowerCase()] || integration.integration_type.toUpperCase();
        console.log(`Mapped toolkit name: ${toolkitName} (from integration type: ${integration.integration_type})`);
        
        // Fetch all tools with pagination to get complete list
        let toolsArray: any[] = [];
        try {
          console.log(`Fetching tools with pagination...`);
          
          // Use pagination to get all tools (not just first 20)
          const limit = 50;
          let offset = 0;
          let hasMore = true;
          
          while (hasMore) {
            // Use type assertion - API supports pagination but types don't reflect it
            const pageTools = await composio.tools.get(userEmail, {
              toolkits: [toolkitName],
              limit: limit,
              offset: offset,
            } as any);
            
            // Extract tools from response
            let pageArray: any[] = [];
            if (Array.isArray(pageTools)) {
              pageArray = pageTools;
            } else if (pageTools && typeof pageTools === "object") {
              pageArray = (pageTools as any).data || (pageTools as any).tools || (pageTools as any).items || [];
            }
            
            if (pageArray.length > 0) {
              toolsArray = [...toolsArray, ...pageArray];
              console.log(`  Fetched ${pageArray.length} tools (total: ${toolsArray.length})`);
              
              // If we got fewer than limit, we're done
              if (pageArray.length < limit) {
                hasMore = false;
              } else {
                offset += pageArray.length;
              }
            } else {
              hasMore = false;
            }
          }
          
          console.log(`Fetched ${toolsArray.length} total tool(s) for ${integration.integration_type}`);
        } catch (error: any) {
          console.error(`Failed to fetch tools: ${error.message}`);
          errors.push(`Failed to fetch tools for ${integration.integration_type}: ${error.message}`);
          continue;
        }

        console.log(`Processing ${toolsArray.length} tool(s) for ${integration.integration_type}`);

        if (toolsArray.length === 0) {
          console.warn(`No tools found for integration ${integration.integration_type}`);
          errors.push(`No tools found for ${integration.integration_type}`);
          continue;
        }

        // Filter tools based on whitelist
        const integrationType = integration.integration_type.toLowerCase();
        const filteredTools = toolsArray.filter((composioTool) => {
          const toolName = composioTool.name || composioTool.function?.name || "";
          return isToolAllowed(toolName, integrationType);
        });

        console.log(`Filtered to ${filteredTools.length} allowed tool(s) (from ${toolsArray.length} total)`);

        if (filteredTools.length === 0) {
          console.warn(`No allowed tools found for integration ${integration.integration_type} after filtering`);
          continue;
        }

        // Convert and create each tool (with deduplication)
        for (const composioTool of filteredTools) {
          try {
            const rawToolName = composioTool.name || composioTool.function?.name || "Unknown Tool";
            const readableName = rawToolName.includes('_') 
              ? convertComposioToolNameToReadable(rawToolName)
              : rawToolName;
            const elevenLabsToolName = convertToElevenLabsToolName(readableName);
            const toolNameLower = elevenLabsToolName.toLowerCase();
            
            // Skip if already processed in this sync
            if (processedToolNames.has(toolNameLower)) {
              console.log(`Skipping duplicate: ${readableName} (already processed)`);
              continue;
            }
            
            // Check if tool already exists in ElevenLabs
            const existingToolId = existingToolsByName.get(toolNameLower);
            if (existingToolId) {
              console.log(`Using existing tool: ${readableName} (${existingToolId})`);
              toolIds.push(existingToolId);
              processedToolNames.add(toolNameLower);
              continue;
            }
            
            // Create new tool
            processedToolNames.add(toolNameLower);
            const elevenLabsToolConfig = convertComposioToolToElevenLabs(
              composioTool,
              integration.connection_id
            );
            const result = await createElevenLabsTool(elevenLabsToolConfig);
            toolIds.push(result.toolId);
            console.log(`Created tool: ${readableName} (${result.toolId})`);
          } catch (toolError: any) {
            const errorMsg = `Failed to create tool ${composioTool.name || "unknown"}: ${toolError.message}`;
            console.error(errorMsg);
            errors.push(errorMsg);
          }
        }
      } catch (integrationError: any) {
        const errorMsg = `Failed to sync tools for ${integration.integration_type}: ${integrationError.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    return { toolIds, errors };
  } catch (error: any) {
    console.error("Error syncing Composio tools:", error);
    throw error;
  }
}

