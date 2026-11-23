import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "./lib/server/admin-session";
import type { NextRequest } from "next/server";

const intlMiddleware = createMiddleware(routing);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") return NextResponse.next();
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!verifySessionToken(token)) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.next();
  }

  return intlMiddleware(request);
}

// The proxy only has work to do where a URL carries no locale yet (`/`, old
// unprefixed links) or under /admin. Every storefront URL is already
// /en/... or /ar/..., so those are skipped and served straight from the CDN:
// running the proxy on them (including each link prefetch and bot hit) was the
// bulk of the site's Fluid Active CPU. Nothing is lost by skipping them — the
// [locale] layout calls setRequestLocale, hreflang comes from page metadata and
// the sitemap, and the language switcher (next-intl's Link) writes the
// NEXT_LOCALE cookie in the browser itself.
export const config = {
  matcher: ["/((?!api|_next|_vercel|en/|ar/|en$|ar$|.*\\..*).*)"],
};
