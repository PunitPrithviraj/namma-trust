import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function proxy(req) {
    const token = req.nextauth.token as any;
    const { pathname } = req.nextUrl;

    if (pathname.startsWith("/account/password")) {
      return NextResponse.next();
    }

    if (token?.mustChangePassword) {
      const url = req.nextUrl.clone();
      url.pathname = "/account/password";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  // Do not include "/api/:path*" here, the API routes handle their own auth.
  matcher: [
    "/dashboard/:path*",
    "/investors/:path*",
    "/loans/:path*",
    "/profits/:path*",
    "/audit/:path*",
    "/account/:path*",
    "/admin/:path*",
  ],
};

