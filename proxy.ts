import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function proxy(req) {
    const token = req.nextauth.token as any;
    const { pathname } = req.nextUrl;

    // Allow access to the password change page always
    if (pathname.startsWith("/account/password")) {
      return NextResponse.next();
    }

    // Redirect to password page if the flag is true
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
