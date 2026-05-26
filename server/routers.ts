import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, ownerProcedure, router } from "./_core/trpc";
import { reportingRouter } from "./routers/reporting";
import { z } from "zod";
import { getDb } from "./db";
import {
  products, productCosts, productPricing, orders, orderLineItems, orderProfitability,
  cashflowTransactions, metaCampaigns, customers, suppliers, tasks, notes,
  capitalEntries, dailyExpenses, journalEntries, journalLines, chartOfAccounts,
  fulfillments, businessEvents, auditLog
} from "../drizzle/schema";
import { eq, desc, sql, and, gte, lte, count, sum } from "drizzle-orm";

export const appRouter = router({
  system: systemRouter,
  reporting: reportingRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============ DASHBOARD ============
  dashboard: router({
    getFinancialSummary: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        period: z.enum(["7d", "30d", "90d", "custom"]).default("30d"),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;

        const now = new Date();
        let startDate = new Date();
        const period = input?.period || "30d";
        if (period === "7d") startDate.setDate(now.getDate() - 7);
        else if (period === "30d") startDate.setDate(now.getDate() - 30);
        else if (period === "90d") startDate.setDate(now.getDate() - 90);
        else if (input?.startDate) startDate = new Date(input.startDate);

        const endDate = input?.endDate ? new Date(input.endDate) : now;

        // Revenue & Orders
        const orderStats = await db.select({
          totalRevenue: sum(orders.totalRevenue),
          orderCount: count(),
          avgOrderValue: sql<string>`AVG(CAST(${orders.totalRevenue} AS DECIMAL(12,2)))`,
        }).from(orders).where(
          and(gte(orders.orderDate, startDate), lte(orders.orderDate, endDate))
        );

        // Profitability
        const profitStats = await db.select({
          totalCost: sum(orderProfitability.totalCost),
          totalProfit: sum(orderProfitability.netProfit),
        }).from(orderProfitability);

        // Cashflow
        const cashflowIn = await db.select({
          total: sum(cashflowTransactions.amount),
        }).from(cashflowTransactions).where(
          and(
            eq(cashflowTransactions.transactionType, "incoming"),
            gte(cashflowTransactions.transactionDate, startDate),
            lte(cashflowTransactions.transactionDate, endDate)
          )
        );

        const cashflowOut = await db.select({
          total: sum(cashflowTransactions.amount),
        }).from(cashflowTransactions).where(
          and(
            eq(cashflowTransactions.transactionType, "outgoing"),
            gte(cashflowTransactions.transactionDate, startDate),
            lte(cashflowTransactions.transactionDate, endDate)
          )
        );

        // Ad Spend
        const adSpend = await db.select({
          totalSpend: sum(metaCampaigns.spend),
          totalConversions: sum(metaCampaigns.conversions),
        }).from(metaCampaigns);

        const revenue = Number(orderStats[0]?.totalRevenue || 0);
        const totalCost = Number(profitStats[0]?.totalCost || 0);
        const netProfit = Number(profitStats[0]?.totalProfit || 0);
        const grossProfit = revenue - totalCost * 0.6; // Approximate COGS
        const adSpendTotal = Number(adSpend[0]?.totalSpend || 0);
        const cashIn = Number(cashflowIn[0]?.total || 0);
        const cashOut = Number(cashflowOut[0]?.total || 0);

        return {
          revenue,
          netProfit,
          grossProfit,
          operatingExpenses: totalCost * 0.4,
          cashflow: cashIn - cashOut,
          cashIn,
          cashOut,
          returns: 0,
          adSpend: adSpendTotal,
          taxes: revenue * 0.14,
          orderCount: Number(orderStats[0]?.orderCount || 0),
          averageOrderValue: Number(orderStats[0]?.avgOrderValue || 0),
          roas: adSpendTotal > 0 ? revenue / adSpendTotal : 0,
          cac: Number(adSpend[0]?.totalConversions || 0) > 0
            ? adSpendTotal / Number(adSpend[0]?.totalConversions || 1) : 0,
          profitMargin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
        };
      }),
  }),

  // ============ PRODUCTS ============
  products: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(products).orderBy(desc(products.createdAt));
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(products).where(eq(products.id, input.id)).limit(1);
      return result[0] || null;
    }),
    create: protectedProcedure.input(z.object({
      sku: z.string(),
      name: z.string(),
      description: z.string().optional(),
      category: z.string().optional(),
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.insert(products).values(input);
      return { id: result[0].insertId };
    }),
    getCosts: protectedProcedure.input(z.object({ productId: z.number() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(productCosts)
        .where(eq(productCosts.productId, input.productId))
        .orderBy(desc(productCosts.effectiveDate)).limit(1);
      return result[0] || null;
    }),
    saveCosts: protectedProcedure.input(z.object({
      productId: z.number(),
      fabricCost: z.string().optional(),
      manufacturingCost: z.string().optional(),
      packagingCost: z.string().optional(),
      shippingCost: z.string().optional(),
      marketingCost: z.string().optional(),
      influencerCost: z.string().optional(),
      overheadAllocation: z.string().optional(),
      effectiveDate: z.string(),
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const totalCost = [
        input.fabricCost, input.manufacturingCost, input.packagingCost,
        input.shippingCost, input.marketingCost, input.influencerCost, input.overheadAllocation
      ].reduce((sum, v) => sum + Number(v || 0), 0);

      await db.insert(productCosts).values({
        productId: input.productId,
        fabricCost: input.fabricCost,
        manufacturingCost: input.manufacturingCost,
        packagingCost: input.packagingCost,
        shippingCost: input.shippingCost,
        marketingCost: input.marketingCost,
        influencerCost: input.influencerCost,
        overheadAllocation: input.overheadAllocation,
        totalCost: totalCost.toFixed(2),
        effectiveDate: new Date(input.effectiveDate),
      });
      return { success: true };
    }),
  }),

  // ============ ORDERS ============
  orders: router({
    list: protectedProcedure.input(z.object({
      limit: z.number().default(50),
      offset: z.number().default(0),
    }).optional()).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(orders)
        .orderBy(desc(orders.orderDate))
        .limit(input?.limit || 50)
        .offset(input?.offset || 0);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(orders).where(eq(orders.id, input.id)).limit(1);
      return result[0] || null;
    }),
    getProfitability: protectedProcedure.input(z.object({ orderId: z.number() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(orderProfitability)
        .where(eq(orderProfitability.orderId, input.orderId)).limit(1);
      return result[0] || null;
    }),
    listProfitability: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(orderProfitability).orderBy(desc(orderProfitability.createdAt));
    }),
  }),

  // ============ META ADS ============
  metaAds: router({
    getCampaigns: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(metaCampaigns).orderBy(desc(metaCampaigns.createdAt));
    }),
    getMetrics: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return null;
      const stats = await db.select({
        totalSpend: sum(metaCampaigns.spend),
        totalImpressions: sum(metaCampaigns.impressions),
        totalClicks: sum(metaCampaigns.clicks),
        totalConversions: sum(metaCampaigns.conversions),
        campaignCount: count(),
      }).from(metaCampaigns);
      const s = stats[0];
      const spend = Number(s?.totalSpend || 0);
      const clicks = Number(s?.totalClicks || 0);
      const impressions = Number(s?.totalImpressions || 0);
      const conversions = Number(s?.totalConversions || 0);
      return {
        totalSpend: spend,
        totalImpressions: impressions,
        totalClicks: clicks,
        totalConversions: conversions,
        avgCTR: impressions > 0 ? (clicks / impressions) * 100 : 0,
        avgCPM: impressions > 0 ? (spend / impressions) * 1000 : 0,
        avgCPC: clicks > 0 ? spend / clicks : 0,
        avgCAC: conversions > 0 ? spend / conversions : 0,
        campaignCount: Number(s?.campaignCount || 0),
      };
    }),
  }),

  // ============ CASHFLOW ============
  cashflow: router({
    list: protectedProcedure.input(z.object({
      type: z.enum(["incoming", "outgoing"]).optional(),
      limit: z.number().default(50),
    }).optional()).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      let query = db.select().from(cashflowTransactions).orderBy(desc(cashflowTransactions.transactionDate)).limit(input?.limit || 50);
      return query;
    }),
    add: protectedProcedure.input(z.object({
      transactionType: z.enum(["incoming", "outgoing"]),
      category: z.string(),
      description: z.string(),
      amount: z.string(),
      paymentMethod: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      await db.insert(cashflowTransactions).values({
        ...input,
        transactionDate: new Date(),
        status: "completed",
      });
      return { success: true };
    }),
    getSummary: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return null;
      const incoming = await db.select({ total: sum(cashflowTransactions.amount) })
        .from(cashflowTransactions).where(eq(cashflowTransactions.transactionType, "incoming"));
      const outgoing = await db.select({ total: sum(cashflowTransactions.amount) })
        .from(cashflowTransactions).where(eq(cashflowTransactions.transactionType, "outgoing"));
      return {
        totalIncoming: Number(incoming[0]?.total || 0),
        totalOutgoing: Number(outgoing[0]?.total || 0),
        netCashflow: Number(incoming[0]?.total || 0) - Number(outgoing[0]?.total || 0),
      };
    }),
  }),

  // ============ CUSTOMERS / CRM ============
  customers: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(customers).orderBy(desc(customers.createdAt));
    }),
    create: protectedProcedure.input(z.object({
      name: z.string(),
      email: z.string().optional(),
      phone: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      tags: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      await db.insert(customers).values(input);
      return { success: true };
    }),
  }),

  // ============ SUPPLIERS ============
  suppliers: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(suppliers).orderBy(desc(suppliers.createdAt));
    }),
    create: protectedProcedure.input(z.object({
      name: z.string(),
      contactPerson: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      address: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      await db.insert(suppliers).values(input);
      return { success: true };
    }),
  }),

  // ============ TASKS ============
  tasks: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(tasks).orderBy(desc(tasks.createdAt));
    }),
    create: protectedProcedure.input(z.object({
      title: z.string(),
      description: z.string().optional(),
      assignedTo: z.number().optional(),
      dueDate: z.string().optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      await db.insert(tasks).values({
        ...input,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        createdBy: ctx.user!.id,
      });
      return { success: true };
    }),
    updateStatus: protectedProcedure.input(z.object({
      id: z.number(),
      status: z.enum(["pending", "in_progress", "completed", "overdue"]),
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      await db.update(tasks).set({ status: input.status }).where(eq(tasks.id, input.id));
      return { success: true };
    }),
  }),

  // ============ NOTES ============
  notes: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(notes).orderBy(desc(notes.createdAt));
    }),
    create: protectedProcedure.input(z.object({
      content: z.string(),
      relatedType: z.string().optional(),
      relatedId: z.number().optional(),
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      await db.insert(notes).values({
        ...input,
        createdBy: ctx.user!.id,
      });
      return { success: true };
    }),
  }),

  // ============ CAPITAL & EXPENSES ============
  capital: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(capitalEntries).orderBy(desc(capitalEntries.createdAt));
    }),
    add: protectedProcedure.input(z.object({
      amount: z.string(),
      description: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      await db.insert(capitalEntries).values({
        ...input,
        entryDate: new Date(),
        createdBy: ctx.user!.id,
      });
      return { success: true };
    }),
    getTotal: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { total: 0 };
      const result = await db.select({ total: sum(capitalEntries.amount) }).from(capitalEntries);
      return { total: Number(result[0]?.total || 0) };
    }),
  }),

  expenses: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(dailyExpenses).orderBy(desc(dailyExpenses.createdAt));
    }),
    add: protectedProcedure.input(z.object({
      amount: z.string(),
      category: z.string(),
      description: z.string(),
      supplierId: z.number().optional(),
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      await db.insert(dailyExpenses).values({
        ...input,
        expenseDate: new Date(),
        createdBy: ctx.user!.id,
      });
      return { success: true };
    }),
    getByCategory: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const result = await db.select({
        category: dailyExpenses.category,
        total: sum(dailyExpenses.amount),
        count: count(),
      }).from(dailyExpenses).groupBy(dailyExpenses.category);
      return result;
    }),
  }),

  // ============ ACCOUNTING ============
  accounting: router({
    getChartOfAccounts: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(chartOfAccounts);
    }),
    getJournalEntries: protectedProcedure.input(z.object({
      limit: z.number().default(50),
    }).optional()).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(journalEntries)
        .orderBy(desc(journalEntries.entryDate))
        .limit(input?.limit || 50);
    }),
  }),

  // ============ AI INSIGHTS ============
  aiInsights: router({
    getInsights: protectedProcedure.query(async () => {
      const { runAnomalyDetection } = await import('./ai/anomaly-detection');
      const { generateCashflowForecast } = await import('./ai/cashflow-forecast');
      const { forecastProductInventory } = await import('./ai/inventory-forecast');
      const { generateAnomalyRecommendations } = await import('./ai/recommendation-engine');

      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Run anomaly detection
      let anomalies: any[] = [];
      try {
        anomalies = await runAnomalyDetection(thirtyDaysAgo, now);
      } catch (e) {
        console.error('[AI Insights] Anomaly detection error:', e);
      }

      // Run cashflow forecast with sample historical data
      let cashflowForecast = null;
      try {
        const db = await getDb();
        if (db) {
          const cashflowData = await db.select().from(cashflowTransactions).orderBy(desc(cashflowTransactions.transactionDate)).limit(30);
          const dailySales = cashflowData.filter(c => c.transactionType === 'incoming').map(c => Number(c.amount));
          const dailyAdSpend = cashflowData.filter(c => c.category === 'advertising').map(c => Number(c.amount));

          cashflowForecast = await generateCashflowForecast(
            dailySales.reduce((a, b) => a + b, 0), // current cash position
            {
              dailySales: dailySales.length > 0 ? dailySales : [5000, 6000, 4500, 7000, 5500],
              dailyAdSpend: dailyAdSpend.length > 0 ? dailyAdSpend : [1000, 1200, 800, 1500, 900],
              dailyCOGS: [2000, 2500, 1800, 3000, 2200],
              codCollections: [3000, 3500, 2800, 4000, 3200],
              monthlyPayroll: 25000,
              monthlyOperational: 15000,
            },
            30
          );
        }
      } catch (e) {
        console.error('[AI Insights] Cashflow forecast error:', e);
      }

      // Get inventory alerts from products below reorder point
      let inventoryAlerts: any[] = [];
      try {
        const db = await getDb();
        if (db) {
          const lowStock = await db.select().from(products)
            .where(sql`${products.stockQuantity} < ${products.reorderPoint}`);
          inventoryAlerts = lowStock.map(p => ({
            id: `inv_${p.id}`,
            type: 'stockout_risk',
            severity: p.stockQuantity === 0 ? 'critical' : p.stockQuantity < 5 ? 'high' : 'medium',
            productId: p.id,
            sku: p.sku,
            productName: p.name,
            title: `مخزون منخفض: ${p.name}`,
            description: `المخزون الحالي ${p.stockQuantity} وحدة - أقل من حد إعادة الطلب (${p.reorderPoint})`,
            recommendedAction: `إعادة طلب ${p.reorderPoint * 2} وحدة على الأقل`,
            financialImpact: 0,
            confidence: 0.9,
            detectedAt: new Date(),
          }));
        }
      } catch (e) {
        console.error('[AI Insights] Inventory alerts error:', e);
      }

      // Generate recommendations
      let recommendations: any[] = [];
      try {
        recommendations = generateAnomalyRecommendations(anomalies);
      } catch (e) {
        console.error('[AI Insights] Recommendations error:', e);
      }

      return {
        anomalies,
        cashflowForecast,
        inventoryAlerts,
        recommendations,
        generatedAt: new Date(),
      };
    }),
  }),

  // ============ NOTIFICATIONS ============
  notifications: router({
    getPreferences: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;
      const { notificationPreferences } = await import("../drizzle/schema");
      const result = await db.select().from(notificationPreferences)
        .where(eq(notificationPreferences.userId, ctx.user!.id)).limit(1);
      return result[0] || { lowInventory: true, negativeCashflow: true, highCostOrders: true, failedDelivery: true, dailySummary: true };
    }),
    savePreferences: protectedProcedure.input(z.object({
      lowInventory: z.boolean(),
      negativeCashflow: z.boolean(),
      highCostOrders: z.boolean(),
      failedDelivery: z.boolean(),
      dailySummary: z.boolean(),
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const { notificationPreferences } = await import("../drizzle/schema");
      // Upsert: try insert, on duplicate update
      await db.insert(notificationPreferences).values({
        userId: ctx.user!.id,
        ...input,
      }).onDuplicateKeyUpdate({
        set: input,
      });
      return { success: true };
    }),
    runChecks: ownerProcedure.mutation(async () => {
      const { runAllNotificationChecks } = await import("./notifications-worker");
      return await runAllNotificationChecks();
    }),
    getEvents: protectedProcedure.input(z.object({ limit: z.number().default(20) }).optional()).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(businessEvents).orderBy(desc(businessEvents.createdAt)).limit(input?.limit || 20);
    }),
  }),

  // ============ TEAM ============
  team: router({
    getMembers: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const { users: usersTable } = await import("../drizzle/schema");
      return db.select().from(usersTable);
    }),
  }),
});

export type AppRouter = typeof appRouter;
