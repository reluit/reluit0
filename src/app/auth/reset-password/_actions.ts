"use server";

import { resetPassword } from "@/lib/auth";

export interface ResetPasswordState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function resetPasswordAction(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const password = formData.get("password")?.toString();
  const confirmPassword = formData.get("confirmPassword")?.toString();

  if (!password || !confirmPassword) {
    return {
      status: "error",
      message: "Both password fields are required",
    };
  }

  if (password !== confirmPassword) {
    return {
      status: "error",
      message: "Passwords do not match",
    };
  }

  if (password.length < 8) {
    return {
      status: "error",
      message: "Password must be at least 8 characters",
    };
  }

  try {
    await resetPassword(password);
    return {
      status: "success",
      message: "Password reset successfully! Redirecting...",
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Failed to reset password",
    };
  }
}

