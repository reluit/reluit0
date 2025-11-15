import { redirect } from "next/navigation";

// Redirect /[slug] to /[slug]/dashboard immediately
export default function TenantPage({
  params,
}: {
  params: { slug: string };
}) {
  redirect(`/${params.slug}/dashboard`);
}

