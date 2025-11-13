"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import { signInAction, signUpAction, forgotPasswordAction, type SignInActionState, type SignUpActionState, type ForgotPasswordActionState } from "../_actions";
import type { TenantWithDomains } from "@/lib/tenants";

const signUpInitialState: SignUpActionState = { status: "idle" };
const signInInitialState: SignInActionState = { status: "idle" };
const forgotPasswordInitialState: ForgotPasswordActionState = { status: "idle" };

function SubmitButton({ text, pendingText }: { text: string; pendingText: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-700 disabled:text-emerald-200"
    >
      {pending ? pendingText : text}
    </button>
  );
}

export function ClaimPage({ tenant, isClaimed }: { tenant: TenantWithDomains; isClaimed: boolean }) {
  const router = useRouter();
  const signUpFormRef = useRef<HTMLFormElement>(null);
  const signInFormRef = useRef<HTMLFormElement>(null);
  const forgotPasswordFormRef = useRef<HTMLFormElement>(null);
  const [signUpState, signUpActionFn] = useFormState(signUpAction, signUpInitialState);
  const [signInState, signInActionFn] = useFormState(signInAction, signInInitialState);
  const [forgotPasswordState, forgotPasswordActionFn] = useFormState(forgotPasswordAction, forgotPasswordInitialState);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    if (signUpState.status === "success" || signInState.status === "success") {
      router.refresh();
    }
  }, [signUpState.status, signInState.status, router]);

  const primaryDomain = tenant.domains.find((d) => d.is_primary) ?? tenant.domains[0];

  if (isClaimed) {
    if (showForgotPassword) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-white px-4">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-semibold text-gray-900">Reset password</h1>
              <p className="mt-2 text-sm text-gray-600">
                We&apos;ll send a password reset link to your email
              </p>
            </div>

            <form ref={forgotPasswordFormRef} action={forgotPasswordActionFn} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <input type="hidden" name="tenantId" value={tenant.id} />

              {forgotPasswordState.status === "error" && (
                <div className="rounded-md border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">
                  {forgotPasswordState.message}
                </div>
              )}

              {forgotPasswordState.status === "success" && (
                <div className="rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
                  {forgotPasswordState.message}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Back to login
                </button>
                <SubmitButton text="Send reset link" pendingText="Sending..." />
              </div>
            </form>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-gray-900">Sign in to {tenant.name}</h1>
            <p className="mt-2 text-sm text-gray-600">
              Access your dashboard at <span className="font-mono text-emerald-600">{primaryDomain?.domain}</span>
            </p>
          </div>

          <form ref={signInFormRef} action={signInActionFn} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <input type="hidden" name="tenantId" value={tenant.id} />

            {signInState.status === "error" && (
              <div className="rounded-md border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">
                {signInState.message}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="signin-password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="signin-password"
                name="password"
                type="password"
                required
                placeholder="Enter your password"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-emerald-400 focus:outline-none"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-emerald-600 hover:text-emerald-700"
              >
                Forgot password?
              </button>
            </div>

            <SubmitButton text="Sign in" pendingText="Signing in..." />
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Claim your dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">
            Create an account to access <span className="font-mono text-emerald-600">{primaryDomain?.domain}</span>
          </p>
          <p className="mt-1 text-xs text-gray-500">This subdomain belongs to {tenant.name}</p>
        </div>

        <form ref={signUpFormRef} action={signUpActionFn} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <input type="hidden" name="tenantId" value={tenant.id} />

          {signUpState.status === "error" && (
            <div className="rounded-md border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {signUpState.message}
            </div>
          )}

          {signUpState.status === "success" && (
            <div className="rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              {signUpState.message}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="signup-email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-emerald-400 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="signup-password"
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-emerald-400 focus:outline-none"
            />
            <p className="text-xs text-gray-500">Must be at least 8 characters</p>
          </div>

          <SubmitButton text="Claim dashboard" pendingText="Creating account..." />
        </form>
      </div>
    </div>
  );
}

