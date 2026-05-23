import { z } from "zod";
import { protectedProcedure, router, ownerProcedure, accountantProcedure, mediaBuyerProcedure, operationsProcedure } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import {
  createProduct,
  getProductBySku,
  getLatestProductCost,
  getLatestProductPricing,
  getOrderById,
  getOrdersByDateRange,
  getOrderProfitability,
  getMetaCampaigns,
  calculateCashPosition,
  getProfitableOrders,
} from "./queries";
import {
  calculateProductCost,
  calculateProductMargin,
  calculateOrderProfitability,
  recordOrderProfitability,
  calculateBreakEvenRoas,
  calculateActualRoas,
  calculateCAC,
  calculateCLV,
} from "./profitability";
import { postJournalEntry, createOrderSaleEntry, STANDARD_CHART_OF_ACCOUNTS } from "./accounting";
import { publishEvent, processEvents } from "./events";
import { reportingRouter } from "./routers/reporting";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: protectedProcedure.query(opts => opts.ctx.user),
    logout: protectedProcedure.mutation(({ ctx }) => {
      const cookieOptions = {
        secure: ctx.req.protocol === 'https',
        sameSite: 'none' as const,
        httpOnly: true,
        path: '/',
      };
      ctx.res.clearCookie('manus-session', { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============ PRODUCTS ============
  products: router({
    create: accountantProcedure
      .input(
        z.object({
          sku: z.string(),
          name: z.string(),
          description: z.string().optional(),
          category: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await createProduct({
          sku: input.sku,
          name: input.name,
          description: input.description,
          category: input.category,
          status: 'active',
        });
      }),

    getBySku: protectedProcedure
      .input(z.object({ sku: z.string() }))
      .query(async ({ input }) => {
        return await getProductBySku(input.sku);
      }),

    getCost: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input }) => {
        return await calculateProductCost(input.productId);
      }),

    getMargin: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input }) => {
        return await calculateProductMargin(input.productId);
      }),
  }),

  // ============ ORDERS ============
  orders: router({
    getById: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ input }) => {
        return await getOrderById(input.orderId);
      }),

    getByDateRange: protectedProcedure
      .input(
        z.object({
          startDate: z.date(),
          endDate: z.date(),
        })
      )
      .query(async ({ input }) => {
        return await getOrdersByDateRange(input.startDate, input.endDate);
      }),

    getProfitability: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ input }) => {
        return await getOrderProfitability(input.orderId);
      }),

    calculateProfitability: accountantProcedure
      .input(
        z.object({
          orderId: z.number(),
          customerAcquisitionCost: z.number().optional().default(0),
          operationalExpenseAllocation: z.number().optional().default(0),
        })
      )
      .mutation(async ({ input }) => {
        const analysis = await calculateOrderProfitability(
          input.orderId,
          input.customerAcquisitionCost,
          input.operationalExpenseAllocation
        );
        await recordOrderProfitability(
          input.orderId,
          input.customerAcquisitionCost,
          input.operationalExpenseAllocation
        );
        return analysis;
      }),

    getProfitableOrders: accountantProcedure
      .input(
        z.object({
          startDate: z.date(),
          endDate: z.date(),
        })
      )
      .query(async ({ input }) => {
        return await getProfitableOrders(input.startDate, input.endDate);
      }),
  }),

  // ============ FINANCIAL DASHBOARD ============
  dashboard: router({
    getFinancialSummary: accountantProcedure
      .input(
        z.object({
          startDate: z.date(),
          endDate: z.date(),
        })
      )
      .query(async ({ input }) => {
        const orders = await getOrdersByDateRange(input.startDate, input.endDate);
        const cashPosition = await calculateCashPosition(input.endDate);

        let totalRevenue = 0;
        let totalCost = 0;
        let totalOrders = 0;

        for (const order of orders) {
          totalRevenue += parseFloat(order.totalRevenue as any) || 0;
          totalOrders++;

          const profitability = await getOrderProfitability(order.id);
          if (profitability) {
            totalCost += parseFloat(profitability.totalCost as any) || 0;
          }
        }

        const netProfit = totalRevenue - totalCost;
        const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

        return {
          period: { startDate: input.startDate, endDate: input.endDate },
          revenue: totalRevenue,
          cost: totalCost,
          netProfit,
          profitMargin,
          orderCount: totalOrders,
          averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
          cashPosition,
        };
      }),

    getCashflowProjection: accountantProcedure
      .input(z.object({ daysAhead: z.number().default(30) }))
      .query(async ({ input }) => {
        // Placeholder for cashflow projection logic
        return {
          projectionDays: input.daysAhead,
          projectedBalance: 0,
          message: 'Cashflow projection feature coming soon',
        };
      }),
  }),

  // ============ META ADS ============
  metaAds: router({
    getCampaigns: mediaBuyerProcedure
      .input(
        z.object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
      )
      .query(async ({ input }) => {
        return await getMetaCampaigns(input.startDate, input.endDate);
      }),

    calculateCampaignRoas: mediaBuyerProcedure
      .input(
        z.object({
          revenue: z.number(),
          adSpend: z.number(),
        })
      )
      .query(({ input }) => {
        return {
          roas: calculateActualRoas(input.revenue, input.adSpend),
          revenue: input.revenue,
          adSpend: input.adSpend,
        };
      }),

    calculateCAC: mediaBuyerProcedure
      .input(
        z.object({
          totalMarketingSpend: z.number(),
          newCustomers: z.number(),
        })
      )
      .query(({ input }) => {
        return {
          cac: calculateCAC(input.totalMarketingSpend, input.newCustomers),
          totalMarketingSpend: input.totalMarketingSpend,
          newCustomers: input.newCustomers,
        };
      }),
  }),

  // ============ ACCOUNTING ============
  accounting: router({
    getChartOfAccounts: accountantProcedure.query(async () => {
      return STANDARD_CHART_OF_ACCOUNTS;
    }),

    postJournalEntry: accountantProcedure
      .input(
        z.object({
          entryDate: z.date(),
          description: z.string(),
          referenceType: z.string(),
          referenceId: z.number(),
          lines: z.array(
            z.object({
              accountCode: z.string(),
              debitAmount: z.number().optional(),
              creditAmount: z.number().optional(),
            })
          ),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await postJournalEntry({
          entryDate: input.entryDate,
          description: input.description,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          lines: input.lines,
          createdBy: ctx.user.id,
        });
      }),
  }),

  // ============ EVENTS & NOTIFICATIONS ============
  events: router({
    publish: ownerProcedure
      .input(
        z.object({
          eventType: z.string(),
          severity: z.enum(['info', 'warning', 'critical']),
          title: z.string(),
          description: z.string(),
          relatedOrderId: z.number().optional(),
          relatedProductId: z.number().optional(),
          metadata: z.record(z.string(), z.any()).optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await publishEvent({
          eventType: input.eventType as any,
          severity: input.severity,
          title: input.title,
          description: input.description,
          relatedOrderId: input.relatedOrderId,
          relatedProductId: input.relatedProductId,
          metadata: input.metadata,
        });
      }),

    processAll: ownerProcedure.mutation(async () => {
      await processEvents();
      return { success: true };
    }),
  }),

  reporting: reportingRouter,
});

export type AppRouter = typeof appRouter;
