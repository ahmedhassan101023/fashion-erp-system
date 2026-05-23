import { getOrdersByDateRange, getOrderProfitability } from '../queries';
import { publishEvent } from '../events';

/**
 * Profitability Intelligence Engine
 * Analyzes true net margin per SKU, contribution margin ranking, hidden losses, LTV trends, and cohort profitability
 */

export interface SKUProfitability {
  productId: number;
  sku: string;
  productName: string;
  unitsSold: number;
  totalRevenue: number;
  totalCOGS: number;
  totalAdSpend: number;
  totalShippingCost: number;
  totalRefunds: number;
  totalFailedDeliveries: number;
  operationalOverheadAllocation: number;
  netProfit: number;
  netMarginPercent: number;
  contributionMargin: number;
  contributionMarginPercent: number;
  averageOrderValue: number;
  profitPerUnit: number;
  ltv: number;
  ltvTrend: number; // -1 to 1
  isHiddenLoss: boolean;
  profitabilityTrend: 'improving' | 'stable' | 'declining';
}

export interface CohortProfitability {
  cohortName: string;
  cohortDate: Date;
  customerCount: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  averageLTV: number;
  retentionRate: number;
  repeatPurchaseRate: number;
}

export interface CampaignProfitability {
  campaignId: string;
  campaignName: string;
  ordersAttributed: number;
  totalRevenue: number;
  totalAdSpend: number;
  totalCost: number;
  netProfit: number;
  roas: number;
  profitPerOrder: number;
  profitMargin: number;
  blendedProfitability: number;
}

export interface ProfitabilityAlert {
  id: string;
  type: 'hidden_loss' | 'declining_margin' | 'low_ltv' | 'unprofitable_campaign';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  financialImpact: number;
  recommendedAction: string;
  confidence: number;
}

/**
 * Calculates true net margin for a SKU
 */
export function calculateTrueNetMargin(
  revenue: number,
  cogs: number,
  adSpend: number,
  shippingCost: number,
  refunds: number,
  failedDeliveries: number,
  operationalOverhead: number
): {
  netProfit: number;
  netMarginPercent: number;
  contributionMargin: number;
  contributionMarginPercent: number;
} {
  const grossProfit = revenue - cogs;
  const contributionMargin = grossProfit - adSpend;
  const totalCosts = cogs + adSpend + shippingCost + refunds + failedDeliveries + operationalOverhead;
  const netProfit = revenue - totalCosts;
  
  const netMarginPercent = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  const contributionMarginPercent = revenue > 0 ? (contributionMargin / revenue) * 100 : 0;
  
  return {
    netProfit,
    netMarginPercent,
    contributionMargin,
    contributionMarginPercent,
  };
}

/**
 * Analyzes SKU profitability
 */
