import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/sign-in",
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - / (root landing page)
     * - /sign-in
     * - /api/auth/* (NextAuth routes)
     * - /_next/* (static files)
     * - /favicon.ico, /sitemap.xml, /robots.txt
     */
    "/((?!$|sign-in|api/auth|_next|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
