import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "./supabase/clients";
import type { Tenant } from "./tenants";

export interface TenantUser {
  id: string;
  tenant_id: string;
  user_id: string;
  role: string;
  claimed_at: string;
  created_at: string;
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Check if the current user has access to a specific tenant
 */
export async function getUserTenantAccess(tenantId: string): Promise<TenantUser | null> {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tenant_users")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as TenantUser;
}

/**
 * Check if a tenant has been claimed (has any users)
 */
export async function isTenantClaimed(tenantId: string): Promise<boolean> {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("tenant_users")
    .select("id")
    .eq("tenant_id", tenantId)
    .limit(1)
    .maybeSingle();

  return !error && data !== null;
}

/**
 * Claim a tenant for the current user
 */
export async function claimTenant(tenantId: string, userId: string): Promise<TenantUser> {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("tenant_users")
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      role: "owner",
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to claim tenant");
  }

  return data as TenantUser;
}

/**
 * Sign up a new user and claim a tenant
 */
export async function signUpAndClaimTenant(
  email: string,
  password: string,
  tenantId: string
): Promise<{ user: any; tenantUser: TenantUser }> {
  const supabase = await createSupabaseServerClient();
  
  // Sign up the user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError || !authData.user) {
    throw new Error(authError?.message ?? "Failed to create account");
  }

  // Claim the tenant using service role client
  const tenantUser = await claimTenant(tenantId, authData.user.id);

  return {
    user: authData.user,
    tenantUser,
  };
}

/**
 * Sign in an existing user
 */
export async function signIn(email: string, password: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}