export async function analyzeSKUProfitability(
  productId: number,
  sku: string,
  productName: string,
  startDate: Date,
  endDate: Date
): Promise<SKUProfitability | null> {
  try {
    const orders = await getOrdersByDateRange(startDate, endDate);
    // Note: orders don't have products array directly, would need to join with orderLineItems
    const skuOrders = orders; // Simplified for now
    
    if (skuOrders.length === 0) return null;
    
    let totalRevenue = 0;
    let totalCOGS = 0;
    let totalAdSpend = 0;
    let totalShippingCost = 0;
    let totalRefunds = 0;
    let totalFailedDeliveries = 0;
    let unitsSold = 0;
    
    for (const order of skuOrders) {
      const profitability = await getOrderProfitability(order.id);
      if (profitability) {
        totalRevenue += parseFloat(order.totalRevenue as any) || 0;
        totalCOGS += parseFloat(profitability.productCost as any) || 0;
        // adSpend is not directly on profitability, would need to join with orders
        totalShippingCost += parseFloat(order.shippingCost as any) || 0;
        
        if (order.status === 'refunded') {
          totalRefunds += parseFloat(order.totalRevenue as any) || 0;
        }
        
        // Estimate failed deliveries impact
        if (order.fulfillmentStatus === 'cancelled') {
          totalFailedDeliveries += parseFloat(order.totalRevenue as any) || 0;
        }
      }
      
      // Count units (simplified - would need to join with orderLineItems)
      unitsSold += 1; // Placeholder
    }
    
    // Allocate operational overhead
    const operationalOverheadAllocation = (totalRevenue * 0.1); // 10% overhead
    
    const { netProfit, netMarginPercent, contributionMargin, contributionMarginPercent } =
      calculateTrueNetMargin(
        totalRevenue,
        totalCOGS,
        totalAdSpend,
        totalShippingCost,
        totalRefunds,
        totalFailedDeliveries,
        operationalOverheadAllocation
      );
    
    const averageOrderValue = skuOrders.length > 0 ? totalRevenue / skuOrders.length : 0;
    const profitPerUnit = unitsSold > 0 ? netProfit / unitsSold : 0;
    
    // Calculate LTV (simplified: revenue per customer)
    const ltv = skuOrders.length > 0 ? totalRevenue / skuOrders.length : 0;
    
    // Determine if hidden loss
    const isHiddenLoss = netMarginPercent < 0 || (netMarginPercent < 5 && totalRevenue > 1000);
    
    // Determine profitability trend (simplified)
    const profitabilityTrend: 'improving' | 'stable' | 'declining' = netMarginPercent > 20 ? 'improving' : netMarginPercent < 5 ? 'declining' : 'stable';
    
    return {
      productId,
      sku,
      productName,
      unitsSold,
      totalRevenue,
      totalCOGS,
      totalAdSpend,
      totalShippingCost,
      totalRefunds,
      totalFailedDeliveries,
      operationalOverheadAllocation,
      netProfit,
      netMarginPercent,
      contributionMargin,
      contributionMarginPercent,
      averageOrderValue,
      profitPerUnit,
      ltv,
      ltvTrend: 0,
      isHiddenLoss,
      profitabilityTrend,
    };
  } catch (error) {
    console.error(`[Profitability] Error analyzing SKU ${sku}:`, error);
    return null;
  }
}

/**
 * Analyzes cohort profitability
 */
