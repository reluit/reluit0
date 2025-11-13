import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "./supabase/clients";
import type { Tenant } from "./tenants";

export interface TenantUser {
  id: string;
  tenant_id: string;
  user_id: string;
  email: string | null;
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
export async function claimTenant(tenantId: string, userId: string, email: string): Promise<TenantUser> {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("tenant_users")
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      email: email,
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
  
  // Sign up the user with email confirmation redirect
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://reluit.com"}/auth/confirm`,
    },
  });

  if (authError || !authData.user) {
    throw new Error(authError?.message ?? "Failed to create account");
  }

  // Claim the tenant using service role client (store email for password-only login)
  const tenantUser = await claimTenant(tenantId, authData.user.id, email);

  return {
    user: authData.user,
    tenantUser,
  };
}

/**
 * Get the email of the tenant owner
 */
export async function getTenantOwnerEmail(tenantId: string): Promise<string | null> {
  const supabase = createSupabaseServiceRoleClient();
  
  // Get the first user (owner) for this tenant with email
  const { data, error } = await supabase
    .from("tenant_users")
    .select("email")
    .eq("tenant_id", tenantId)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();

  if (error || !data || !data.email) {
    return null;
  }

  return data.email;
}

/**
 * Sign in an existing user by tenant ID and password
 */
export async function signInByTenant(tenantId: string, password: string) {
  const supabase = createSupabaseServiceRoleClient();
  
  // Get tenant user email
  const { data: tenantUser, error: tenantError } = await supabase
    .from("tenant_users")
    .select("email")
    .eq("tenant_id", tenantId)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();

  if (tenantError || !tenantUser || !tenantUser.email) {
    throw new Error("Tenant not found or not claimed");
  }

  // Sign in with email and password
  const client = await createSupabaseServerClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: tenantUser.email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
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
 * Request password reset
 */
export async function requestPasswordReset(email: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://reluit.com"}/auth/reset-password`,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Reset password with token
 */
export async function resetPassword(newPassword: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}

