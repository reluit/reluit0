"use server";

import { redirect } from "next/navigation";

import { signInByTenant, signUpAndClaimTenant, requestPasswordReset, getTenantOwnerEmail } from "@/lib/auth";
import { getTenantByDomain, getTenantBySlug } from "@/lib/tenants";

export interface SignUpActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function signUpAction(
  _prevState: SignUpActionState,
  formData: FormData
): Promise<SignUpActionState> {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const tenantId = formData.get("tenantId")?.toString();

  if (!email || !password || !tenantId) {
    return {
      status: "error",
      message: "Email, password, and tenant ID are required",
    };
  }

  try {
    await signUpAndClaimTenant(email, password, tenantId);
    return {
      status: "success",
      message: "Account created! Please check your email to confirm your account.",
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Failed to create account",
    };
  }
}

export interface SignInActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function signInAction(
  _prevState: SignInActionState,
  formData: FormData
): Promise<SignInActionState> {
  const password = formData.get("password")?.toString();
  const tenantId = formData.get("tenantId")?.toString();

  if (!password || !tenantId) {
    return {
      status: "error",
      message: "Password is required",
    };
  }

  try {
    await signInByTenant(tenantId, password);
    return {
      status: "success",
      message: "Signed in successfully! Redirecting...",
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Failed to sign in",
    };
  }
}

export interface ForgotPasswordActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function forgotPasswordAction(
  _prevState: ForgotPasswordActionState,
  formData: FormData
): Promise<ForgotPasswordActionState> {
  const tenantId = formData.get("tenantId")?.toString();

  if (!tenantId) {
    return {
      status: "error",
      message: "Tenant ID is required",
    };
  }

  try {
    const email = await getTenantOwnerEmail(tenantId);
    if (!email) {
      return {
        status: "error",
        message: "Unable to find account email",
      };
    }

    await requestPasswordReset(email);
    return {
      status: "success",
      message: "Password reset email sent! Check your inbox.",
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Failed to send reset email",
    };
  }
}

