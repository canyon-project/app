import { createRoute } from "@hono/zod-openapi";
import { OpenAPIHono } from "@hono/zod-openapi";
import { prisma } from "@/api/lib/prisma.ts";
import { getCoverageMapForCommit } from "@/api/lib/coverage/coverage-map-for-commit.ts";
import { getCommitsByRepoID } from "@/api/lib/coverage/commits.ts";
import {
  CoverageMapQuerySchema,
  CoverageCommitsQuerySchema,
} from "@/shared/schemas/coverage.ts";
import { genSummaryMapByCoverageMap } from "canyon-data";

const coverageMapGetRoute = createRoute({
  method: "get",
  path: "/map",
  request: { query: CoverageMapQuerySchema },
  responses: {
    200: { description: "覆盖率 map" },
    400: { description: "参数错误或 subject 非 commit" },
  },
});

const coverageSummaryMapRoute = createRoute({
  method: "get",
  path: "/summary/map",
  request: { query: CoverageMapQuerySchema },
  responses: {
    200: { description: "覆盖率 summary map" },
    400: { description: "参数错误或 subject 非 commit" },
  },
});

const coverageCommitsRoute = createRoute({
  method: "get",
  path: "/commits",
  request: { query: CoverageCommitsQuerySchema },
  responses: {
    200: { description: "commits 列表" },
  },
});

const coverageApi = new OpenAPIHono();

/** 解析 repoID：支持数字 ID、pathWithNamespace、provider:pathWithNamespace */
async function resolveRepoIDForCoverage(repoID: string): Promise<string> {
  const trimmed = repoID.trim();
  if (!trimmed) return trimmed;

  const coverages = await prisma.coverage.findMany({
    where: { repoID: trimmed },
    take: 1,
  });
  if (coverages.length > 0) return trimmed;

  if (trimmed.includes(":")) {
    const pathPart = trimmed.split(":").slice(1).join(":");
    const byPath = await prisma.coverage.findMany({
      where: { repoID: pathPart },
      take: 1,
    });
    if (byPath.length > 0) return pathPart;
  }

  const repo = await prisma.repo.findFirst({
    where: {
      OR: [
        { id: { contains: trimmed } },
        { pathWithNamespace: trimmed },
      ],
    },
  });
  if (repo) {
    const byPath = await prisma.coverage.findMany({
      where: { repoID: repo.pathWithNamespace },
      take: 1,
    });
    if (byPath.length > 0) return repo.pathWithNamespace;
    const byId = await prisma.coverage.findMany({
      where: { repoID: repo.id },
      take: 1,
    });
    if (byId.length > 0) return repo.id;
  }

  return trimmed;
}

coverageApi.openapi(coverageMapGetRoute, async (c) => {
  const q = c.req.valid("query");
  if (q.subject !== "commit") {
    return c.json({ success: false, message: "invalid subject" }, 400);
  }
  const result = await getCoverageMapForCommit({
    provider: q.provider,
    repoID: q.repoID,
    sha: q.subjectID,
    buildTarget: q.buildTarget ?? "",
    filePath: q.filePath,
    scene: q.scene,
  });
  if ("success" in result && result.success === false) {
    return c.json({ success: false, message: result.message }, 400);
  }
  return c.json(result);
});

coverageApi.openapi(coverageSummaryMapRoute, async (c) => {
  const q = c.req.valid("query");
  if (q.subject !== "commit") {
    return c.json({ success: false, message: "invalid subject" }, 400);
  }
  const map = await getCoverageMapForCommit({
    provider: q.provider,
    repoID: q.repoID,
    sha: q.subjectID,
    buildTarget: q.buildTarget ?? "",
    filePath: q.filePath,
    scene: q.scene,
  });
  if ("success" in map && map.success === false) {
    return c.json({ success: false, message: map.message }, 400);
  }
  const summary = genSummaryMapByCoverageMap(map as Record<string, unknown>, []);
  return c.json(summary);
});

coverageApi.openapi(coverageCommitsRoute, async (c) => {
  const { repoID, page, pageSize } = c.req.valid("query");
  const resolvedRepoID = await resolveRepoIDForCoverage(repoID);
  const commits = await getCommitsByRepoID(resolvedRepoID);
  const total = commits.length;
  const start = (page - 1) * pageSize;
  const data = commits.slice(start, start + pageSize);
  return c.json({ data, total });
});

export default coverageApi;
