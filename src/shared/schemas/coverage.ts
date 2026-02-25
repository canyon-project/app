import { z } from "@hono/zod-openapi";

/** coverage 单条：需包含 s, f, b */
const CoverageEntrySchema = z.object({
  s: z.record(z.unknown()).optional(),
  f: z.record(z.unknown()).optional(),
  b: z.unknown().optional(),
  statementMap: z.unknown().optional(),
  fnMap: z.unknown().optional(),
  branchMap: z.unknown().optional(),
  contentHash: z.string().optional(),
  inputSourceMap: z.unknown().optional(),
  oldPath: z.string().optional(),
  path: z.string().optional(),
  sha: z.string().optional(),
  provider: z.string().optional(),
  repoID: z.string().optional(),
  instrumentCwd: z.string().optional(),
  buildTarget: z.string().optional(),
  buildHash: z.string().optional(),
});

/** coverage 数据结构：Record<filePath, entry> */
export const CoverageDataSchema = z.record(z.string(), CoverageEntrySchema);

/** POST /api/coverage/client 请求体 */
export const CoverageClientSchema = z
  .object({
    coverage: CoverageDataSchema,
    scene: z.record(z.unknown()).optional(),
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
    build: z.record(z.unknown()).optional(),
    coverage: CoverageDataSchema,
    diff: z.array(z.unknown()).optional(),
  })
  .openapi("CoverageMapInit");

export type CoverageClientInput = z.infer<typeof CoverageClientSchema>;
export type CoverageMapInitInput = z.infer<typeof CoverageMapInitSchema>;
