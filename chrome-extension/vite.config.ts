import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: "src/popup/popup.ts",
        background: "src/background.ts",
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === "background" ? "background.js" : "popup.js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]",
        inlineDynamicImports: false,
      },
    },
  },
});