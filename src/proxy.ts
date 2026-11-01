import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

const publicAdminPaths = ["/admin/login", "/admin/forgot-password", "/admin/reset-password"];

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin") && !publicAdminPaths.some((path) => request.nextUrl.pathname.startsWith(path))) {
    const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
    if (!token?.sub) {
      const login = new URL("/admin/login", request.url);
      login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(login);
    }
  }
  const segment = request.nextUrl.pathname.split("/")[1];
  const locale = segment === "si" || segment === "ta" ? segment : "en";
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-store-locale", locale);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = { matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|svg)$).*)"] };
