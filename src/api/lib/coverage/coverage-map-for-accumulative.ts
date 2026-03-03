import { prisma } from "@/api/lib/prisma.ts";
import { createScmAdapter } from "@/api/scm/index.ts";
import { getInfra, InfraKey } from "@/api/lib/infra.ts";
import { decodeCompressedObject } from "@/api/lib/collect/helpers.ts";
import { addMaps, ensureNumMap, type NumMap } from "@/api/lib/collect/coverage-merge.util.ts";
import { testExclude } from "@/api/lib/coverage/test-exclude.ts";
import { remapCoverageByOld } from "canyon-map";

export interface CoverageMapForAccumulativeParams {
  provider: string;
  repoID: string;
  accumulativeID: string;
  buildTarget?: string;
  filePath?: string;
  scene?: string;
}

function buildSceneQueryCondition(scene?: string) {
  if (!scene) return undefined;
  try {
    const sceneObj = JSON.parse(scene);
    if (typeof sceneObj !== "object" || sceneObj === null || Array.isArray(sceneObj))
      return undefined;
    const entries = Object.entries(sceneObj);
    if (entries.length === 0) return undefined;
    if (entries.length === 1) {
      const [key, value] = entries[0];
      return { path: [key], equals: String(value) };
    }
    return { AND: entries.map(([key, value]) => ({ path: [key], equals: String(value) })) };
  } catch {
    return undefined;
  }
}

/**
 * 按 accumulative（commit1...commit2）查询累积覆盖率 map
 * 合并 from..to 之间所有 commit 的 hit 数据到 nowSha 的 map 上
 */
export async function getCoverageMapForAccumulative(
  params: CoverageMapForAccumulativeParams,
): Promise<
  | {
      success: true;
      baseCommit: string;
      comparisonResults: unknown[];
      coverage: Record<string, unknown>;
    }
  | { success: false; message: string }
