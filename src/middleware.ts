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
    // e.g., /slug/dashboard -> /tenant/slug/dashboard
    const pathMatch = url.pathname.match(/^\/([^/]+)(\/.*)?$/);
    if (pathMatch) {
      const slug = pathMatch[1];
      const restPath = pathMatch[2] || '';
      
      // Skip if it's a reserved path (admin, api, auth, etc.)
      if (slug === 'admin' || slug === 'api' || slug === 'auth' || slug === 'integrations' || slug === 'tenant') {
        return NextResponse.next();
      }
      
      const urlWithSlug = url.clone();
      
      // If root path or just /slug, redirect to /slug/dashboard
      if (restPath === '' || restPath === '/') {
        urlWithSlug.pathname = `/tenant/${slug}/dashboard`;
      } else {
        // Rewrite /[slug]/... to /tenant/[slug]/...
        urlWithSlug.pathname = `/tenant/${slug}${restPath}`;
      }
      
      return NextResponse.rewrite(urlWithSlug);
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

    // Skip common subdomains
    if (
      subdomain === 'www' ||
      subdomain === 'app' ||
      subdomain === 'admin' ||
      subdomain === 'dashboard'
    ) {
      return NextResponse.next();
    }

    // Create URL with subdomain parameter
    const urlWithSlug = url.clone();
    
    // If root path, redirect to dashboard
    if (url.pathname === '/') {
      urlWithSlug.pathname = `/tenant/${subdomain}/dashboard`;
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
