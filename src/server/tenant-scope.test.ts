import { describe, expect, it } from "vitest";
import { tenantScopedQuery } from "./tenant-scope";

describe("tenantScopedQuery", () => {
  it("adds tenant ownership to tenant-owned queries", () => {
    expect(tenantScopedQuery("tenant-a", { status: "active" })).toEqual({
      status: "active",
      tenantId: "tenant-a",
    });
  });

  it("does not allow callers to override tenant ownership", () => {
    expect(
      tenantScopedQuery("tenant-a", {
        tenantId: "tenant-b",
        status: "active",
      }),
    ).toEqual({
      status: "active",
      tenantId: "tenant-a",
    });
  });

  it("requires an explicit tenant id", () => {
    expect(() => tenantScopedQuery("", { status: "active" })).toThrow(
      "tenantId is required",
    );
  });
});