> {
  const { provider, repoID, accumulativeID, buildTarget = "", filePath, scene } = params;

  const [afterSha, nowSha] = accumulativeID.split("...");
  if (!afterSha || !nowSha) {
    return { success: false, message: "accumulativeID 格式错误，应为 afterSha...nowSha" };
  }

  const diffWhere: { from: string; to: string; provider: string; repoID: string; path?: string } = {
    from: afterSha,
    to: nowSha,
    provider,
    repoID,
  };
  if (filePath) diffWhere.path = filePath;

  const diffList = await prisma.diff.findMany({
    where: diffWhere,
    select: { path: true, additions: true, deletions: true },
  });

  let scm = null;
  if (provider === "gitlab" || provider.startsWith("gitlab")) {
    const base = getInfra(InfraKey.GITLAB_BASE_URL);
    const token = getInfra(InfraKey.GITLAB_PRIVATE_TOKEN);
    if (base && token && token !== "-") scm = createScmAdapter({ type: "gitlab", base, token });
  } else if (provider === "github" || provider.startsWith("github")) {
    const token = getInfra(InfraKey.GITHUB_PRIVATE_TOKEN);
    if (token && token !== "-") scm = createScmAdapter({ type: "github", token });
  }
  if (!scm) return { success: false, message: "SCM 配置缺失" };

  const filteredCommits = await scm.getCommitsBetween(repoID, afterSha, nowSha);
  const nowShaIndex = filteredCommits.indexOf(nowSha);
  if (nowShaIndex === -1)
    return { success: false, message: "nowSha not found in filtered commits" };

  const nowShaCoverageWhere: Record<string, unknown> = {
    provider,
    repoID,
    sha: nowSha,
    buildTarget,
  };
  const sceneCondition = buildSceneQueryCondition(scene);
  if (sceneCondition) nowShaCoverageWhere.scene = sceneCondition;

  const nowShaCoverageRecords = await prisma.coverage.findMany({
    where: nowShaCoverageWhere as never,
  });
  if (nowShaCoverageRecords.length === 0) {
    return { success: false, message: "No coverage records found for nowSha" };
  }

  const nowShaCoverageRecord = nowShaCoverageRecords[0];
  const { instrumentCwd: nowShaInstrumentCwd, buildHash: nowShaBuildHash } = nowShaCoverageRecord;
  const nowShaInstrumentCwdPrefix = nowShaInstrumentCwd + "/";

  const nowShaMapRelations = await prisma.coverageMapRelation.findMany({
    where: {
      buildHash: nowShaBuildHash,
      fullFilePath: { in: diffList.map((d) => nowShaInstrumentCwdPrefix + d.path) },
    },
  });

  const nowShaCoverageMapHashKeySet = new Set<string>();
  const nowShaSourceMapHashSet = new Set<string>();
  for (const r of nowShaMapRelations) {
    nowShaCoverageMapHashKeySet.add(`${r.coverageMapHash}|${r.fileContentHash}`);
    if (r.sourceMapHash) nowShaSourceMapHashSet.add(r.sourceMapHash);
  }

  const [nowShaCoverageMaps, nowShaSourceMaps] = await Promise.all([
    prisma.coverageMap.findMany({
      where: { hash: { in: Array.from(nowShaCoverageMapHashKeySet) } },
    }),
    prisma.coverageSourceMap.findMany({
      where: { hash: { in: Array.from(nowShaSourceMapHashSet) } },
    }),
  ]);

  const nowShaCoverageMapIndex = new Map(nowShaCoverageMaps.map((m) => [m.hash, m]));
  const nowShaSourceMapIndex = new Map(nowShaSourceMaps.map((s) => [s.hash, s]));

  const nowShaFileCoverageMap = new Map<string, Record<string, unknown>>();
  for (const r of nowShaMapRelations) {
    const rawFilePath = r.restoreFullFilePath || r.fullFilePath;
    const normalizedPath = rawFilePath.startsWith(nowShaInstrumentCwdPrefix)
      ? rawFilePath.slice(nowShaInstrumentCwdPrefix.length)
      : rawFilePath;
    const sm = nowShaSourceMapIndex.get(r.sourceMapHash);
    const cm = nowShaCoverageMapIndex.get(`${r.coverageMapHash}|${r.fileContentHash}`);
    if (!cm) continue;
    const decoded = decodeCompressedObject(cm.map);
    if (!decoded || typeof decoded !== "object") continue;
    nowShaFileCoverageMap.set(normalizedPath, {
      path: rawFilePath,
      fileContentHash: r.fileContentHash,
      ...(decoded as Record<string, unknown>),
      inputSourceMap: sm ? decodeCompressedObject(sm.sourceMap) : undefined,
    });
  }

  const nowShaSceneKeys = new Set(nowShaCoverageRecords.map((r) => r.sceneKey));
  const nowShaCoverageHits = await prisma.coverageHit.findMany({
    where: {
      buildHash: nowShaBuildHash,
      ...(nowShaSceneKeys.size > 0 && { sceneKey: { in: Array.from(nowShaSceneKeys) } }),
    },
  });

  const nowShaHitDataByFile = new Map<string, { s: NumMap; f: NumMap }>();
  for (const h of nowShaCoverageHits) {
    const np = h.rawFilePath.startsWith(nowShaInstrumentCwdPrefix)
      ? h.rawFilePath.slice(nowShaInstrumentCwdPrefix.length)
      : h.rawFilePath;
    if (!nowShaHitDataByFile.has(np)) nowShaHitDataByFile.set(np, { s: {}, f: {} });
    const fd = nowShaHitDataByFile.get(np)!;
    fd.s = addMaps(fd.s, ensureNumMap(h.s as Record<string, unknown>));
    fd.f = addMaps(fd.f, ensureNumMap(h.f as Record<string, unknown>));
  }

  type CommitData = {
    hitDataByFile: Map<string, { s: NumMap; f: NumMap }>;
    fileCoverageMap: Map<string, Record<string, unknown>>;
  };
  const commitDataMap = new Map<string, CommitData>();
  const comparisonResults: unknown[] = [];

  for (const sha of filteredCommits) {
    if (sha === nowSha) continue;

    const covWhere: Record<string, unknown> = { provider, repoID, sha, buildTarget };
    if (sceneCondition) covWhere.scene = sceneCondition;
    const coverageRecords = await prisma.coverage.findMany({ where: covWhere as never });
    if (coverageRecords.length === 0) continue;

    const { instrumentCwd, buildHash } = coverageRecords[0];
    const prefix = instrumentCwd + "/";

    const mapRelations = await prisma.coverageMapRelation.findMany({
      where: {
        buildHash,
        fullFilePath: { in: diffList.map((d) => prefix + d.path) },
      },
    });

    const cmHashSet = new Set<string>();
    const smHashSet = new Set<string>();
    for (const r of mapRelations) {
      cmHashSet.add(`${r.coverageMapHash}|${r.fileContentHash}`);
      if (r.sourceMapHash) smHashSet.add(r.sourceMapHash);
    }

    const [coverageMaps, sourceMaps] = await Promise.all([
      prisma.coverageMap.findMany({ where: { hash: { in: Array.from(cmHashSet) } } }),
      prisma.coverageSourceMap.findMany({ where: { hash: { in: Array.from(smHashSet) } } }),
    ]);

    const cmIndex = new Map(coverageMaps.map((m) => [m.hash, m]));
    const smIndex = new Map(sourceMaps.map((s) => [s.hash, s]));

    const fileCoverageMap = new Map<string, Record<string, unknown>>();
    for (const r of mapRelations) {
      const raw = r.restoreFullFilePath || r.fullFilePath;
      const np = raw.startsWith(prefix) ? raw.slice(prefix.length) : raw;
      const sm = smIndex.get(r.sourceMapHash);
      const cm = cmIndex.get(`${r.coverageMapHash}|${r.fileContentHash}`);
      if (!cm) continue;
      const decoded = decodeCompressedObject(cm.map);
      if (!decoded || typeof decoded !== "object") continue;
      fileCoverageMap.set(np, {
        path: raw,
        fileContentHash: r.fileContentHash,
        ...(decoded as Record<string, unknown>),
        inputSourceMap: sm ? decodeCompressedObject(sm.sourceMap) : undefined,
      });
    }

    const sceneKeys = new Set(coverageRecords.map((r) => r.sceneKey));
    const hits = await prisma.coverageHit.findMany({
      where: {
        buildHash,
        ...(sceneKeys.size > 0 && { sceneKey: { in: Array.from(sceneKeys) } }),
      },
    });

    const hitDataByFile = new Map<string, { s: NumMap; f: NumMap }>();
    for (const h of hits) {
      const np = h.rawFilePath.startsWith(prefix)
        ? h.rawFilePath.slice(prefix.length)
        : h.rawFilePath;
      if (!hitDataByFile.has(np)) hitDataByFile.set(np, { s: {}, f: {} });
      const fd = hitDataByFile.get(np)!;
      fd.s = addMaps(fd.s, ensureNumMap(h.s as Record<string, unknown>));
      fd.f = addMaps(fd.f, ensureNumMap(h.f as Record<string, unknown>));
    }

    commitDataMap.set(sha, { hitDataByFile, fileCoverageMap });

    const fileComparisons: unknown[] = [];
    for (const [fp, nowShaFile] of nowShaFileCoverageMap.entries()) {
      const other = fileCoverageMap.get(fp);
      if (!other) {
        fileComparisons.push({ filePath: fp, status: "missing" });
        continue;
      }
      const hashEqual = nowShaFile.fileContentHash === other.fileContentHash;
      if (hashEqual) {
        fileComparisons.push({ filePath: fp, status: "fileContentHashEqual", canMerge: true });
        continue;
      }
      const nowStmt = (nowShaFile.statementMap as Record<string, { contentHash?: string }>) || {};
      const otherStmt = (other.statementMap as Record<string, { contentHash?: string }>) || {};
      const nowHashToIds = new Map<string, string[]>();
      const otherHashToIds = new Map<string, string[]>();
      for (const [id, st] of Object.entries(nowStmt)) {
        if (st?.contentHash) {
          if (!nowHashToIds.has(st.contentHash)) nowHashToIds.set(st.contentHash, []);
          nowHashToIds.get(st.contentHash)!.push(id);
        }
      }
      for (const [id, st] of Object.entries(otherStmt)) {
        if (st?.contentHash) {
          if (!otherHashToIds.has(st.contentHash)) otherHashToIds.set(st.contentHash, []);
          otherHashToIds.get(st.contentHash)!.push(id);
        }
      }
      const mergeable: Array<{
        contentHash: string;
        nowShaStatementId: string;
        otherStatementId: string;
      }> = [];
      for (const [ch, nowIds] of nowHashToIds.entries()) {
        const otherIds = otherHashToIds.get(ch) || [];
        if (nowIds.length === 1 && otherIds.length === 1) {
          mergeable.push({
            contentHash: ch,
            nowShaStatementId: nowIds[0],
            otherStatementId: otherIds[0],
          });
        }
      }
      fileComparisons.push({
        filePath: fp,
        status: "fileContentHashDifferent",
        canMerge: mergeable.length > 0,
        mergeableStatements: mergeable,
      });
    }
    comparisonResults.push({ commitSha: sha, fileComparisons });
  }

  const mergedCoverageData: Record<string, Record<string, unknown>> = {};
  for (const [fp, nowShaFile] of nowShaFileCoverageMap.entries()) {
    const hitData = nowShaHitDataByFile.get(fp);
    if (!hitData) continue;
    mergedCoverageData[fp] = {
      ...nowShaFile,
      s: { ...hitData.s },
      f: { ...hitData.f },
      b: {},
      branchMap: {},
    };
  }

  for (let i = 0; i < filteredCommits.length; i++) {
    const sha = filteredCommits[i];
    if (sha === nowSha) continue;
    const comp = comparisonResults.find((r: { commitSha?: string }) => r.commitSha === sha);
    const commitData = commitDataMap.get(sha);
    if (!comp || !commitData) continue;

    const fileComps = (comp as { fileComparisons?: unknown[] }).fileComparisons || [];
    for (const fc of fileComps) {
      const fp = (fc as { filePath?: string }).filePath;
      if (!fp) continue;
      const commitHit = commitData.hitDataByFile.get(fp);
      const merged = mergedCoverageData[fp];
      if (!commitHit || !merged) continue;

      const status = (fc as { status?: string }).status;
      const canMerge = (fc as { canMerge?: boolean }).canMerge;
      const mergeable = (
        fc as {
          mergeableStatements?: Array<{
            contentHash: string;
            nowShaStatementId: string;
            otherStatementId: string;
          }>;
        }
      ).mergeableStatements;

      if (status === "fileContentHashEqual") {
        merged.s = addMaps(merged.s as NumMap, commitHit.s);
        merged.f = addMaps(merged.f as NumMap, commitHit.f);
      } else if (status === "fileContentHashDifferent" && canMerge && mergeable?.length) {
        const otherFile = commitData.fileCoverageMap.get(fp);
        if (!otherFile) continue;
        const otherStmt =
          (otherFile.statementMap as Record<string, { contentHash?: string }>) || {};
        const otherIdToHash = new Map<string, string>();
        for (const [id, st] of Object.entries(otherStmt)) {
          if (st?.contentHash) otherIdToHash.set(id, st.contentHash);
        }
        const hashToNowId = new Map(mergeable.map((m) => [m.contentHash, m.nowShaStatementId]));
        for (const [otherId, count] of Object.entries(commitHit.s)) {
          const ch = otherIdToHash.get(otherId);
          const nowId = ch ? hashToNowId.get(ch) : undefined;
          if (nowId) {
            (merged.s as Record<string, number>)[nowId] =
              ((merged.s as Record<string, number>)[nowId] || 0) + count;
          }
        }
        const otherFn = (otherFile.fnMap as Record<string, { contentHash?: string }>) || {};
        const otherFnIdToHash = new Map<string, string>();
        for (const [id, fn] of Object.entries(otherFn)) {
          if (fn?.contentHash) otherFnIdToHash.set(id, fn.contentHash);
        }
        const nowFn = (merged.fnMap as Record<string, { contentHash?: string }>) || {};
        const fnHashToNowId = new Map<string, string>();
        for (const [nowId, fn] of Object.entries(nowFn)) {
          if (fn?.contentHash) {
            for (const [otherId, otherFnEntry] of Object.entries(otherFn)) {
              if ((otherFnEntry as { contentHash?: string })?.contentHash === fn.contentHash) {
                fnHashToNowId.set(fn.contentHash, nowId);
                break;
              }
            }
          }
        }
        for (const [otherId, count] of Object.entries(commitHit.f)) {
          const ch = otherFnIdToHash.get(otherId);
          const nowId = ch ? fnHashToNowId.get(ch) : undefined;
          if (nowId) {
            (merged.f as Record<string, number>)[nowId] =
              ((merged.f as Record<string, number>)[nowId] || 0) + count;
          }
        }
      }
    }
  }

  const remapped = await remapCoverageByOld(mergedCoverageData);
  const diffListMap = new Map(diffList.map((d) => [d.path, (d.additions as number[]) || []]));

  const normalizedCoverage: Record<string, Record<string, unknown>> = {};
  for (const [fp, fc] of Object.entries(
    remapped as Record<string, Record<string, unknown> & { path?: string }>,
  )) {
    const np = fp.startsWith(nowShaInstrumentCwdPrefix)
      ? fp.slice(nowShaInstrumentCwdPrefix.length)
      : fp;
    normalizedCoverage[np] = {
      ...fc,
      path: np,
      diff: { additions: diffListMap.get(np) || [] },
    };
  }

  const finalCoverage = testExclude(
    normalizedCoverage,
    JSON.stringify({ exclude: ["dist/**"] }),
  ) as Record<string, unknown>;

  return { success: true, baseCommit: nowSha, comparisonResults, coverage: finalCoverage };
}
