import { getOrdersByDateRange } from '../queries';
import { publishEvent } from '../events';

/**
 * Inventory Forecasting Engine
 * Predicts stock depletion, reorder timing, dead inventory, and inventory risk
 * Uses sales velocity, historical trends, seasonal behavior, and ad spend correlation
 */

export interface InventoryForecast {
  productId: number;
  sku: string;
  productName: string;
  currentStock: number;
  dailySalesVelocity: number;
  weeklyTrend: number; // -1 to 1
  seasonalityFactor: number; // 0.5 to 2.0
  adSpendCorrelation: number; // -1 to 1
  predictedDepletionDate: Date;
  daysUntilDepletion: number;
  recommendedReorderDate: Date;
  recommendedReorderQuantity: number;
  riskScore: number; // 0-1
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  fastMoving: boolean;
  deadInventory: boolean;
  confidence: number; // 0-1
}

export interface InventoryRiskAlert {
  id: string;
  type: 'stockout_risk' | 'dead_inventory' | 'overstock' | 'fast_moving';
  severity: 'low' | 'medium' | 'high' | 'critical';
  productId: number;
  sku: string;
  productName: string;
  title: string;
  description: string;
  recommendedAction: string;
  financialImpact: number;
  confidence: number;
  detectedAt: Date;
}

/**
 * Calculates daily sales velocity
 */
export function calculateSalesVelocity(
  salesData: number[],
  windowDays: number = 7
): number {
  if (salesData.length === 0) return 0;
  
  const recentSales = salesData.slice(-windowDays);
  const avgDailySales = recentSales.reduce((a, b) => a + b, 0) / recentSales.length;
  
  return avgDailySales;
}

/**
 * Calculates weekly trend
 */
export function calculateWeeklyTrend(salesData: number[]): number {
  if (salesData.length < 14) return 0;
  
  const week1 = salesData.slice(-14, -7).reduce((a, b) => a + b, 0);
  const week2 = salesData.slice(-7).reduce((a, b) => a + b, 0);
  
  if (week1 === 0) return 0;
  return (week2 - week1) / week1;
}

/**
 * Calculates seasonality factor
 */
export function calculateSeasonalityFactor(
  salesData: number[],
  dayOfYear: number
): number {
  if (salesData.length < 365) return 1.0;
  
  // Simplified: compare same day of week across weeks
  const dayOfWeek = new Date().getDay();
  const sameWeekdaySales = salesData.filter((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (salesData.length - i));
    return date.getDay() === dayOfWeek;
  });
  
  if (sameWeekdaySales.length === 0) return 1.0;
  
  const avgSameWeekday = sameWeekdaySales.reduce((a, b) => a + b, 0) / sameWeekdaySales.length;
  const avgOverall = salesData.reduce((a, b) => a + b, 0) / salesData.length;
  
  return avgSameWeekday / avgOverall;
}

/**
 * Calculates correlation between ad spend and sales
 */
export function calculateAdSpendCorrelation(
  salesData: number[],
  adSpendData: number[]
): number {
  if (salesData.length !== adSpendData.length || salesData.length < 2) return 0;
  
  const n = salesData.length;
  const meanSales = salesData.reduce((a, b) => a + b, 0) / n;
  const meanSpend = adSpendData.reduce((a, b) => a + b, 0) / n;
  
  let covariance = 0;
  let varSales = 0;
  let varSpend = 0;
  
  for (let i = 0; i < n; i++) {
    const salesDiff = salesData[i] - meanSales;
    const spendDiff = adSpendData[i] - meanSpend;
    
    covariance += salesDiff * spendDiff;
    varSales += salesDiff * salesDiff;
    varSpend += spendDiff * spendDiff;
  }
  
  const correlation = covariance / Math.sqrt(varSales * varSpend);
  return isNaN(correlation) ? 0 : correlation;
}

/**
 * Predicts stock depletion date
 */
