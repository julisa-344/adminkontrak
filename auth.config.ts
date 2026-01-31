import type { NextAuthConfig } from "next-auth"

export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 }, // 1 hora para admin
  trustHost: true,
  providers: [],
  callbacks: {
    session({ session, token }) {
      if (session?.user) {
        session.user.id = typeof token.id === "string" ? token.id : ""
        session.user.rol = typeof token.rol === "string" ? token.rol : null
      }
      return session
    },
  },
}
