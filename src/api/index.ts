import { Hono } from "hono";
import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { serveStatic } from "@hono/node-server/serve-static";
import { fileURLToPath } from "node:url";

process.env.DATABASE_URL = atob('cG9zdGdyZXM6Ly91YXBwX2NhbnlvbjpPVGswT0RrMll6QGNhbnlvbi5wZy5kYi51YXQucWEubnQuY3RyaXBjb3JwLmNvbTo1NTc3Ny9jYW55b25kYg==')

import postsApi from "@/api/routes/posts.ts";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const app = new Hono();

const api = new OpenAPIHono();

api.route("/posts", postsApi);

api.doc("/doc", {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "Post API",
  },
});

api.get("/ui", swaggerUI({ url: "/api/doc" }));

api.get("/health", (c) => c.text("OK"));

app.route("/api", api);

app.use("/*", serveStatic({ root: __dirname }));

export default app;
