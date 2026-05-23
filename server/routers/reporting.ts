import { z } from 'zod';
import { ownerProcedure, router } from '../_core/trpc';
import { generateReport } from '../reporting/export';

/**
 * Reporting Router
 * Handles all report generation and export requests
 */

export const reportingRouter = router({
  /**
   * Generate financial summary report (Excel)
   */
  generateFinancialSummary: ownerProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .mutation(async ({ input }) => {
      return await generateReport({
        startDate: input.startDate,
        endDate: input.endDate,
        format: 'excel',
        reportType: 'financial_summary',
      });
    }),

  /**
   * Generate order profitability report (CSV)
   */
  generateOrderProfitability: ownerProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .mutation(async ({ input }) => {
      return await generateReport({
        startDate: input.startDate,
        endDate: input.endDate,
        format: 'csv',
        reportType: 'order_profitability',
      });
    }),

  /**
   * Generate product costs report (Excel)
   */
  generateProductCosts: ownerProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .mutation(async ({ input }) => {
      return await generateReport({
        startDate: input.startDate,
        endDate: input.endDate,
        format: 'excel',
        reportType: 'product_costs',
      });
    }),

  /**
   * Generate cashflow report (CSV)
   */
  generateCashflow: ownerProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .mutation(async ({ input }) => {
      return await generateReport({
        startDate: input.startDate,
        endDate: input.endDate,
        format: 'csv',
        reportType: 'cashflow',
      });
    }),

  /**
   * Generate campaign performance report (Excel)
   */
  generateCampaignPerformance: ownerProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .mutation(async ({ input }) => {
      return await generateReport({
        startDate: input.startDate,
        endDate: input.endDate,
        format: 'excel',
        reportType: 'campaign_performance',
      });
    }),

  /**
   * Get all available reports
   */
  listReports: ownerProcedure.query(async () => {
    return [
      {
        id: 'financial_summary',
        name: 'ملخص مالي',
        description: 'ملخص شامل للإيرادات والأرباح والمصروفات',
        format: 'excel',
        icon: 'BarChart3',
      },
      {
        id: 'order_profitability',
        name: 'ربحية الطلبات',
        description: 'تحليل ربحية كل طلب مع تفاصيل التكاليف',
        format: 'csv',
        icon: 'ShoppingCart',
      },
      {
        id: 'product_costs',
        name: 'تكاليف المنتجات',
        description: 'تفاصيل تكاليف المنتجات والهوامش',
        format: 'excel',
        icon: 'Package',
      },
      {
        id: 'cashflow',
        name: 'التدفق النقدي',
        description: 'تتبع التدفقات النقدية الداخلة والخارجة',
        format: 'csv',
        icon: 'TrendingUp',
      },
      {
        id: 'campaign_performance',
        name: 'أداء الحملات',
        description: 'أداء حملات Meta Ads مع ROAS و CAC',
        format: 'excel',
        icon: 'Megaphone',
      },
    ];
  }),
});
