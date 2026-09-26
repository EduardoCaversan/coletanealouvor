import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

// Netlify/Vercel servem a partir da raiz; GitHub Pages de projeto serve em /<repo>/.
// BASE_PATH deixa o mesmo build funcionar nos dois, sem hardcode de "/" no código.
const base = process.env.BASE_PATH ?? "/ekklesia/";

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: [
        "favicon.ico",
        "favicon.svg",
        "favicon-16.png",
        "favicon-32.png",
        "apple-touch-icon.png",
      ],
      manifest: {
        id: base,
        name: "Ekklesia",
        short_name: "Ekklesia",
        description:
          "Free, local-first worship presentation console for churches.",
        lang: "pt-BR",
        start_url: base,
        scope: base,
        display: "standalone",
        display_override: ["fullscreen", "standalone"],
        orientation: "any",
        background_color: "#101116",
        theme_color: "#101116",
        icons: [
          { src: `${base}icon-192.png`, sizes: "192x192", type: "image/png" },
          { src: `${base}icon-512.png`, sizes: "512x512", type: "image/png" },
          {
            src: `${base}icon-maskable-512.png`,
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        cacheId: "ekklesia",
        globPatterns: [
          "**/*.{js,mjs,css,html,svg,png,woff2,bcmap,pfb,ttf,wasm}",
        ],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/data\/.*\.json$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "ekklesia-acervo-json",
              expiration: { maxEntries: 32 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { "@": path.resolve(process.cwd(), "src") },
  },
});
