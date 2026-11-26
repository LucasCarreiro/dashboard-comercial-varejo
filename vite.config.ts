import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// base relativa: funciona tanto em localhost quanto no GitHub Pages
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  build: { chunkSizeWarningLimit: 900 },
});
