import { defineConfig } from "vite";
import devServer from "@hono/vite-dev-server";
import build from "@hono/vite-build/node";
import react from "@vitejs/plugin-react-swc";
import Pages from "vite-plugin-pages";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    Pages({
      exclude: ["**/views/**", "**/helpers/**"],
    }),
    tailwindcss(),
    build({
      entry: "./src/api/index.ts",
      port: 3001,
    }),
    devServer({
      entry: "./src/api/index.ts",
      // 不带 /api 的请求交给 Vite，带 /api 的由 Hono 处理
      exclude: [/^(?!\/api(\/|$|\?))/],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // '@canyonjs/report-component': path.resolve(__dirname, '../../packages/report-component/src'),
    },
  },
});
