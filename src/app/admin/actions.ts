"use server";

import { revalidatePath } from "next/cache";

import { createTenantWithPrimaryDomain, type CreateTenantInput } from "@/lib/tenants";

export type CreateTenantActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  tenantSlug?: string;
  tenantDomain?: string;
};

function sanitizeInput(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export async function createTenantAction(
  _prevState: CreateTenantActionState,
  formData: FormData
): Promise<CreateTenantActionState> {
  const name = sanitizeInput(formData.get("name"));

  if (!name) {
    return { status: "error", message: "Business name is required." };
  }

  const slug = sanitizeInput(formData.get("slug"));
  const subdomain = sanitizeInput(formData.get("subdomain"));

  const payload: CreateTenantInput = {
    name,
    slug,
    subdomain,
  };

  try {
    const tenant = await createTenantWithPrimaryDomain(payload);
    const primaryDomain = tenant.domains.find((domain) => domain.is_primary)?.domain ?? tenant.domains[0]?.domain;

    revalidatePath("/admin");

    return {
      status: "success",
      message: "Client dashboard created.",
      tenantSlug: tenant.slug,
      tenantDomain: primaryDomain,
    };
  } catch (error) {
    console.error("Failed to create tenant", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to create client dashboard.",
    };
  }
}