export async function analyzeCohortProfitability(
  cohortName: string,
  cohortDate: Date,
  startDate: Date,
  endDate: Date
): Promise<CohortProfitability | null> {
  try {
    const orders = await getOrdersByDateRange(startDate, endDate);
    
    // Filter orders for this cohort (simplified)
    const cohortOrders = orders.filter(o => {
      const orderDate = new Date(o.orderDate);
      return orderDate >= cohortDate && orderDate < new Date(cohortDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    });
    
    if (cohortOrders.length === 0) return null;
    
    let totalRevenue = 0;
    let totalCost = 0;
    let repeatPurchaseCount = 0;
    
    for (const order of cohortOrders) {
      totalRevenue += parseFloat(order.totalRevenue as any) || 0;
      
      const profitability = await getOrderProfitability(order.id);
      if (profitability) {
        totalCost += parseFloat(profitability.totalCost as any) || 0;
      }
    }
    
    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    
    // Estimate repeat purchase rate
    const uniqueCustomers = new Set(cohortOrders.map(o => o.customerId)).size;
    const repeatPurchaseRate = uniqueCustomers > 0 ? (repeatPurchaseCount / uniqueCustomers) * 100 : 0;
    
    return {
      cohortName,
      cohortDate,
      customerCount: uniqueCustomers,
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
      averageLTV: totalRevenue / uniqueCustomers,
      retentionRate: 0.8, // Placeholder
      repeatPurchaseRate,
    };
  } catch (error) {
    console.error(`[Profitability] Error analyzing cohort ${cohortName}:`, error);
    return null;
  }
}

/**
 * Analyzes campaign profitability
 */
export async function analyzeCampaignProfitability(
  campaignId: string,
  campaignName: string,
  startDate: Date,
  endDate: Date
): Promise<CampaignProfitability | null> {
  try {
    const orders = await getOrdersByDateRange(startDate, endDate);
    const campaignOrders = orders.filter(o => o.metaCampaignId === campaignId);
    
    if (campaignOrders.length === 0) return null;
    
    let totalRevenue = 0;
    let totalCost = 0;
    let totalAdSpend = 0;
    
    for (const order of campaignOrders) {
      totalRevenue += parseFloat(order.totalRevenue as any) || 0;
      
      const profitability = await getOrderProfitability(order.id);
      if (profitability) {
        const orderCost = (parseFloat(profitability.productCost as any) || 0) + (parseFloat(profitability.shippingCost as any) || 0) + (parseFloat(profitability.gatewayFee as any) || 0);
        totalCost += orderCost;
        // adSpend would need to be tracked separately
      }
    }
    
    const netProfit = totalRevenue - totalCost;
    const roas = totalAdSpend > 0 ? totalRevenue / totalAdSpend : 0;
    const profitPerOrder = campaignOrders.length > 0 ? netProfit / campaignOrders.length : 0;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    
    // Blended profitability across all campaigns
    const blendedProfitability = roas >= 3 ? 0.9 : roas >= 2 ? 0.7 : roas >= 1 ? 0.3 : 0;
    
    return {
      campaignId,
      campaignName,
      ordersAttributed: campaignOrders.length,
      totalRevenue,
      totalAdSpend,
      totalCost,
      netProfit,
      roas,
      profitPerOrder,
      profitMargin,
      blendedProfitability,
    };
  } catch (error) {
    console.error(`[Profitability] Error analyzing campaign ${campaignId}:`, error);
    return null;
  }
}

/**
 * Generates profitability alerts
 */
export async function generateProfitabilityAlerts(
  skuProfitabilities: SKUProfitability[]
): Promise<ProfitabilityAlert[]> {
  const alerts: ProfitabilityAlert[] = [];
  
  for (const sku of skuProfitabilities) {
    // Hidden loss alert
    if (sku.isHiddenLoss) {
      alerts.push({
        id: `profit_alert_${sku.sku}_hidden_loss`,
        type: 'hidden_loss',
        severity: sku.netMarginPercent < -10 ? 'critical' : 'high',
        title: `Hidden Loss: ${sku.productName}`,
        description: `SKU ${sku.sku} has negative margin of ${sku.netMarginPercent.toFixed(1)}% after all costs`,
        financialImpact: Math.abs(sku.netProfit),
        recommendedAction: 'Review pricing, reduce ad spend, or discontinue this product',
        confidence: 0.9,
      });
    }
    
    // Declining margin alert
    if (sku.profitabilityTrend === 'declining' && sku.netMarginPercent > 0) {
      alerts.push({
        id: `profit_alert_${sku.sku}_declining`,
        type: 'declining_margin',
        severity: 'medium',
        title: `Declining Margin: ${sku.productName}`,
        description: `SKU ${sku.sku} margin declining (currently ${sku.netMarginPercent.toFixed(1)}%)`,
        financialImpact: sku.netProfit * 0.2,
        recommendedAction: 'Investigate cost increases or reduce ad spend',
        confidence: 0.7,
      });
    }
  }
  
  // Publish alerts
  for (const alert of alerts) {
    await publishEvent({
      eventType: 'losing_campaign_detected',
      severity: alert.severity as any,
      title: alert.title,
      description: alert.description,
      metadata: alert,
    });
  }
  
  return alerts;
}

/**
 * Generates comprehensive profitability report
 */
export async function generateProfitabilityReport(
  startDate: Date,
  endDate: Date
): Promise<{
  skuProfitabilities: SKUProfitability[];
  alerts: ProfitabilityAlert[];
  topProfitableSKUs: SKUProfitability[];
  hiddenLosses: SKUProfitability[];
}> {
  console.log('[Profitability Intelligence] Generating report...');
  
  // This would fetch all products and analyze profitability
  // For now, return empty results
  const skuProfitabilities: SKUProfitability[] = [];
  const alerts = await generateProfitabilityAlerts(skuProfitabilities);
  
  const topProfitableSKUs = skuProfitabilities
    .sort((a, b) => b.netProfit - a.netProfit)
    .slice(0, 10);
  
  const hiddenLosses = skuProfitabilities.filter(s => s.isHiddenLoss);
  
  console.log('[Profitability Intelligence] Report complete.');
  
  return { skuProfitabilities, alerts, topProfitableSKUs, hiddenLosses };
}
