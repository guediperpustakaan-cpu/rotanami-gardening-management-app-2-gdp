import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PAGES = new Set(["/", "/masuk", "/daftar"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/brand/")
  ) {
    return NextResponse.next();
  }

  const session = request.cookies.get("rotanami_session")?.value;
  const isPublic = PUBLIC_PAGES.has(pathname);

  if (!session && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/masuk";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
