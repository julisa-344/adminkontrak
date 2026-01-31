import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { authConfig } from "./auth.config"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { validateAdminPassword } from "@/lib/password-policy"

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error("Email y contraseña son requeridos")
          }

          const usuario = await prisma.usuario.findUnique({
            where: { emailprop: credentials.email as string },
          })

          if (!usuario) throw new Error("Usuario no encontrado")
          if (!usuario.password) throw new Error("Contraseña no configurada")

          const rolUpper = usuario.rol?.toUpperCase()
          if (rolUpper !== "ADMINISTRADOR") {
            throw new Error("Solo administradores pueden acceder a este panel")
          }

          const plainPassword = credentials.password as string
          const policy = validateAdminPassword(plainPassword)
          if (!policy.valid) {
            throw new Error(policy.error)
          }

          const passwordMatch = await bcrypt.compare(
            plainPassword,
            usuario.password
          )
          if (!passwordMatch) throw new Error("Contraseña incorrecta")

          return {
            id: usuario.idprop.toString(),
            email: usuario.emailprop || "",
            name: `${usuario.nomprop || ""} ${usuario.apeprop || ""}`.trim(),
            rol: usuario.rol,
          }
        } catch {
          return null
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.rol = user.rol
      }
      return token
    },
  },
})
