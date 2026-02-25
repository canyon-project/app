import { z } from "@hono/zod-openapi";

/** coverage 数据结构：Record<filePath, entry>，放宽校验避免 Zod v4 与 openapi 扩展兼容问题 */
const CoverageDataSchema = z.record(z.string(), z.any());

/** POST /api/coverage/client 请求体 */
export const CoverageClientSchema = z
  .object({
    coverage: CoverageDataSchema,
    scene: z.record(z.string(), z.any()).optional(),
  })
  .openapi("CoverageClient");

/** POST /api/coverage/map/init 请求体 */
export const CoverageMapInitSchema = z
  .object({
    sha: z.string().regex(/^[a-f0-9]{40}$/i).optional(),
    provider: z.string().optional(),
    repoID: z.string().optional(),
    instrumentCwd: z.string().optional(),
    buildTarget: z.string().optional(),
    build: z.record(z.string(), z.any()).optional(),
    coverage: CoverageDataSchema,
    diff: z.array(z.any()).optional(),
  })
  .openapi("CoverageMapInit");

export type CoverageClientInput = z.infer<typeof CoverageClientSchema>;
export type CoverageMapInitInput = z.infer<typeof CoverageMapInitSchema>;
