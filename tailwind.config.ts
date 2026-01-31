import type { Config } from "tailwindcss"

const config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#FF6B35", foreground: "#ffffff" },
        secondary: { DEFAULT: "#1A1A1A", foreground: "#ffffff" },
      },
    },
  },
  plugins: [],
} satisfies Config

export default config
