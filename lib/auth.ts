import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        identifier: { label: "Email or Phone", type: "text" }, // <-- Changed to identifier
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) return null;

        const identifier = credentials.identifier.trim();

        // 1. Find user by email OR phone
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: identifier },
              { phone: identifier },
            ],
          },
        });

        if (!user) return null;

        // 2. Block locked accounts
        if (user.status === "locked") {
          throw new Error("Your account has been locked. Please contact the administrator.");
        }

        // 3. Verify password
        const valid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );
        if (!valid) return null;

        // 4. Return user data
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          forcePasswordReset: user.forcePasswordReset,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
        token.forcePasswordReset = (user as any).forcePasswordReset;
      }
      if (trigger === "update" && session?.forcePasswordReset !== undefined) {
        token.forcePasswordReset = session.forcePasswordReset;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).forcePasswordReset = token.forcePasswordReset;
      }
      return session;
    },
  },
};

