import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig(({ mode }) => {
  // Load all env vars (no prefix filter) so we can expose NEXT_PUBLIC_* ones
  const env = loadEnv(mode, process.cwd(), "")

  // Map NEXT_PUBLIC_* vars to process.env.NEXT_PUBLIC_* so existing code works unchanged
  const processEnvDefines = Object.fromEntries(
    Object.entries(env)
      .filter(([key]) => key.startsWith("NEXT_PUBLIC_"))
      .map(([key, val]) => [`process.env.${key}`, JSON.stringify(val)])
  )

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    define: processEnvDefines,
  }
})
