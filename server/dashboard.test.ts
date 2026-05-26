import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAuthenticatedContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-owner",
      email: "admin@erp.com",
      name: "Test Owner",
      loginMethod: "manus",
      role: "owner",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createUnauthenticatedContext(): TrpcContext {
  return {
    user: null as any,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("dashboard.getFinancialSummary", () => {
  it("returns financial summary for authenticated user", async () => {
    const ctx = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.getFinancialSummary({
      period: "30d",
    });

    expect(result).toHaveProperty("revenue");
    expect(result).toHaveProperty("netProfit");
    expect(result).toHaveProperty("grossProfit");
    expect(result).toHaveProperty("operatingExpenses");
    expect(result).toHaveProperty("cashflow");
    expect(result).toHaveProperty("adSpend");
    expect(result).toHaveProperty("orderCount");
    expect(result).toHaveProperty("averageOrderValue");
    expect(result).toHaveProperty("roas");
    expect(result).toHaveProperty("profitMargin");
    expect(typeof result!.revenue).toBe("number");
    expect(typeof result!.netProfit).toBe("number");
  });

  it("rejects unauthenticated requests", async () => {
    const ctx = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.dashboard.getFinancialSummary({ period: "30d" })
    ).rejects.toThrow();
  });
});

describe("metaAds.getCampaigns", () => {
  it("returns campaigns list for authenticated user", async () => {
    const ctx = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.metaAds.getCampaigns();

    expect(Array.isArray(result)).toBe(true);
  });

  it("rejects unauthenticated requests", async () => {
    const ctx = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.metaAds.getCampaigns()).rejects.toThrow();
  });
});

describe("auth.me", () => {
  it("returns user data for authenticated user", async () => {
    const ctx = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();

    expect(result).not.toBeNull();
    expect(result?.name).toBe("Test Owner");
    expect(result?.role).toBe("owner");
  });

  it("returns null for unauthenticated user", async () => {
    const ctx = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();
    expect(result).toBeFalsy();
  });
});
