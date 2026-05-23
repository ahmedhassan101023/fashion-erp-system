import {
  getLatestProductCost,
  getLatestProductPricing,
  getOrderLineItems,
  createOrderProfitability,
  getOrderById,
} from "./queries";
import { InsertOrderProfitability } from "../drizzle/schema";

/**
 * Product Cost & Order Profitability Engine
 * Calculates true product costs, margins, and order-level profitability
 */

export interface ProductCostBreakdown {
  fabricCost: number;
  manufacturingCost: number;
  packagingCost: number;
  shippingCost: number;
  marketingCost: number;
  influencerCost: number;
  overheadAllocation: number;
  totalCost: number;
}

export interface ProductMarginAnalysis {
  sellingPrice: number;
  costPrice: number;
  contributionMargin: number;
  profitMarginPercent: number;
  breakEvenRoas: number;
}

export interface OrderProfitabilityAnalysis {
  orderId: number;
  revenue: number;
  productCost: number;
  shippingCost: number;
  packagingCost: number;
  gatewayFee: number;
  operationalExpenseAllocation: number;
  customerAcquisitionCost: number;
  totalCost: number;
  netProfit: number;
  profitMarginPercent: number;
  profitabilityStatus: 'profitable' | 'break_even' | 'losing';
}

/**
 * Calculates the total cost for a product based on latest cost data
 */
export async function calculateProductCost(productId: number): Promise<ProductCostBreakdown> {
  const costData = await getLatestProductCost(productId);

  if (!costData) {
    return {
      fabricCost: 0,
      manufacturingCost: 0,
      packagingCost: 0,
      shippingCost: 0,
      marketingCost: 0,
      influencerCost: 0,
      overheadAllocation: 0,
      totalCost: 0,
    };
  }

  const fabricCost = parseFloat(costData.fabricCost as any) || 0;
  const manufacturingCost = parseFloat(costData.manufacturingCost as any) || 0;
  const packagingCost = parseFloat(costData.packagingCost as any) || 0;
  const shippingCost = parseFloat(costData.shippingCost as any) || 0;
  const marketingCost = parseFloat(costData.marketingCost as any) || 0;
  const influencerCost = parseFloat(costData.influencerCost as any) || 0;
  const overheadAllocation = parseFloat(costData.overheadAllocation as any) || 0;

  const totalCost =
    fabricCost +
    manufacturingCost +
    packagingCost +
    shippingCost +
    marketingCost +
    influencerCost +
    overheadAllocation;

  return {
    fabricCost,
    manufacturingCost,
    packagingCost,
    shippingCost,
    marketingCost,
    influencerCost,
    overheadAllocation,
    totalCost,
  };
}

/**
 * Calculates product margin analysis based on latest pricing
 */
export async function calculateProductMargin(productId: number): Promise<ProductMarginAnalysis> {
  const pricingData = await getLatestProductPricing(productId);
  const costData = await getLatestProductCost(productId);

  if (!pricingData) {
    return {
      sellingPrice: 0,
      costPrice: 0,
      contributionMargin: 0,
      profitMarginPercent: 0,
      breakEvenRoas: 0,
    };
  }

  const sellingPrice = parseFloat(pricingData.sellingPrice as any) || 0;
  const costPrice = parseFloat(pricingData.costPrice as any) || 0;
  const contributionMargin = sellingPrice - costPrice;
  const profitMarginPercent = sellingPrice > 0 ? (contributionMargin / sellingPrice) * 100 : 0;
  const breakEvenRoas = contributionMargin > 0 ? costPrice / contributionMargin : 0;

  return {
    sellingPrice,
    costPrice,
    contributionMargin,
    profitMarginPercent,
    breakEvenRoas,
  };
}

/**
 * Calculates complete order profitability analysis
 * Includes all costs: product, shipping, packaging, gateway fees, operational expenses, and CAC
 */
