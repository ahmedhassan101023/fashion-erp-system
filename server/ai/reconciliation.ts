/**
 * Data Reconciliation Engine
 * Validates data integrity across Shopify sync, Meta Ads sync, and accounting ledger.
 *
 * ERP Architect Skill: "Build reconciliation logic for order and inventory data."
 * Accounting Intelligence Skill: "Automated bookkeeping, normalizing data, removing duplicates,
 * and validating transactions."
 */

export interface ReconciliationIssue {
  severity: 'critical' | 'warning' | 'info';
  category: 'shopify' | 'meta_ads' | 'accounting' | 'inventory';
  code: string;
  message: string;
  affectedIds?: (number | string)[];
  suggestedAction: string;
}

export interface ReconciliationReport {
  runAt: Date;
  issues: ReconciliationIssue[];
  summary: {
    critical: number;
    warnings: number;
    info: number;
    total: number;
  };
  status: 'healthy' | 'needs_attention' | 'critical';
  score: number; // 0–100 data integrity score
}

export interface OrderReconciliationInput {
  dbOrders: Array<{
    id: number;
    shopifyOrderId: string | null;
    revenue: number;
    status: string;
    createdAt: Date;
  }>;
  shopifyOrders: Array<{
    id: string;
    totalPrice: number;
    financialStatus: string;
    createdAt: string;
  }>;
}

export interface AccountingReconciliationInput {
  journalEntries: Array<{
    id: number;
    totalDebits: number;
    totalCredits: number;
    referenceType: string;
    referenceId: number;
  }>;
  orders: Array<{ id: number; revenue: number; status: string }>;
}

export interface MetaAdsReconciliationInput {
  dbCampaigns: Array<{
    campaignId: string;
    spend: number;
    impressions: number;
    clicks: number;
    syncedAt: Date | null;
  }>;
  metaCampaigns: Array<{
    id: string;
    spend: number;
    impressions: number;
    clicks: number;
  }>;
}

/**
 * Reconcile orders between local DB and Shopify.
 */
export function reconcileOrders(input: OrderReconciliationInput): ReconciliationIssue[] {
  const issues: ReconciliationIssue[] = [];

  // Build lookup maps
  const shopifyMap = new Map(input.shopifyOrders.map(o => [o.id, o]));
  const dbShopifyIds = new Set(input.dbOrders.map(o => o.shopifyOrderId).filter(Boolean));

  // 1. Orders in DB but missing Shopify ID
  const orphanedOrders = input.dbOrders.filter(o => !o.shopifyOrderId);
  if (orphanedOrders.length > 0) {
    issues.push({
      severity: 'warning',
      category: 'shopify',
      code: 'ORDERS_MISSING_SHOPIFY_ID',
      message: `${orphanedOrders.length} طلب في قاعدة البيانات بدون معرّف Shopify`,
      affectedIds: orphanedOrders.map(o => o.id),
      suggestedAction: 'تحقق من مزامنة Shopify وأعد ربط الطلبات',
    });
  }

  // 2. Revenue discrepancies (> 1 EGP tolerance)
  const revenueDiscrepancies: number[] = [];
  for (const dbOrder of input.dbOrders) {
    if (!dbOrder.shopifyOrderId) continue;
    const shopifyOrder = shopifyMap.get(dbOrder.shopifyOrderId);
    if (!shopifyOrder) continue;
    if (Math.abs(dbOrder.revenue - shopifyOrder.totalPrice) > 1) {
      revenueDiscrepancies.push(dbOrder.id);
    }
  }
  if (revenueDiscrepancies.length > 0) {
    issues.push({
      severity: 'critical',
      category: 'shopify',
      code: 'REVENUE_MISMATCH',
      message: `${revenueDiscrepancies.length} طلب بتفاوت في الإيراد بين قاعدة البيانات و Shopify`,
      affectedIds: revenueDiscrepancies,
      suggestedAction: 'أعد مزامنة الطلبات المتأثرة من Shopify',
    });
  }

  // 3. Shopify orders not in DB (potential missed sync)
  const missedOrders = input.shopifyOrders.filter(o => !dbShopifyIds.has(o.id));
  if (missedOrders.length > 0) {
    issues.push({
      severity: 'warning',
      category: 'shopify',
      code: 'ORDERS_NOT_SYNCED',
      message: `${missedOrders.length} طلب من Shopify غير موجود في قاعدة البيانات`,
      affectedIds: missedOrders.map(o => o.id),
      suggestedAction: 'شغّل مزامنة Shopify الكاملة لاستيراد الطلبات الناقصة',
    });
  }

  return issues;
}

/**
 * Validate accounting ledger integrity (debits = credits for all journal entries).
 */
