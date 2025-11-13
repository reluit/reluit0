"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { resetPasswordAction, type ResetPasswordState } from "./_actions";

const initialState: ResetPasswordState = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-700 disabled:text-emerald-200"
    >
      {pending ? "Resetting..." : "Reset password"}
    </button>
  );
}


export default function ResetPasswordPage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState(resetPasswordAction, initialState);

  useEffect(() => {
    if (state.status === "success") {
      setTimeout(() => {
        router.push("https://reluit.com");
      }, 2000);
    }
  }, [state.status, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Reset your password</h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter your new password below
          </p>
        </div>

        <form ref={formRef} action={formAction} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {state.status === "error" && (
            <div className="rounded-md border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">
              {state.message}
            </div>
          )}

          {state.status === "success" && (
            <div className="rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
              {state.message}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              New password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-emerald-400 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-emerald-400 focus:outline-none"
            />
            <p className="text-xs text-gray-500">Must be at least 8 characters</p>
          </div>

          <SubmitButton />
        </form>

        <div className="text-center">
          <Link href="https://reluit.com" className="text-sm text-emerald-600 hover:text-emerald-700">
            Back to Reluit
          </Link>
        </div>
      </div>
    </div>
  );
}

