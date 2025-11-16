import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // Skip middleware for next internal routes, static files, and the root domain
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Handle localhost and vercel domains with slug-based routing
  const isLocalhost = hostname === 'localhost:3000' || hostname.startsWith('localhost');
  const isVercelPreview = hostname.includes('.vercel.app');
  const isRootDomain = hostname === 'reluit.com';
  
  if (isLocalhost || isVercelPreview) {
    // For localhost/vercel, handle slug-based routing from pathname
    // Check if path starts with /dashboard first (no slug prefix)
    if (url.pathname.startsWith('/dashboard')) {
      // Try to get slug from query parameter first (for Stripe redirects)
      const slugFromQuery = url.searchParams.get('slug');
      
      // Try to get slug from cookie
      const tenantSlug = slugFromQuery || request.cookies.get('tenant-slug')?.value;
      
      if (tenantSlug) {
        const restPath = url.pathname.substring('/dashboard'.length);
        const urlWithSlug = url.clone();
        urlWithSlug.pathname = `/tenant/${tenantSlug}/dashboard${restPath}`;
        // Set cookie for future requests if we got slug from query
        const response = NextResponse.rewrite(urlWithSlug);
        if (slugFromQuery) {
          response.cookies.set('tenant-slug', tenantSlug, { path: '/', maxAge: 60 * 60 * 24 * 7 }); // 7 days
        }
        return response;
      }
      
      // If no cookie, try to extract from path (e.g., /slug/dashboard)
      const pathMatch = url.pathname.match(/^\/([^/]+)\/dashboard(\/.*)?$/);
      if (pathMatch) {
        const slug = pathMatch[1];
        const restPath = pathMatch[2] || '';
        const urlWithSlug = url.clone();
        urlWithSlug.pathname = `/tenant/${slug}/dashboard${restPath}`;
        // Set cookie for future requests
        const response = NextResponse.rewrite(urlWithSlug);
        response.cookies.set('tenant-slug', slug, { path: '/', maxAge: 60 * 60 * 24 * 7 }); // 7 days
        return response;
      }
      
      // If no slug found, let it fall through (might need to handle this case)
      return NextResponse.next();
    }
    
    // Handle /[slug] routes
    const pathMatch = url.pathname.match(/^\/([^/]+)(\/.*)?$/);
    if (pathMatch) {
      const slug = pathMatch[1];
      const restPath = pathMatch[2] || '';
      
      // Skip if it's a reserved path (admin, api, auth, etc.)
      if (slug === 'admin' || slug === 'api' || slug === 'auth' || slug === 'integrations' || slug === 'tenant' || slug === 'dashboard') {
        return NextResponse.next();
      }
      
      const urlWithSlug = url.clone();
      
      // If root path or just /slug, rewrite to /tenant/[slug] (will redirect to /dashboard via page.tsx)
      if (restPath === '' || restPath === '/') {
        urlWithSlug.pathname = `/tenant/${slug}`;
      } else {
        // Rewrite /[slug]/... to /tenant/[slug]/...
        urlWithSlug.pathname = `/tenant/${slug}${restPath}`;
      }
      
      // Set cookie for future /dashboard requests
      const response = NextResponse.rewrite(urlWithSlug);
      response.cookies.set('tenant-slug', slug, { path: '/', maxAge: 60 * 60 * 24 * 7 }); // 7 days
      return response;
    }
    return NextResponse.next();
  }
  
  if (isRootDomain) {
    return NextResponse.next();
  }

  // Extract subdomain from hostname for production domains
  // e.g., "tenant1.reluit.com" -> "tenant1"
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    const subdomain = parts[0];

    // Handle admin subdomain - rewrite to /admin
    if (subdomain === 'admin') {
      const urlWithAdmin = url.clone();
      urlWithAdmin.pathname = '/admin';
      return NextResponse.rewrite(urlWithAdmin);
    }

    // Skip other common subdomains
    if (
      subdomain === 'www' ||
      subdomain === 'app' ||
      subdomain === 'dashboard'
    ) {
      return NextResponse.next();
    }

    // Create URL with subdomain parameter
    const urlWithSlug = url.clone();
    
    // If root path, rewrite to /tenant/[subdomain] (will redirect to /dashboard via page.tsx)
    if (url.pathname === '/') {
      urlWithSlug.pathname = `/tenant/${subdomain}`;
    } else if (url.pathname.startsWith('/dashboard')) {
      // Rewrite /dashboard and /dashboard/... to /tenant/[subdomain]/dashboard/...
      const restPath = url.pathname.substring('/dashboard'.length);
      urlWithSlug.pathname = `/tenant/${subdomain}/dashboard${restPath}`;
    } else {
      // Rewrite /... to /tenant/[subdomain]/...
      urlWithSlug.pathname = `/tenant/${subdomain}${url.pathname}`;
    }
    
    urlWithSlug.searchParams.set('slug', subdomain);

    return NextResponse.rewrite(urlWithSlug);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
