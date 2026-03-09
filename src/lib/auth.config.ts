import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { pool } from "./db";

export default {
  providers: [
    Google,
    GitHub,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const result = await pool.query(
          `SELECT id, name, email, image, username, role, password_hash
           FROM users WHERE email = $1`,
          [credentials.email]
        );

        if (result.rows.length === 0) return null;

        const user = result.rows[0];
        if (!user.password_hash) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password_hash
        );
        if (!isValid) return null;

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
    newUser: "/register",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const pathname = request.nextUrl.pathname;

      // Protected routes under (main) group
      const protectedPaths = ["/dashboard", "/profile", "/lobby", "/topics", "/debate", "/admin"];
      const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

      if (isProtected && !isLoggedIn) {
        return false;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Fetch username and role from DB
        const result = await pool.query(
          `SELECT username, role FROM users WHERE id = $1`,
          [user.id]
        );
        if (result.rows.length > 0) {
          token.username = result.rows[0].username;
          token.role = result.rows[0].role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
