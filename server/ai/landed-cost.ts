/**
 * Landed Cost Engine
 * Calculates the TRUE total cost of a product including all upstream costs.
 *
 * Accounting Intelligence Skill: "Calculate Landed Cost for all SKUs and
 * attribute marketing spend to specific product margins."
 *
 * Landed Cost = Supplier Cost + Freight/Shipping In + Customs/Duties +
 *               Packaging + Quality Control + Storage + Overhead Allocation
 */

export interface LandedCostInput {
  productId: number;
  sku: string;
  productName: string;

  // Direct costs (per unit)
  supplierCost: number;          // Factory/wholesale price
  freightInPerUnit: number;      // Inbound shipping cost per unit
  customsDuties: number;         // Import duties per unit (if applicable)
  packagingCost: number;         // Box, tissue, stickers, etc.
  qualityControlCost: number;    // QC inspection cost per unit

  // Indirect costs (allocated)
  storageMonthlyTotal: number;   // Total monthly warehouse cost
  unitsInStorage: number;        // Units currently in storage
  overheadMonthlyTotal: number;  // Total monthly operational overhead
  totalMonthlyUnits: number;     // Total units sold/processed per month

  // Revenue & selling costs
  sellingPrice: number;          // Customer-facing price
  shippingOutPerOrder: number;   // Outbound shipping cost per order
  paymentGatewayRate: number;    // e.g. 0.025 = 2.5%
  returnRate: number;            // e.g. 0.05 = 5%
  returnProcessingCost: number;  // Cost to process each return

  // Marketing attribution
  adSpendMonthly: number;        // Monthly ad spend attributed to this SKU
  unitsSoldMonthly: number;      // Units sold per month
}

export interface LandedCostResult {
  productId: number;
  sku: string;
  productName: string;

  // Cost breakdown
  supplierCost: number;
  freightIn: number;
  customsDuties: number;
  packaging: number;
  qualityControl: number;
  storageAllocation: number;
  overheadAllocation: number;
  totalLandedCost: number;       // Sum of all above

  // Selling cost breakdown
  shippingOut: number;
  paymentGatewayFee: number;
  returnCostAllocation: number;
  cacPerUnit: number;            // Customer acquisition cost per unit

  // Profitability
  sellingPrice: number;
  totalCostPerUnit: number;      // Landed cost + selling costs + CAC
  grossProfit: number;           // Revenue - landed cost
  netProfit: number;             // Revenue - all costs
  grossMarginPercent: number;
  netMarginPercent: number;
  contributionMargin: number;    // Revenue - variable costs only
  breakEvenPrice: number;        // Minimum price to break even
  breakEvenRoas: number;         // Minimum ROAS to cover all costs

  // Classification
  profitabilityClass: 'star' | 'profitable' | 'marginal' | 'loss_leader' | 'unprofitable';
  recommendations: string[];
}

/**
 * Calculate the complete landed cost and profitability for a single SKU.
 */
