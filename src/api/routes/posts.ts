import { createRoute, z } from "@hono/zod-openapi";
import { OpenAPIHono } from "@hono/zod-openapi";
import { prisma } from "@/api/lib/prisma.ts";

const PostSchema = z
  .object({
    id: z.number(),
    title: z.string(),
    content: z.string().nullable(),
    published: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("Post");

const CreatePostSchema = z
  .object({
    title: z.string().min(1).openapi({ example: "我的第一篇文章" }),
    content: z.string().optional().openapi({ example: "文章内容..." }),
    published: z.boolean().optional().default(false),
  })
  .openapi("CreatePost");

const UpdatePostSchema = CreatePostSchema.partial().openapi("UpdatePost");

const IdParamSchema = z.object({
  id: z.string().regex(/^\d+$/).openapi({ param: { name: "id", in: "path" } }),
});

// 列表
const listRoute = createRoute({
  method: "get",
  path: "/",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(PostSchema),
        },
      },
      description: "文章列表",
    },
  },
});

// 详情
const getRoute = createRoute({
  method: "get",
  path: "/{id}",
  request: { params: IdParamSchema },
  responses: {
    200: {
      content: {
        "application/json": { schema: PostSchema },
      },
      description: "文章详情",
    },
    404: { description: "未找到" },
  },
});

// 创建
const createRouteDef = createRoute({
  method: "post",
  path: "/",
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreatePostSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": { schema: PostSchema },
      },
      description: "创建成功",
    },
  },
});

// 更新
const updateRoute = createRoute({
  method: "put",
  path: "/{id}",
  request: {
    params: IdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: UpdatePostSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": { schema: PostSchema },
      },
      description: "更新成功",
    },
    404: { description: "未找到" },
  },
});

// 删除
const deleteRoute = createRoute({
  method: "delete",
  path: "/{id}",
  request: { params: IdParamSchema },
  responses: {
    204: { description: "删除成功" },
    404: { description: "未找到" },
  },
});

const postsApi = new OpenAPIHono();

postsApi.openapi(listRoute, async (c) => {
  const posts = await prisma.post.findMany({
    orderBy: { id: "desc" },
  });
  return c.json(
    posts.map((p) => ({
      ...p,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  );
});

postsApi.openapi(getRoute, async (c) => {
  const { id } = c.req.valid("param");
  const post = await prisma.post.findUnique({
    where: { id: parseInt(id, 10) },
  });
  if (!post) {
    return c.json({ error: "Not found" }, 404);
  }
  return c.json({
    ...post,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

postsApi.openapi(createRouteDef, async (c) => {
  const body = c.req.valid("json");
  const post = await prisma.post.create({
    data: {
      title: body.title,
      content: body.content ?? "test",
      published: body.published ?? false,
      // createdAt: new Date(),
      // updatedAt: new Date(),
    },
  });
  return c.json(
    {
      ...post,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    201,
  );
});

postsApi.openapi(updateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  try {
    const post = await prisma.post.update({
      where: { id: parseInt(id, 10) },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.content !== undefined && { content: body.content }),
        ...(body.published !== undefined && { published: body.published }),
      },
    });
    return c.json({
      ...post,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch {
    return c.json({ error: "Not found" }, 404);
  }
});

postsApi.openapi(deleteRoute, async (c) => {
  const { id } = c.req.valid("param");
  try {
    await prisma.post.delete({
      where: { id: parseInt(id, 10) },
    });
    return c.body(null, 204);
  } catch {
    return c.json({ error: "Not found" }, 404);
  }
});

export default postsApi;