export async function calculateOrderProfitability(
  orderId: number,
  customerAcquisitionCost: number = 0,
  operationalExpenseAllocation: number = 0
): Promise<OrderProfitabilityAnalysis> {
  const order = await getOrderById(orderId);
  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  const lineItems = await getOrderLineItems(orderId);

  // Calculate product cost from line items
  let productCost = 0;
  for (const item of lineItems) {
    const costData = await getLatestProductCost(item.productId);
    if (costData) {
      const itemCost = (parseFloat(costData.totalCost as any) || 0) * item.quantity;
      productCost += itemCost;
    }
  }

  const revenue = parseFloat(order.totalRevenue as any) || 0;
  const shippingCost = parseFloat(order.shippingCost as any) || 0;
  const gatewayFee = parseFloat(order.gatewayFee as any) || 0;

  // Estimate packaging cost (typically 2-5% of revenue, defaulting to 3%)
  const packagingCost = revenue * 0.03;

  const totalCost =
    productCost + shippingCost + packagingCost + gatewayFee + operationalExpenseAllocation + customerAcquisitionCost;

  const netProfit = revenue - totalCost;
  const profitMarginPercent = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  // Determine profitability status
  let profitabilityStatus: 'profitable' | 'break_even' | 'losing' = 'break_even';
  if (netProfit > 0.01) {
    profitabilityStatus = 'profitable';
  } else if (netProfit < -0.01) {
    profitabilityStatus = 'losing';
  }

  return {
    orderId,
    revenue,
    productCost,
    shippingCost,
    packagingCost,
    gatewayFee,
    operationalExpenseAllocation,
    customerAcquisitionCost,
    totalCost,
    netProfit,
    profitMarginPercent,
    profitabilityStatus,
  };
}

/**
 * Creates and stores order profitability record
 */
export async function recordOrderProfitability(
  orderId: number,
  customerAcquisitionCost: number = 0,
  operationalExpenseAllocation: number = 0
) {
  const analysis = await calculateOrderProfitability(
    orderId,
    customerAcquisitionCost,
    operationalExpenseAllocation
  );

  const data: InsertOrderProfitability = {
    orderId,
    revenue: String(analysis.revenue),
    productCost: String(analysis.productCost),
    shippingCost: String(analysis.shippingCost),
    packagingCost: String(analysis.packagingCost),
    gatewayFee: String(analysis.gatewayFee),
    operationalExpenseAllocation: String(analysis.operationalExpenseAllocation),
    customerAcquisitionCost: String(analysis.customerAcquisitionCost),
    totalCost: String(analysis.totalCost),
    netProfit: String(analysis.netProfit),
    profitabilityStatus: analysis.profitabilityStatus,
  };

  return await createOrderProfitability(data);
}

/**
 * Calculates break-even ROAS for a product
 * Break-even ROAS = Total Cost / Contribution Margin
 */
export function calculateBreakEvenRoas(contributionMargin: number, totalCost: number): number {
  if (contributionMargin <= 0) return 0;
  return totalCost / contributionMargin;
}

/**
 * Calculates actual ROAS from orders
 * ROAS = Revenue / Ad Spend
 */
export function calculateActualRoas(revenue: number, adSpend: number): number {
  if (adSpend <= 0) return 0;
  return revenue / adSpend;
}

/**
 * Calculates Customer Acquisition Cost (CAC)
 * CAC = Total Marketing Spend / Number of New Customers
 */
export function calculateCAC(totalMarketingSpend: number, newCustomers: number): number {
  if (newCustomers <= 0) return 0;
  return totalMarketingSpend / newCustomers;
}

/**
 * Calculates Cost Per Purchase (CPP)
 * CPP = Total Ad Spend / Number of Purchases
 */
export function calculateCPP(totalAdSpend: number, purchases: number): number {
  if (purchases <= 0) return 0;
  return totalAdSpend / purchases;
}

/**
 * Calculates Customer Lifetime Value (CLV)
 * CLV = Average Order Value * Purchase Frequency * Customer Lifespan
 */
export function calculateCLV(
  averageOrderValue: number,
  purchaseFrequency: number,
  customerLifespanMonths: number
): number {
  return averageOrderValue * purchaseFrequency * (customerLifespanMonths / 12);
}

/**
 * Determines if an order is profitable based on profitability status
 */
export function isOrderProfitable(analysis: OrderProfitabilityAnalysis): boolean {
  return analysis.profitabilityStatus === 'profitable';
}

/**
 * Calculates profit margin percentage
 */
export function calculateProfitMarginPercent(revenue: number, netProfit: number): number {
  if (revenue <= 0) return 0;
  return (netProfit / revenue) * 100;
}

/**
 * Calculates gross margin percentage (Revenue - COGS) / Revenue
 */
export function calculateGrossMarginPercent(revenue: number, cogs: number): number {
  if (revenue <= 0) return 0;
  return ((revenue - cogs) / revenue) * 100;
}