export function calculateLandedCost(input: LandedCostInput): LandedCostResult {
  // --- Landed Cost (cost to get product to warehouse) ---
  const storageAllocation = input.unitsInStorage > 0
    ? input.storageMonthlyTotal / input.unitsInStorage
    : 0;
  const overheadAllocation = input.totalMonthlyUnits > 0
    ? input.overheadMonthlyTotal / input.totalMonthlyUnits
    : 0;

  const totalLandedCost =
    input.supplierCost +
    input.freightInPerUnit +
    input.customsDuties +
    input.packagingCost +
    input.qualityControlCost +
    storageAllocation +
    overheadAllocation;

  // --- Selling Costs (cost to sell and deliver) ---
  const paymentGatewayFee = input.sellingPrice * input.paymentGatewayRate;
  const returnCostAllocation = input.sellingPrice * input.returnRate * input.returnProcessingCost / input.sellingPrice;
  const cacPerUnit = input.unitsSoldMonthly > 0
    ? input.adSpendMonthly / input.unitsSoldMonthly
    : 0;

  const totalCostPerUnit =
    totalLandedCost +
    input.shippingOutPerOrder +
    paymentGatewayFee +
    returnCostAllocation +
    cacPerUnit;

  // --- Profitability ---
  const grossProfit = input.sellingPrice - totalLandedCost;
  const netProfit = input.sellingPrice - totalCostPerUnit;
  const grossMarginPercent = input.sellingPrice > 0 ? (grossProfit / input.sellingPrice) * 100 : 0;
  const netMarginPercent = input.sellingPrice > 0 ? (netProfit / input.sellingPrice) * 100 : 0;

  // Contribution margin = Revenue - variable costs (exclude fixed overhead)
  const variableCosts = input.supplierCost + input.freightInPerUnit + input.packagingCost +
    input.shippingOutPerOrder + paymentGatewayFee + returnCostAllocation + cacPerUnit;
  const contributionMargin = input.sellingPrice - variableCosts;

  // Break-even price
  const breakEvenPrice = totalCostPerUnit;

  // Break-even ROAS = Revenue / Ad Spend (minimum to cover all non-ad costs)
  const nonAdCosts = totalCostPerUnit - cacPerUnit;
  const breakEvenRoas = cacPerUnit > 0
    ? input.sellingPrice / (input.sellingPrice - nonAdCosts)
    : 0;

  // Classification
  let profitabilityClass: LandedCostResult['profitabilityClass'];
  if (netMarginPercent >= 30) profitabilityClass = 'star';
  else if (netMarginPercent >= 15) profitabilityClass = 'profitable';
  else if (netMarginPercent >= 5) profitabilityClass = 'marginal';
  else if (netMarginPercent >= 0) profitabilityClass = 'loss_leader';
  else profitabilityClass = 'unprofitable';

  // Recommendations
  const recommendations: string[] = [];

  if (profitabilityClass === 'unprofitable') {
    recommendations.push(`❌ المنتج خاسر - الخسارة ${Math.abs(netProfit).toFixed(2)} جنيه لكل وحدة`);
    recommendations.push(`💡 يجب رفع السعر إلى ${breakEvenPrice.toFixed(2)} جنيه على الأقل لتغطية التكاليف`);
  } else if (profitabilityClass === 'loss_leader') {
    recommendations.push(`⚠️ هامش ضعيف جداً (${netMarginPercent.toFixed(1)}%) - راجع التكاليف`);
  }

  if (cacPerUnit / input.sellingPrice > 0.3) {
    recommendations.push(`📢 تكلفة اكتساب العميل مرتفعة (${((cacPerUnit / input.sellingPrice) * 100).toFixed(1)}% من السعر) - حسّن كفاءة الإعلانات`);
  }

  if (input.freightInPerUnit / totalLandedCost > 0.2) {
    recommendations.push(`🚢 تكلفة الشحن الوارد مرتفعة (${((input.freightInPerUnit / totalLandedCost) * 100).toFixed(1)}% من التكلفة) - ابحث عن موردين محليين`);
  }

  if (grossMarginPercent >= 40 && netMarginPercent < 10) {
    recommendations.push(`💰 هامش إجمالي جيد لكن تكاليف البيع تأكل الربح - راجع CAC والشحن`);
  }

  if (profitabilityClass === 'star') {
    recommendations.push(`⭐ منتج مربح جداً (${netMarginPercent.toFixed(1)}%) - زد الاستثمار الإعلاني`);
  }

  return {
    productId: input.productId,
    sku: input.sku,
    productName: input.productName,
    supplierCost: input.supplierCost,
    freightIn: input.freightInPerUnit,
    customsDuties: input.customsDuties,
    packaging: input.packagingCost,
    qualityControl: input.qualityControlCost,
    storageAllocation,
    overheadAllocation,
    totalLandedCost,
    shippingOut: input.shippingOutPerOrder,
    paymentGatewayFee,
    returnCostAllocation,
    cacPerUnit,
    sellingPrice: input.sellingPrice,
    totalCostPerUnit,
    grossProfit,
    netProfit,
    grossMarginPercent,
    netMarginPercent,
    contributionMargin,
    breakEvenPrice,
    breakEvenRoas,
    profitabilityClass,
    recommendations,
  };
}

/**
 * Analyze a portfolio of SKUs and rank by profitability.
 */
export function analyzeSkuPortfolio(inputs: LandedCostInput[]): {
  results: LandedCostResult[];
  summary: {
    totalRevenue: number;
    totalNetProfit: number;
    avgNetMargin: number;
    starProducts: number;
    unprofitableProducts: number;
    topPerformer: LandedCostResult | null;
    worstPerformer: LandedCostResult | null;
  };
} {
  const results = inputs.map(calculateLandedCost)
    .sort((a, b) => b.netMarginPercent - a.netMarginPercent);

  const totalRevenue = results.reduce((s, r) => s + r.sellingPrice, 0);
  const totalNetProfit = results.reduce((s, r) => s + r.netProfit, 0);
  const avgNetMargin = results.length > 0
    ? results.reduce((s, r) => s + r.netMarginPercent, 0) / results.length
    : 0;

  return {
    results,
    summary: {
      totalRevenue,
      totalNetProfit,
      avgNetMargin,
      starProducts: results.filter(r => r.profitabilityClass === 'star').length,
      unprofitableProducts: results.filter(r => r.profitabilityClass === 'unprofitable').length,
      topPerformer: results[0] || null,
      worstPerformer: results[results.length - 1] || null,
    },
  };
}
