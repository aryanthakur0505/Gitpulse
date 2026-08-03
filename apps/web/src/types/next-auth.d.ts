import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      githubId: string;
    };
    apiToken: string;
    accessToken: string;
  }

  interface User {
    __apiToken?: string;
    __userId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    githubId?: string;
    apiToken?: string;
    accessToken?: string;
  }
}
