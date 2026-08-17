import { defineConfig } from "vite";

export default defineConfig({
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: {
      entry: "src/studio/studio.ts",
      formats: ["iife"],
      name: "RutubeZamesiStudio",
    },
    rollupOptions: {
      output: {
        entryFileNames: "studio.js",
      },
    },
  },
});