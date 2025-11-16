// Minimal Composio SDK integration
import { Composio, AuthScheme } from '@composio/core';

export interface IntegrationConfig {
  id: string;
  name: string;
  authConfigId: string; // The actual auth config ID from Composio dashboard
  authType: "oauth2" | "api_key";
}

// Integration configurations - UPDATE THESE WITH YOUR ACTUAL AUTH CONFIG IDS
export const INTEGRATION_CONFIGS: Record<string, IntegrationConfig> = {
  calendly: {
    id: "calendly",
    name: "Calendly",
    authConfigId: process.env.NEXT_PUBLIC_CALENDLY_AUTH_CONFIG_ID || "",
    authType: "oauth2",
  },
  cal: {
    id: "cal",
    name: "Cal.com",
    authConfigId: process.env.NEXT_PUBLIC_CAL_AUTH_CONFIG_ID || "",
    authType: "api_key",
  },
  hubspot: {
    id: "hubspot",
    name: "HubSpot",
    authConfigId: process.env.NEXT_PUBLIC_HUBSPOT_AUTH_CONFIG_ID || "",
    authType: "oauth2",
  },
  pipedrive: {
    id: "pipedrive",
    name: "Pipedrive",
    authConfigId: process.env.NEXT_PUBLIC_PIPEDRIVE_AUTH_CONFIG_ID || "",
    authType: "oauth2",
  },
  salesforce: {
    id: "salesforce",
    name: "Salesforce",
    authConfigId: process.env.NEXT_PUBLIC_SALESFORCE_AUTH_CONFIG_ID || "",
    authType: "oauth2",
  },
};

/**
 * Get Composio client instance
 */
export function getComposioClient(): Composio {
  const apiKey = process.env.NEXT_PUBLIC_COMPOSIO_API_KEY || process.env.COMPOSIO_API_KEY;

  if (!apiKey) {
    throw new Error('Composio API key not configured');
  }

  return new Composio({ apiKey });
}

/**
 * Connect integration with API key (server-side only)
 */
export async function connectIntegrationWithApiKey(
  userId: string,
  authConfigId: string,
  apiKey: string
): Promise<{ connectionId: string; status: string }> {
  const composio = getComposioClient();

  const connectionRequest = await composio.connectedAccounts.initiate(
    userId,
    authConfigId,
    {
      config: AuthScheme.APIKey({
        api_key: apiKey
      })
    }
  );

  return {
    connectionId: connectionRequest.id || '',
    status: connectionRequest.status || 'unknown',
  };
}

/**
 * Initiate OAuth connection (server-side only)
 */
export async function initiateOAuthConnection(
  userId: string,
  authConfigId: string,
  callbackUrl?: string
): Promise<{ connectionId: string; redirectUrl: string }> {
  const composio = getComposioClient();

  const connectionRequest = await composio.connectedAccounts.initiate(
    userId,
    authConfigId,
    {
      callbackUrl,
    }
  );

  if (!connectionRequest.redirectUrl) {
    throw new Error('No redirect URL received from Composio');
  }

  return {
    connectionId: connectionRequest.id,
    redirectUrl: connectionRequest.redirectUrl,
  };
}

/**
 * Get connected account details
 */
export async function getConnectedAccount(connectionId: string) {
  const composio = getComposioClient();
  return await composio.connectedAccounts.get(connectionId);
}

/**
 * Get tools from a specific toolkit
 */
export async function getToolsForToolkit(toolkitName: string) {
  const composio = getComposioClient();
  try {
    const tools = await (composio as any).tools.getRawComposioTools({
      filterBy: {
        toolkits: [toolkitName.toUpperCase()]
      }
    });
    return tools;
  } catch (error: any) {
    console.error('Failed to fetch tools for toolkit:', toolkitName, error);
    throw error;
  }
}

/**
 * Get all available tools (across all toolkits)
 */
export async function getAllTools() {
  const composio = getComposioClient();
  try {
    const tools = await (composio as any).tools.getRawComposioTools();
    return tools;
  } catch (error: any) {
    console.error('Failed to fetch all tools:', error);
    throw error;
  }
}

/**
 * Get tools for a connected account
 */
export async function getToolsForConnection(connectionId: string) {
  const composio = getComposioClient();
  try {
    const connectedAccount = await composio.connectedAccounts.get(connectionId);
    // Get tools associated with this connection
    const tools = await (composio as any).tools.get(connectionId);
    return tools;
  } catch (error: any) {
    console.error('Failed to fetch tools for connected account:', error);
    throw error;
  }
}
