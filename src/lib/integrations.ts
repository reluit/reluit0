import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "./supabase/clients";
import { getCurrentUser } from "./auth";
import { getTenantBySlug } from "./tenants";

export interface TenantIntegration {
  id: string;
  tenant_id: string;
  user_id: string | null;
  integration_type: string;
  auth_config_id: string | null;
  connection_id: string | null;
  api_key_encrypted: string | null;
  credentials: Record<string, any>;
  is_connected: boolean;
  last_sync_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Save integration connection to database
 */
export async function saveIntegrationConnection(
  tenantId: string,
  userId: string,
  integrationType: string,
  connectionId: string,
  authConfigId?: string,
  credentials?: Record<string, any>
): Promise<TenantIntegration> {
  const supabase = createSupabaseServiceRoleClient();

  // Check if connection already exists
  const { data: existing } = await supabase
    .from("tenant_integrations")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("integration_type", integrationType)
    .maybeSingle();

  if (existing) {
    // Update existing connection
    const { data, error } = await supabase
      .from("tenant_integrations")
      .update({
        connection_id: connectionId,
        auth_config_id: authConfigId || existing.auth_config_id,
        credentials: credentials || existing.credentials,
        is_connected: true,
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update integration: ${error.message}`);
    }

    return data as TenantIntegration;
  } else {
    // Create new connection
    const { data, error } = await supabase
      .from("tenant_integrations")
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        integration_type: integrationType,
        connection_id: connectionId,
        auth_config_id: authConfigId,
        credentials: credentials || {},
        is_connected: true,
        last_sync_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save integration: ${error.message}`);
    }

    return data as TenantIntegration;
  }
}

/**
 * Get user's integrations for a tenant
 */
export async function getUserIntegrations(
  tenantId: string,
  userId: string
): Promise<TenantIntegration[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("tenant_integrations")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch integrations: ${error.message}`);
  }

  return (data || []) as TenantIntegration[];
}

/**
 * Get integration by connection ID
 */
export async function getIntegrationByConnectionId(
  connectionId: string
): Promise<TenantIntegration | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("tenant_integrations")
    .select("*")
    .eq("connection_id", connectionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch integration: ${error.message}`);
  }

  return data as TenantIntegration | null;
}

/**
 * Disconnect an integration
 */
export async function disconnectIntegration(
  tenantId: string,
  userId: string,
  integrationType: string
): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("tenant_integrations")
    .update({
      is_connected: false,
      connection_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("integration_type", integrationType);

  if (error) {
    throw new Error(`Failed to disconnect integration: ${error.message}`);
  }
}