export function predictDepletionDate(
  currentStock: number,
  dailyVelocity: number,
  weeklyTrend: number,
  seasonalityFactor: number
): { date: Date; daysUntilDepletion: number } {
  if (dailyVelocity === 0) {
    return {
      date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      daysUntilDepletion: 365,
    };
  }
  
  // Adjust velocity based on trend and seasonality
  const adjustedVelocity = dailyVelocity * (1 + weeklyTrend * 0.1) * seasonalityFactor;
  const daysUntilDepletion = Math.ceil(currentStock / adjustedVelocity);
  
  const depletionDate = new Date();
  depletionDate.setDate(depletionDate.getDate() + daysUntilDepletion);
  
  return { date: depletionDate, daysUntilDepletion };
}

/**
 * Calculates recommended reorder quantity
 */
export function calculateReorderQuantity(
  dailyVelocity: number,
  leadTimeDays: number = 7,
  safetyStock: number = 14
): number {
  // Reorder Point = (Daily Velocity × Lead Time) + Safety Stock
  const reorderPoint = dailyVelocity * leadTimeDays + dailyVelocity * safetyStock;
  
  // Economic Order Quantity (simplified)
  const eoq = Math.ceil(reorderPoint * 1.5);
  
  return Math.max(eoq, Math.ceil(dailyVelocity * 7)); // At least 1 week supply
}

/**
 * Calculates inventory risk score
 */
export function calculateRiskScore(
  daysUntilDepletion: number,
  weeklyTrend: number,
  adSpendCorrelation: number,
  currentStock: number,
  dailyVelocity: number
): number {
  let score = 0;
  
  // Stockout risk (higher score if depletion is soon)
  if (daysUntilDepletion < 7) score += 0.4;
  else if (daysUntilDepletion < 14) score += 0.2;
  else if (daysUntilDepletion < 30) score += 0.1;
  
  // Trend risk (increasing sales = higher risk)
  if (weeklyTrend > 0.2) score += 0.2;
  
  // Ad spend correlation risk (high correlation = higher risk)
  if (adSpendCorrelation > 0.7) score += 0.2;
  
  // Dead inventory risk (low velocity)
  if (dailyVelocity < 0.5 && currentStock > 100) score += 0.2;
  
  return Math.min(1, score);
}

/**
 * Generates inventory forecast for a product
 */
export async function forecastProductInventory(
  productId: number,
  sku: string,
  productName: string,
  currentStock: number,
  historicalSalesData: number[],
  historicalAdSpendData: number[]
): Promise<InventoryForecast> {
  const dailyVelocity = calculateSalesVelocity(historicalSalesData);
  const weeklyTrend = calculateWeeklyTrend(historicalSalesData);
  const seasonalityFactor = calculateSeasonalityFactor(historicalSalesData, new Date().getDay());
  const adSpendCorrelation = calculateAdSpendCorrelation(historicalSalesData, historicalAdSpendData);
  
  const { date: depletionDate, daysUntilDepletion } = predictDepletionDate(
    currentStock,
    dailyVelocity,
    weeklyTrend,
    seasonalityFactor
  );
  
  const reorderQuantity = calculateReorderQuantity(dailyVelocity);
  const riskScore = calculateRiskScore(
    daysUntilDepletion,
    weeklyTrend,
    adSpendCorrelation,
    currentStock,
    dailyVelocity
  );
  
  const riskLevel =
    riskScore > 0.75 ? 'critical' :
    riskScore > 0.5 ? 'high' :
    riskScore > 0.25 ? 'medium' : 'low';
  
  const fastMoving = dailyVelocity > 10 && daysUntilDepletion < 30;
  const deadInventory = dailyVelocity < 0.5 && currentStock > 50;
  
  const recommendedReorderDate = new Date();
  recommendedReorderDate.setDate(recommendedReorderDate.getDate() + Math.max(3, daysUntilDepletion - 7));
  
  return {
    productId,
    sku,
    productName,
    currentStock,
    dailySalesVelocity: dailyVelocity,
    weeklyTrend,
    seasonalityFactor,
    adSpendCorrelation,
    predictedDepletionDate: depletionDate,
    daysUntilDepletion,
    recommendedReorderDate,
    recommendedReorderQuantity: reorderQuantity,
    riskScore,
    riskLevel,
    fastMoving,
    deadInventory,
    confidence: Math.min(1, historicalSalesData.length / 90), // Higher confidence with more data
  };
}

