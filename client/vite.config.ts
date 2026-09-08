import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'FindPGRoom',
        short_name: 'FindPG',
        description: 'Find and manage the best PG accommodations seamlessly.',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: 'logo-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'logo-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  envDir: path.resolve(__dirname, ".."),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
})
