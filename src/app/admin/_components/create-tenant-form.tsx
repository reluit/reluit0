'use client';

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { createTenantAction, type CreateTenantActionState } from "../actions";

const initialState: CreateTenantActionState = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-700 disabled:text-emerald-200"
    >
      {pending ? "Creating..." : "Create Dashboard"}
    </button>
  );
}

export function CreateTenantForm({ rootDomain }: { rootDomain: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState(createTenantAction, initialState);

  useEffect(() => {
    if (state.status === "success" && formRef.current) {
      formRef.current.reset();
    }
  }, [state.status]);

  return (
    <form ref={formRef} action={formAction} className="space-y-5 rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-slate-100">Provision a new client dashboard</h2>
        <p className="text-sm text-slate-400">
          We&apos;ll automatically reserve a subdomain, connect Twilio later, and make the tenant ready for onboarding.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="block text-sm font-medium text-slate-200">Business name *</span>
          <input
            name="name"
            required
            placeholder="Acme Dental Clinic"
            className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
          />
        </label>

        <label className="space-y-2">
          <span className="block text-sm font-medium text-slate-200">Custom slug</span>
          <input
            name="slug"
            placeholder="acme-dental"
            className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
          />
          <p className="text-xs text-slate-500">Optional override for the internal identifier.</p>
        </label>

        <label className="space-y-2 sm:col-span-2">
          <span className="block text-sm font-medium text-slate-200">Preferred subdomain</span>
          <div className="flex items-center gap-2">
            <input
              name="subdomain"
              placeholder="acme"
              className="w-40 rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
            />
            <span className="text-sm text-slate-400">.{rootDomain}</span>
          </div>
          <p className="text-xs text-slate-500">Leave blank to generate from the business name.</p>
        </label>
      </div>

      {state.status !== "idle" && (
        <div
          className={`rounded-md px-3 py-2 text-sm ${
            state.status === "success"
              ? "border border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
              : "border border-rose-500/50 bg-rose-500/10 text-rose-200"
          }`}
        >
          <p>{state.message}</p>
          {state.status === "success" && state.tenantDomain && (
            <p className="mt-1 text-xs">
              Provisioned at <span className="font-mono">{state.tenantDomain}</span>
            </p>
          )}
        </div>
      )}

      <SubmitButton />
    </form>
  );
}

