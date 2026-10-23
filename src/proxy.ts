import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
export async function proxy(request: NextRequest) {
  if (
    request.nextUrl.pathname === "/testing" ||
    request.nextUrl.pathname.startsWith("/testing/")
  ) {
    return process.env.NODE_ENV === "production" || process.env.ZION_E2E !== "1"
      ? new NextResponse("Página não encontrada.", { status: 404 })
      : NextResponse.next({ request });
  }
  const protectedPage =
    (request.nextUrl.pathname === "/admin" ||
      request.nextUrl.pathname.startsWith("/admin/")) &&
    !["/admin/login", "/admin/redefinir"].includes(request.nextUrl.pathname);
  const login = () =>
    NextResponse.redirect(new URL("/admin/login", request.url));
  let response = NextResponse.next({ request });
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
    return protectedPage ? login() : response;
  const db = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values) {
          for (const { name, value } of values)
            request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of values)
            response.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
            });
        },
      },
    },
  );
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user && protectedPage) {
    const redirect = login();
    for (const cookie of response.cookies.getAll())
      redirect.cookies.set(cookie);
    return redirect;
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/auth/:path*",
    "/testing/:path*",
  ],
};
