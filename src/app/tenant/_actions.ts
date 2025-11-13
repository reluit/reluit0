"use server";

import { redirect } from "next/navigation";

import { signIn, signUpAndClaimTenant } from "@/lib/auth";
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
      message: "Account created successfully! Redirecting...",
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
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return {
      status: "error",
      message: "Email and password are required",
    };
  }

  try {
    await signIn(email, password);
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

