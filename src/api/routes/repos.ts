import { createRoute, z } from "@hono/zod-openapi";
import { OpenAPIHono } from "@hono/zod-openapi";
import { prisma } from "@/api/lib/prisma.ts";

const RepoSchema = z
  .object({
    id: z.string(),
    provider: z.string(),
    pathWithNamespace: z.string(),
    description: z.string(),
    config: z.string(),
    bu: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("Repo");

const CreateRepoSchema = z
  .object({
    provider: z.string().min(1).openapi({ example: "gitlab" }),
    pathWithNamespace: z.string().min(1).openapi({ example: "owner/repo" }),
    description: z.string().optional().default(""),
    config: z.string().optional().default(""),
    bu: z.string().optional().default(""),
  })
  .openapi("CreateRepo");

const UpdateRepoSchema = z
  .object({
    description: z.string().optional(),
    config: z.string().optional(),
    bu: z.string().optional(),
  })
  .openapi("UpdateRepo");

const IdParamSchema = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});

const listRoute = createRoute({
  method: "get",
  path: "/",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(RepoSchema),
        },
      },
      description: "仓库列表",
    },
  },
});

const getRoute = createRoute({
  method: "get",
  path: "/{id}",
  request: { params: IdParamSchema },
  responses: {
    200: {
      content: {
        "application/json": { schema: RepoSchema },
      },
      description: "仓库详情",
    },
    404: { description: "未找到" },
  },
});

const createRouteDef = createRoute({
  method: "post",
  path: "/",
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateRepoSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": { schema: RepoSchema },
      },
      description: "创建成功",
    },
  },
});

const updateRoute = createRoute({
  method: "put",
  path: "/{id}",
  request: {
    params: IdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: UpdateRepoSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": { schema: RepoSchema },
      },
      description: "更新成功",
    },
    404: { description: "未找到" },
  },
});

const deleteRoute = createRoute({
  method: "delete",
  path: "/{id}",
  request: { params: IdParamSchema },
  responses: {
    204: { description: "删除成功" },
    404: { description: "未找到" },
  },
});

const reposApi = new OpenAPIHono();

const toResponse = (r: { id: string; provider: string; pathWithNamespace: string; description: string; config: string; bu: string; createdAt: Date; updatedAt: Date }) => ({
  ...r,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

reposApi.openapi(listRoute, async (c) => {
  const repos = await prisma.repo.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return c.json(repos.map(toResponse));
});

reposApi.openapi(getRoute, async (c) => {
  const { id } = c.req.valid("param");
  const repo = await prisma.repo.findUnique({
    where: { id },
  });
  if (!repo) {
    return c.json({ error: "Not found" }, 404);
  }
  return c.json(toResponse(repo));
});

reposApi.openapi(createRouteDef, async (c) => {
  const body = c.req.valid("json");
  const id = `${body.provider}:${body.pathWithNamespace}`;
  const now = new Date();
  const repo = await prisma.repo.create({
    data: {
      id,
      provider: body.provider,
      pathWithNamespace: body.pathWithNamespace,
      description: body.description ?? "",
      config: body.config ?? "",
      bu: body.bu ?? "",
      createdAt: now,
      updatedAt: now,
    },
  });
  return c.json(toResponse(repo), 201);
});

reposApi.openapi(updateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  try {
    const repo = await prisma.repo.update({
      where: { id },
      data: {
        ...(body.description !== undefined && { description: body.description }),
        ...(body.config !== undefined && { config: body.config }),
        ...(body.bu !== undefined && { bu: body.bu }),
        updatedAt: new Date(),
      },
    });
    return c.json(toResponse(repo));
  } catch {
    return c.json({ error: "Not found" }, 404);
  }
});

reposApi.openapi(deleteRoute, async (c) => {
  const { id } = c.req.valid("param");
  try {
    await prisma.repo.delete({
      where: { id },
    });
    return c.body(null, 204);
  } catch {
    return c.json({ error: "Not found" }, 404);
  }
});

export default reposApi;
