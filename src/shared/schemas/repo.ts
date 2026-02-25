import { z } from "@hono/zod-openapi";

/** Repo 响应 schema，前后端共享 */
export const RepoSchema = z
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

/** 创建 Repo 请求 schema */
export const CreateRepoSchema = z
  .object({
    provider: z.string().min(1).openapi({ example: "gitlab" }),
    pathWithNamespace: z.string().min(1).openapi({ example: "owner/repo" }),
    description: z.string().optional().default(""),
    config: z.string().optional().default(""),
    bu: z.string().optional().default(""),
  })
  .openapi("CreateRepo");

/** 更新 Repo 请求 schema */
export const UpdateRepoSchema = z
  .object({
    description: z.string().optional(),
    config: z.string().optional(),
    bu: z.string().optional(),
  })
  .openapi("UpdateRepo");

/** 从 schema 推导的 TypeScript 类型 */
export type Repo = z.infer<typeof RepoSchema>;
export type CreateRepoInput = z.infer<typeof CreateRepoSchema>;
export type UpdateRepoInput = z.infer<typeof UpdateRepoSchema>;
