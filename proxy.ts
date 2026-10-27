export { default as proxy } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/investors/:path*",
    "/loans/:path*",
    "/cycles/:path*",
  ],
};
