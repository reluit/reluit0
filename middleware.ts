import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { ADMIN_SUBDOMAIN, ROOT_DOMAIN } from "./src/lib/env";

const PUBLIC_FILE = /\.(.*)$/;

function isPublicAsset(pathname: string) {
  return PUBLIC_FILE.test(pathname);
}

function isApiRoute(pathname: string) {
  return pathname.startsWith("/api");
}

function buildTenantPath(tenantKey: string, pathname: string) {
  if (pathname === "/") {
    return `/tenant/${tenantKey}`;
  }

  return `/tenant/${tenantKey}${pathname}`;
}

export function middleware(request: NextRequest) {
  const { nextUrl } = request;
  const hostHeader = request.headers.get("host") ?? "";
  const hostname = hostHeader.split(":")[0]?.toLowerCase() ?? "";
  const pathname = nextUrl.pathname;

  if (isPublicAsset(pathname) || isApiRoute(pathname) || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  const isLocalhost = hostname.startsWith("localhost") || hostname.startsWith("127.0.0.1");
  const isVercelPreview = hostname.endsWith(".vercel.app");

  if (isLocalhost || isVercelPreview) {
    return NextResponse.next();
  }

  const isRootDomain = hostname === ROOT_DOMAIN || hostname === `www.${ROOT_DOMAIN}`;
  if (isRootDomain) {
    return NextResponse.next();
  }

  const adminHost = `${ADMIN_SUBDOMAIN}.${ROOT_DOMAIN}`;
  if (hostname === adminHost) {
    const url = nextUrl.clone();
    url.pathname = pathname === "/" ? "/admin" : `/admin${pathname}`;
    return NextResponse.rewrite(url);
  }

  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const subdomain = hostname.replace(`.${ROOT_DOMAIN}`, "");

    if (subdomain === ADMIN_SUBDOMAIN) {
      const url = nextUrl.clone();
      url.pathname = pathname === "/" ? "/admin" : `/admin${pathname}`;
      return NextResponse.rewrite(url);
    }

    // Route subdomain requests to domain route which looks up by full domain
    const url = nextUrl.clone();
    url.pathname = buildTenantPath("domain", pathname);
    url.searchParams.set("domain", hostname);
    return NextResponse.rewrite(url);
  }

  const url = nextUrl.clone();
  url.pathname = buildTenantPath("domain", pathname);
  url.searchParams.set("domain", hostname);
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};

