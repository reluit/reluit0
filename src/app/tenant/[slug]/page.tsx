import { redirect } from "next/navigation";

// Simple redirect to dashboard - auth is handled client-side in dashboard layout
export default function TenantPage({
  params,
}: {
  params: { slug: string };
}) {
  redirect(`/${params.slug}/dashboard`);
}

