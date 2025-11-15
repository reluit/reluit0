import { redirect } from "next/navigation";
import { headers } from "next/headers";

// Redirect /[slug] to /dashboard immediately
export default async function TenantPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  // Handle both Promise and direct params (Next.js 15 compatibility)
  const resolvedParams = params instanceof Promise ? await params : params;
  const slug = resolvedParams?.slug;
  
  // For subdomain routing, slug might be undefined - check headers for subdomain
  if (!slug) {
    const headersList = await headers();
    const hostname = headersList.get('host') || '';
    const subdomain = hostname.split('.')[0];
    
    // If we have a subdomain, redirect to /dashboard (subdomain routing)
    if (subdomain && !['localhost', 'www', 'reluit'].includes(subdomain)) {
      redirect('/dashboard');
    } else {
      // Fallback: just redirect to /dashboard
      redirect('/dashboard');
    }
  } else {
    // Slug-based routing: redirect to /dashboard (no slug prefix)
    redirect('/dashboard');
  }
}

