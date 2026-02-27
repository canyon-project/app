import { describe, expect, it } from "vitest";
import { CreateRepoSchema, UpdateRepoSchema } from "../repo";

describe("CreateRepoSchema", () => {
  it("应通过合法输入", () => {
    const result = CreateRepoSchema.safeParse({
      provider: "gitlab",
      pathWithNamespace: "owner/repo",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe("");
      expect(result.data.config).toBe("");
      expect(result.data.bu).toBe("");
    }
  });

  it("provider 为空应失败", () => {
    const result = CreateRepoSchema.safeParse({
      provider: "",
      pathWithNamespace: "owner/repo",
    });
    expect(result.success).toBe(false);
  });

  it("pathWithNamespace 为空应失败", () => {
    const result = CreateRepoSchema.safeParse({
      provider: "gitlab",
      pathWithNamespace: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("UpdateRepoSchema", () => {
  it("空对象应通过", () => {
    expect(UpdateRepoSchema.safeParse({}).success).toBe(true);
  });

  it("部分字段应通过", () => {
    const result = UpdateRepoSchema.safeParse({ description: "新描述" });
    expect(result.success).toBe(true);
  });
});
