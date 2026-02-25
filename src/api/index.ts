import { Hono } from "hono";
import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { serveStatic } from "@hono/node-server/serve-static";
import { fileURLToPath } from "node:url";

import { loadInfra } from "@/api/lib/infra";
import { initPrismaSqlite } from "@/api/lib/prisma-sqlite.ts";
import { startCoverageConsumer } from "@/api/lib/collect/coverage-consumer.ts";
import postsApi from "@/api/routes/posts.ts";
import reposApi from "@/api/routes/repos.ts";
import sourceApi from "@/api/routes/source.ts";
import collectApi from "@/api/routes/collect.ts";

await loadInfra();
await initPrismaSqlite();
startCoverageConsumer();

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const app = new Hono();

const api = new OpenAPIHono();

api.route("/posts", postsApi);
api.route("/repos", reposApi);
api.route("/source", sourceApi);
api.route("/coverage", collectApi);

api.doc("/doc", {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "API",
  },
});

api.get("/ui", swaggerUI({ url: "/api/doc" }));

api.get("/health", (c) => c.text("OK"));

app.route("/api", api);

app.use("/*", serveStatic({ root: __dirname }));

export default app;
