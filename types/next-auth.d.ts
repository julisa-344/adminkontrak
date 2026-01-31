import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface User {
    id: string
    email?: string | null
    name?: string | null
    rol?: string | null
  }

  interface Session {
    user: {
      id: string
      rol?: string | null
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    rol?: string | null
  }
}
