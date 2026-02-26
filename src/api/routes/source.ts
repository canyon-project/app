import { createRoute, z } from "@hono/zod-openapi";
import { OpenAPIHono } from "@hono/zod-openapi";
import { createScmAdapter } from "@/api/scm/index.ts";
import { getInfra, InfraKey } from "@/api/lib/infra.ts";
import { logger } from "@/api/logger";

const SourceQuerySchema = z.object({
  repo_id: z
    .string()
    .describe(
      "仓库 ID，支持：1) 完整 id 如 gitlab:owner/repo 2) path_with_namespace 如 owner/repo 3) 平台数字 ID",
    ),
  provider: z.enum(["gitlab", "github"]).describe("SCM 平台"),
  path: z.string().describe("文件相对路径"),
  ref: z.string().describe("分支、tag 或 commit sha"),
});

const sourceRoute = createRoute({
  method: "get",
  path: "/",
  request: {
    query: SourceQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            content: z.string().describe("Base64 编码的文件内容"),
          }),
        },
      },
      description: "成功",
    },
    400: { description: "参数错误" },
    404: { description: "文件不存在" },
    502: { description: "SCM 请求失败" },
  },
});

const sourceApi = new OpenAPIHono();

sourceApi.openapi(sourceRoute, async (c) => {
  const { repo_id, provider, path, ref } = c.req.valid("query");

  // repo_id 支持完整 id (provider:path_with_namespace)、path_with_namespace 或数字 ID
  const scmRepoId = repo_id.includes(":") ? repo_id.slice(repo_id.indexOf(":") + 1) : repo_id;

  let scm = null;
  logger({
    type: "info",
    title: "sourceApi called",
    message: "sourceApi called",
    addInfo: { repo_id, provider, path, ref },
  });
  if (provider === "gitlab") {
    const base = getInfra(InfraKey.GITLAB_BASE_URL);
    const token = getInfra(InfraKey.GITLAB_PRIVATE_TOKEN);
    if (!base || !token || token === "-") {
      return c.json({ error: "GitLab 未配置 GITLAB_BASE_URL 或 GITLAB_PRIVATE_TOKEN" }, 502);
    }
    scm = createScmAdapter({ type: "gitlab", base, token });
  } else if (provider === "github") {
    const token = getInfra(InfraKey.GITHUB_PRIVATE_TOKEN);
    if (!token || token === "-") {
      return c.json({ error: "GitHub 未配置 GITHUB_PRIVATE_TOKEN" }, 502);
    }
    scm = createScmAdapter({ type: "github", token });
  } else {
    return c.json({ error: `不支持的 provider: ${provider}` }, 400);
  }

  try {
    const content = await scm.getFileContent(scmRepoId, path, ref);
    const encoded = Buffer.from(content, "utf-8").toString("base64");
    return c.json({ content: encoded });
  } catch (err: unknown) {
    const status =
      err && typeof err === "object" && "response" in err
        ? (err as { response?: { status?: number } }).response?.status
        : undefined;
    const msg = err instanceof Error ? err.message : String(err);
    if (status === 404 || msg.includes("404") || msg.includes("Not Found")) {
      return c.json({ error: "文件不存在" }, 404);
    }
    return c.json({ error: "SCM 请求失败", detail: msg }, 502);
  }
});

export default sourceApi;