/**
 * Generates inventory risk alerts
 */
export async function generateInventoryAlerts(
  forecasts: InventoryForecast[]
): Promise<InventoryRiskAlert[]> {
  const alerts: InventoryRiskAlert[] = [];
  
  for (const forecast of forecasts) {
    // Stockout risk alert
    if (forecast.daysUntilDepletion < 7 && forecast.daysUntilDepletion > 0) {
      alerts.push({
        id: `inv_alert_${forecast.productId}_stockout`,
        type: 'stockout_risk',
        severity: forecast.daysUntilDepletion < 3 ? 'critical' : 'high',
        productId: forecast.productId,
        sku: forecast.sku,
        productName: forecast.productName,
        title: `Stockout Risk: ${forecast.productName}`,
        description: `Stock will deplete in ${forecast.daysUntilDepletion} days (${forecast.currentStock} units at ${forecast.dailySalesVelocity.toFixed(1)}/day velocity)`,
        recommendedAction: `Reorder ${forecast.recommendedReorderQuantity} units immediately`,
        financialImpact: forecast.dailySalesVelocity * 100 * Math.max(0, 7 - (forecast.daysUntilDepletion || 0)),
        confidence: forecast.confidence,
        detectedAt: new Date(),
      });
    }
    
    // Dead inventory alert
    if (forecast.deadInventory) {
      alerts.push({
        id: `inv_alert_${forecast.productId}_dead`,
        type: 'dead_inventory',
        severity: 'medium',
        productId: forecast.productId,
        sku: forecast.sku,
        productName: forecast.productName,
        title: `Dead Inventory: ${forecast.productName}`,
        description: `${forecast.currentStock} units with low velocity (${forecast.dailySalesVelocity.toFixed(2)}/day)`,
        recommendedAction: 'Consider discounting, bundling, or discontinuing this product',
        financialImpact: (forecast.currentStock || 0) * 10, // Estimated holding cost
        confidence: forecast.confidence,
        detectedAt: new Date(),
      });
    }
    
    // Fast-moving alert
    if (forecast.fastMoving) {
      alerts.push({
        id: `inv_alert_${forecast.productId}_fast`,
        type: 'fast_moving',
        severity: 'low',
        productId: forecast.productId,
        sku: forecast.sku,
        productName: forecast.productName,
        title: `Fast-Moving Product: ${forecast.productName}`,
        description: `High velocity (${forecast.dailySalesVelocity.toFixed(1)}/day) with ${forecast.daysUntilDepletion} days of stock`,
        recommendedAction: 'Increase stock levels and consider increasing marketing spend',
        financialImpact: forecast.dailySalesVelocity * 100 * 30, // Potential revenue opportunity
        confidence: forecast.confidence,
        detectedAt: new Date(),
      });
    }
  }
  
  // Publish alerts as events
  for (const alert of alerts) {
    await publishEvent({
      eventType: 'low_inventory_alert',
      severity: alert.severity as any,
      title: alert.title,
      description: alert.description,
      metadata: {
        productId: alert.productId,
        sku: alert.sku,
        alertType: alert.type,
      },
    });
  }
  
  return alerts;
}

/**
 * Runs inventory forecasting for all products
 */
export async function runInventoryForecasting(
  startDate: Date,
  endDate: Date
): Promise<{
  forecasts: InventoryForecast[];
  alerts: InventoryRiskAlert[];
}> {
  console.log('[Inventory Forecast] Starting forecasting analysis...');
  
  // This would fetch all products and their historical data
  // For now, return empty results
  const forecasts: InventoryForecast[] = [];
  const alerts: InventoryRiskAlert[] = [];
  
  console.log('[Inventory Forecast] Completed. Generated forecasts for ${forecasts.length} products.');
  
  return { forecasts, alerts };
}
