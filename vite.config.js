import { defineConfig } from "vite";
import { resolve } from "node:path";

/**
 * Two build targets from one config.
 *
 *   npm run build          -> dist/        MV3 extension, load unpacked
 *   npm run build:demo     -> dist-demo/  hosted page judges can open from a URL
 *
 * The Firebase client config in src/firebase.js carries placeholders; real
 * values are injected from environment variables so nothing sensitive is
 * committed:
 *
 *   VITE_FB_API_KEY, VITE_FB_AUTH_DOMAIN, VITE_FB_PROJECT_ID,
 *   VITE_FB_STORAGE_BUCKET, VITE_FB_SENDER_ID, VITE_FB_APP_ID,
 *   VITE_FB_APPCHECK_SITE_KEY, VITE_FB_APPCHECK_DEBUG
 */

const inject = (name, fallback = "") => JSON.stringify(process.env[name] ?? fallback);

const injected = {
  __FIREBASE_API_KEY__: inject("VITE_FB_API_KEY"),
  __FIREBASE_AUTH_DOMAIN__: inject("VITE_FB_AUTH_DOMAIN"),
  __FIREBASE_PROJECT_ID__: inject("VITE_FB_PROJECT_ID"),
  __FIREBASE_STORAGE_BUCKET__: inject("VITE_FB_STORAGE_BUCKET"),
  __FIREBASE_MESSAGING_SENDER_ID__: inject("VITE_FB_SENDER_ID"),
  __FIREBASE_APP_ID__: inject("VITE_FB_APP_ID"),
  __APPCHECK_DEBUG__: inject("VITE_FB_APPCHECK_DEBUG"),
  __APPCHECK_SITE_KEY__: inject("VITE_FB_APPCHECK_SITE_KEY"),
};

export default defineConfig(({ mode }) => {
  const isDemo = mode === "demo";

  return {
    define: injected,
    build: {
      outDir: isDemo ? "dist-demo" : "dist",
      emptyOutDir: true,
      target: "chrome139",
      rollupOptions: isDemo
        ? { input: { demo: resolve(__dirname, "demo.html") } }
        : {
            input: {
              popup: resolve(__dirname, "index.html"),
              background: resolve(__dirname, "src/background.js"),
            },
            output: {
              // background must land at js/background.js because the manifest
              // names that path; the HTML entry keeps Vite's own naming.
              entryFileNames: (a) => (a.name === "background" ? "js/background.js" : "[name].js"),
              chunkFileNames: "js/[name]-[hash].js",
              assetFileNames: (a) =>
                a.name && a.name.endsWith(".css") ? "css/[name][extname]" : "[name][extname]",
            },
          },
    },
    server: { port: 5173, open: false },
  };
});