export function reconcileAccounting(input: AccountingReconciliationInput): ReconciliationIssue[] {
  const issues: ReconciliationIssue[] = [];

  // 1. Unbalanced journal entries
  const unbalanced = input.journalEntries.filter(je =>
    Math.abs(je.totalDebits - je.totalCredits) > 0.01
  );
  if (unbalanced.length > 0) {
    issues.push({
      severity: 'critical',
      category: 'accounting',
      code: 'UNBALANCED_JOURNAL_ENTRIES',
      message: `${unbalanced.length} قيد محاسبي غير متوازن (المدين ≠ الدائن)`,
      affectedIds: unbalanced.map(je => je.id),
      suggestedAction: 'راجع القيود المتأثرة وأعد الترحيل',
    });
  }

  // 2. Completed orders without journal entries
  const completedOrders = input.orders.filter(o =>
    ['paid', 'fulfilled', 'completed'].includes(o.status)
  );
  const ordersWithEntries = new Set(
    input.journalEntries
      .filter(je => je.referenceType === 'order')
      .map(je => je.referenceId)
  );
  const ordersWithoutEntries = completedOrders.filter(o => !ordersWithEntries.has(o.id));
  if (ordersWithoutEntries.length > 0) {
    issues.push({
      severity: 'warning',
      category: 'accounting',
      code: 'ORDERS_WITHOUT_JOURNAL_ENTRIES',
      message: `${ordersWithoutEntries.length} طلب مكتمل بدون قيود محاسبية`,
      affectedIds: ordersWithoutEntries.map(o => o.id),
      suggestedAction: 'أنشئ قيود المبيعات الناقصة لهذه الطلبات',
    });
  }

  return issues;
}

/**
 * Reconcile Meta Ads data between local DB and Meta API.
 */
export function reconcileMetaAds(input: MetaAdsReconciliationInput): ReconciliationIssue[] {
  const issues: ReconciliationIssue[] = [];

  const metaMap = new Map(input.metaCampaigns.map(c => [c.id, c]));

  // 1. Spend discrepancies > 10 EGP
  const spendDiscrepancies: string[] = [];
  for (const dbCampaign of input.dbCampaigns) {
    const metaCampaign = metaMap.get(dbCampaign.campaignId);
    if (!metaCampaign) continue;
    if (Math.abs(dbCampaign.spend - metaCampaign.spend) > 10) {
      spendDiscrepancies.push(dbCampaign.campaignId);
    }
  }
  if (spendDiscrepancies.length > 0) {
    issues.push({
      severity: 'warning',
      category: 'meta_ads',
      code: 'AD_SPEND_MISMATCH',
      message: `${spendDiscrepancies.length} حملة بتفاوت في الإنفاق بين قاعدة البيانات و Meta`,
      affectedIds: spendDiscrepancies,
      suggestedAction: 'أعد مزامنة بيانات Meta Ads لهذه الحملات',
    });
  }

  // 2. Stale sync (not synced in last 24 hours)
  const now = new Date();
  const staleCampaigns = input.dbCampaigns.filter(c => {
    if (!c.syncedAt) return true;
    const hoursSinceSync = (now.getTime() - c.syncedAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceSync > 24;
  });
  if (staleCampaigns.length > 0) {
    issues.push({
      severity: 'info',
      category: 'meta_ads',
      code: 'STALE_META_SYNC',
      message: `${staleCampaigns.length} حملة لم تتم مزامنتها خلال آخر 24 ساعة`,
      affectedIds: staleCampaigns.map(c => c.campaignId),
      suggestedAction: 'شغّل مزامنة Meta Ads',
    });
  }

  return issues;
}

/**
 * Run a full reconciliation across all data sources.
 */
export function runFullReconciliation(params: {
  orders?: OrderReconciliationInput;
  accounting?: AccountingReconciliationInput;
  metaAds?: MetaAdsReconciliationInput;
}): ReconciliationReport {
  const allIssues: ReconciliationIssue[] = [];

  if (params.orders) allIssues.push(...reconcileOrders(params.orders));
  if (params.accounting) allIssues.push(...reconcileAccounting(params.accounting));
  if (params.metaAds) allIssues.push(...reconcileMetaAds(params.metaAds));

  const critical = allIssues.filter(i => i.severity === 'critical').length;
  const warnings = allIssues.filter(i => i.severity === 'warning').length;
  const info = allIssues.filter(i => i.severity === 'info').length;

  // Score: start at 100, deduct for issues
  const score = Math.max(0, 100 - critical * 20 - warnings * 5 - info * 1);

  const status: ReconciliationReport['status'] =
    critical > 0 ? 'critical' :
    warnings > 0 ? 'needs_attention' : 'healthy';

  return {
    runAt: new Date(),
    issues: allIssues,
    summary: { critical, warnings, info, total: allIssues.length },
    status,
    score,
  };
}
