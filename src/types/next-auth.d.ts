import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    googleSubjectId?: string;
  }

  interface Session {
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      googleSubjectId?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    googleSubjectId?: string;
  }
}
