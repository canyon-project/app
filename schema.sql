-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "canyon_app_user" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canyon_app_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canyon_app_repo" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "path_with_namespace" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "bu" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canyon_app_repo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canyon_app_commit" (
    "id" TEXT NOT NULL,
    "content" JSONB NOT NULL,

    CONSTRAINT "canyon_app_commit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canyon_app_merge_request" (
    "id" TEXT NOT NULL,
    "content" JSONB NOT NULL,

    CONSTRAINT "canyon_app_merge_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canyon_app_diff" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "repo_id" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "additions" INTEGER[],
    "deletions" INTEGER[],
    "subject" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,

    CONSTRAINT "canyon_app_diff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canyon_app_infra_config" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedOn" TIMESTAMP(3) NOT NULL,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedEnvFileValue" TEXT,

    CONSTRAINT "canyon_app_infra_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canyon_app_coverage" (
    "id" TEXT NOT NULL,
    "builds" JSONB NOT NULL,
    "build_hash" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "repo_id" TEXT NOT NULL,
    "sha" TEXT NOT NULL,
    "build_target" TEXT NOT NULL,
    "instrument_cwd" TEXT NOT NULL,
    "scene_key" TEXT NOT NULL,
    "scene" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canyon_app_coverage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canyon_app_coverage_map_relation" (
    "id" TEXT NOT NULL,
    "full_file_path" TEXT NOT NULL,
    "restore_full_file_path" TEXT NOT NULL,
    "build_hash" TEXT NOT NULL,
    "coverage_map_hash" TEXT NOT NULL,
    "source_map_hash" TEXT NOT NULL,
    "file_content_hash" TEXT NOT NULL,

    CONSTRAINT "canyon_app_coverage_map_relation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canyon_app_coverage_map" (
    "hash" TEXT NOT NULL,
    "map" BYTEA NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canyon_app_coverage_map_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "canyon_app_coverage_source_map" (
    "hash" TEXT NOT NULL,
    "source_map" BYTEA NOT NULL,

    CONSTRAINT "canyon_app_coverage_source_map_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "canyon_app_coverage_hit" (
    "id" TEXT NOT NULL,
    "build_hash" TEXT NOT NULL,
    "scene_key" TEXT NOT NULL,
    "raw_file_path" TEXT NOT NULL,
    "s" JSONB NOT NULL,
    "f" JSONB NOT NULL,
    "b" JSONB NOT NULL,
    "input_source_map" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canyon_app_coverage_hit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canyon_app_coverage_lock" (
    "coverage_id" TEXT NOT NULL,
    "locked_at" TIMESTAMP(3) NOT NULL,
    "locked_by" TEXT NOT NULL,

    CONSTRAINT "canyon_app_coverage_lock_pkey" PRIMARY KEY ("coverage_id")
);

