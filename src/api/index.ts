import { Hono } from "hono";
import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { serveStatic } from "@hono/node-server/serve-static";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { readFileSync, existsSync } from "node:fs";

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

/** connect-history-api-fallback 的 Hono 实现，行为与源码一致 */
function historyApiFallback(options: {
  index?: string;
  rewrites?: {
    from: RegExp;
    to: string | ((ctx: { parsedUrl: URL; match: RegExpMatchArray }) => string);
  }[];
  htmlAcceptHeaders?: string[];
  disableDotRule?: boolean;
  verbose?: boolean;
  logger?: (...args: unknown[]) => void;
} = {}) {
  const index = options.index ?? "/index.html";
  const rewrites = options.rewrites ?? [];
  const htmlAcceptHeaders = options.htmlAcceptHeaders ?? ["text/html", "*/*"];
  const disableDotRule = options.disableDotRule ?? false;
  const logger = options.logger ?? (options.verbose ? (...args: unknown[]) => console.log(...args) : () => {});

  const acceptsHtml = (header: string) =>
    htmlAcceptHeaders.some((h) => header.indexOf(h) !== -1);

  return async (c: { req: { method: string; url: string; header: (n: string) => string | undefined }; html: (body: string) => Response }, next: () => Promise<void>) => {
    const method = c.req.method;
    const url = new URL(c.req.url);
    const pathname = url.pathname;
    const acceptHeader = c.req.header("Accept") ?? "";

    if (method !== "GET" && method !== "HEAD") {
      logger("Not rewriting", method, c.req.url, "because the method is not GET or HEAD.");
      return next();
    }
    if (typeof acceptHeader !== "string") {
      logger("Not rewriting", method, c.req.url, "because the client did not send an HTTP accept header.");
      return next();
    }
    if (acceptHeader.indexOf("application/json") === 0) {
      logger("Not rewriting", method, c.req.url, "because the client prefers JSON.");
      return next();
    }
    if (!acceptsHtml(acceptHeader)) {
      logger("Not rewriting", method, c.req.url, "because the client does not accept HTML.");
      return next();
    }

    for (const rewrite of rewrites) {
      const match = pathname.match(rewrite.from);
      if (match !== null) {
        const rewriteTarget =
          typeof rewrite.to === "string"
            ? rewrite.to
            : rewrite.to({ parsedUrl: url, match });
        logger("Rewriting", method, c.req.url, "to", rewriteTarget);
        const filePath = join(__dirname, rewriteTarget.replace(/^\//, ""));
        if (existsSync(filePath)) {
          return c.html(readFileSync(filePath, "utf-8"));
        }
        return next();
      }
    }

    const lastDot = pathname.lastIndexOf(".");
    const lastSlash = pathname.lastIndexOf("/");
    if (lastDot > lastSlash && !disableDotRule) {
      logger("Not rewriting", method, c.req.url, "because the path includes a dot (.) character.");
      return next();
    }

    logger("Rewriting", method, c.req.url, "to", index);
    const indexPath = join(__dirname, index.replace(/^\//, ""));
    if (existsSync(indexPath)) {
      return c.html(readFileSync(indexPath, "utf-8"));
    }
    return next();
  };
}

app.use("/*", historyApiFallback());
app.use("/*", serveStatic({ root: __dirname }));

export default app;
