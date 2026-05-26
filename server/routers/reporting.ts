import { z } from 'zod';
import { ownerProcedure, protectedProcedure, router } from '../_core/trpc';
import { generateReport } from '../reporting/export';
import { getDb } from '../db';
import { exportHistory, uploadedFiles } from '../../drizzle/schema';
import { desc, eq } from 'drizzle-orm';
import { storagePut } from '../storage';

/**
 * Reporting & File Storage Router
 * Handles report generation, export history, and file uploads
 */

async function persistExportRecord(result: any, reportType: string, format: string, userId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return;
  await db.insert(exportHistory).values({
    reportType,
    format,
    fileKey: result.fileKey,
    fileUrl: result.fileUrl,
    fileName: result.fileName,
    fileSize: result.fileSize || 0,
    generatedBy: userId,
    dateRangeStart: startDate,
    dateRangeEnd: endDate,
  });
}

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
    .mutation(async ({ ctx, input }) => {
      const result = await generateReport({
        startDate: input.startDate,
        endDate: input.endDate,
        format: 'excel',
        reportType: 'financial_summary',
      });
      await persistExportRecord(result, 'financial_summary', 'excel', ctx.user!.id, input.startDate, input.endDate);
      return result;
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
    .mutation(async ({ ctx, input }) => {
      const result = await generateReport({
        startDate: input.startDate,
        endDate: input.endDate,
        format: 'csv',
        reportType: 'order_profitability',
      });
      await persistExportRecord(result, 'order_profitability', 'csv', ctx.user!.id, input.startDate, input.endDate);
      return result;
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
    .mutation(async ({ ctx, input }) => {
      const result = await generateReport({
        startDate: input.startDate,
        endDate: input.endDate,
        format: 'excel',
        reportType: 'product_costs',
      });
      await persistExportRecord(result, 'product_costs', 'excel', ctx.user!.id, input.startDate, input.endDate);
      return result;
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
    .mutation(async ({ ctx, input }) => {
      const result = await generateReport({
        startDate: input.startDate,
        endDate: input.endDate,
        format: 'csv',
        reportType: 'cashflow',
      });
      await persistExportRecord(result, 'cashflow', 'csv', ctx.user!.id, input.startDate, input.endDate);
      return result;
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
    .mutation(async ({ ctx, input }) => {
      const result = await generateReport({
        startDate: input.startDate,
        endDate: input.endDate,
        format: 'excel',
        reportType: 'campaign_performance',
      });
      await persistExportRecord(result, 'campaign_performance', 'excel', ctx.user!.id, input.startDate, input.endDate);
      return result;
    }),

  /**
   * Get available report types catalog
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

  /**
   * Get export history (actual generated reports)
   */
  getExportHistory: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(exportHistory)
        .orderBy(desc(exportHistory.generatedAt))
        .limit(input?.limit || 20);
    }),

  /**
   * Upload a file (supplier invoices, receipts, etc.)
   */
  uploadFile: protectedProcedure
    .input(z.object({
      fileName: z.string(),
      mimeType: z.string(),
      fileData: z.string(), // base64 encoded
      relatedType: z.string().optional(), // 'supplier_invoice', 'receipt', 'product_image'
      relatedId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.fileData, 'base64');
      const fileKey = `uploads/${input.relatedType || 'general'}/${Date.now()}-${input.fileName}`;
      
      const { key, url } = await storagePut(fileKey, buffer, input.mimeType);
      
      const db = await getDb();
      if (!db) return { key, url, fileName: input.fileName };
      
      await db.insert(uploadedFiles).values({
        fileKey: key,
        fileUrl: url,
        fileName: input.fileName,
        mimeType: input.mimeType,
        fileSize: buffer.length,
        uploadedBy: ctx.user!.id,
        relatedType: input.relatedType,
        relatedId: input.relatedId,
      });
      
      return { key, url, fileName: input.fileName, fileSize: buffer.length };
    }),

  /**
   * Get a specific file by key (authenticated download)
   */
  getFile: protectedProcedure
    .input(z.object({ fileKey: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const files = await db.select().from(uploadedFiles)
        .where(eq(uploadedFiles.fileKey, input.fileKey))
        .limit(1);
      if (files.length === 0) return null;
      const file = files[0];
      // Auth check: only uploader or owner can access
      if (file.uploadedBy !== ctx.user!.id && ctx.user!.role !== 'owner') {
        return null;
      }
      return { fileUrl: file.fileUrl, fileName: file.fileName, mimeType: file.mimeType, fileSize: file.fileSize };
    }),

  /**
   * List uploaded files (with optional filtering by relatedType/relatedId)
   */
  listFiles: protectedProcedure
    .input(z.object({
      relatedType: z.string().optional(),
      relatedId: z.number().optional(),
      limit: z.number().default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      let conditions: any[] = [];
      if (input?.relatedType) {
        conditions.push(eq(uploadedFiles.relatedType, input.relatedType));
      }
      if (input?.relatedId) {
        conditions.push(eq(uploadedFiles.relatedId, input.relatedId));
      }
      
      if (conditions.length > 0) {
        const { and } = await import('drizzle-orm');
        return db.select().from(uploadedFiles)
          .where(and(...conditions))
          .orderBy(desc(uploadedFiles.createdAt))
          .limit(input?.limit || 50);
      }
      
      return db.select().from(uploadedFiles)
        .orderBy(desc(uploadedFiles.createdAt))
        .limit(input?.limit || 50);
    }),
});
