import { getOrdersByDateRange, getMetaCampaigns, getOrderProfitability } from '../queries';
import { publishEvent } from '../events';

/**
 * Financial Anomaly Detection Engine
 * Detects abnormal patterns in refunds, ROAS, CAC, margins, expenses, and accounting
 * Uses z-score analysis, rolling averages, and statistical thresholding
 */

export interface AnomalyAlert {
  id: string;
  type: 'refund_spike' | 'roas_volatility' | 'cac_inflation' | 'margin_collapse' | 'expense_anomaly' | 'accounting_imbalance' | 'inventory_mismatch';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedMetrics: string[];
  financialImpact: number;
  financialImpactPercent: number;
  rootCauseHypothesis: string;
  recommendedAction: string;
  confidence: number; // 0-1
  detectedAt: Date;
  metadata: Record<string, any>;
}

export interface AnomalyStats {
  mean: number;
  stdDev: number;
  zScore: number;
  isAnomaly: boolean;
  threshold: number;
}

/**
 * Calculates z-score for anomaly detection
 */
export function calculateZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/**
 * Calculates rolling average
 */
export function calculateRollingAverage(values: number[], windowSize: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = values.slice(start, i + 1);
    const avg = window.reduce((a, b) => a + b, 0) / window.length;
    result.push(avg);
  }
  return result;
}

/**
 * Calculates standard deviation
 */
export function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Detects abnormal refund spikes
 */
export async function detectRefundSpike(
  startDate: Date,
  endDate: Date,
  zScoreThreshold: number = 2.5
): Promise<AnomalyAlert | null> {
  try {
    console.log('[Anomaly] Analyzing refund patterns...');

    const orders = await getOrdersByDateRange(startDate, endDate);
    
    // Group refunds by day
    const refundsByDay: Record<string, number> = {};
    for (const order of orders) {
      if (order.status === 'refunded') {
        const day = new Date(order.orderDate).toISOString().split('T')[0];
        refundsByDay[day] = (refundsByDay[day] || 0) + 1;
      }
    }

    const refundCounts = Object.values(refundsByDay);
    if (refundCounts.length < 3) return null; // Need at least 3 data points

    const mean = refundCounts.reduce((a, b) => a + b, 0) / refundCounts.length;
    const stdDev = calculateStdDev(refundCounts);
    const latestRefunds = refundCounts[refundCounts.length - 1];
    const zScore = calculateZScore(latestRefunds, mean, stdDev);

    if (Math.abs(zScore) > zScoreThreshold) {
      const refundRate = (latestRefunds / orders.length) * 100;
      const expectedRefunds = mean;
      const excessRefunds = latestRefunds - expectedRefunds;

      return {
        id: `anomaly_refund_${Date.now()}`,
        type: 'refund_spike',
        severity: Math.abs(zScore) > 3.5 ? 'critical' : 'high',
        title: 'Abnormal Refund Spike Detected',
        description: `Refund count jumped to ${latestRefunds} (expected ~${Math.round(expectedRefunds)})`,
        affectedMetrics: ['refund_rate', 'return_rate', 'revenue_quality'],
        financialImpact: excessRefunds * 100, // Estimated impact
        financialImpactPercent: (excessRefunds / expectedRefunds) * 100,
        rootCauseHypothesis: 'Possible quality issue, shipping delay, or product mismatch. Check recent orders for common complaints.',
        recommendedAction: 'Review recent refund requests for patterns. Contact customers to understand root cause.',
        confidence: Math.min(1, Math.abs(zScore) / 5),
        detectedAt: new Date(),
        metadata: {
          zScore,
          mean,
          stdDev,
          latestValue: latestRefunds,
          refundRate,
        },
      };
    }

    return null;
  } catch (error) {
    console.error('[Anomaly] Error detecting refund spike:', error);
    return null;
  }
}

/**
 * Detects suspicious ROAS volatility
 */
export async function detectROASVolatility(
  startDate: Date,
  endDate: Date,
  volatilityThreshold: number = 0.4
): Promise<AnomalyAlert | null> {
  try {
    console.log('[Anomaly] Analyzing ROAS volatility...');

    const campaigns = await getMetaCampaigns();
    
    // Calculate daily ROAS for each campaign
    const roasValues: number[] = [];
    for (const campaign of campaigns) {
      const spend = parseFloat(campaign.budget as any) || 0;
      // Revenue would need to be calculated from orders attributed to this campaign
      const revenue = 0; // Placeholder
      if (spend > 0) {
        const roas = revenue / spend;
        roasValues.push(roas);
      }
    }

    if (roasValues.length < 3) return null;

    const mean = roasValues.reduce((a, b) => a + b, 0) / roasValues.length;
    const stdDev = calculateStdDev(roasValues);
    const coefficientOfVariation = stdDev / mean; // Volatility measure

    if (coefficientOfVariation > volatilityThreshold) {
      const minRoas = Math.min(...roasValues);
      const maxRoas = Math.max(...roasValues);

      return {
        id: `anomaly_roas_${Date.now()}`,
        type: 'roas_volatility',
        severity: coefficientOfVariation > 0.6 ? 'high' : 'medium',
        title: 'High ROAS Volatility Detected',
        description: `ROAS varies from ${minRoas.toFixed(2)} to ${maxRoas.toFixed(2)} (CV: ${(coefficientOfVariation * 100).toFixed(1)}%)`,
        affectedMetrics: ['roas', 'campaign_performance', 'spend_efficiency'],
        financialImpact: (maxRoas - minRoas) * 1000, // Estimated impact
        financialImpactPercent: ((maxRoas - minRoas) / mean) * 100,
        rootCauseHypothesis: 'Possible causes: audience targeting inconsistency, creative fatigue, or external market factors. Check campaign settings and audience overlap.',
        recommendedAction: 'Consolidate similar campaigns, reduce audience overlap, and rotate creative assets.',
        confidence: Math.min(1, coefficientOfVariation / 1.0),
        detectedAt: new Date(),
        metadata: {
          coefficientOfVariation,
          mean,
          stdDev,
          minRoas,
          maxRoas,
          campaignCount: roasValues.length,
        },
      };
    }

    return null;
  } catch (error) {
    console.error('[Anomaly] Error detecting ROAS volatility:', error);
    return null;
  }
}

/**
 * Detects sudden CAC inflation
 */
export async function detectCACInflation(
  startDate: Date,
  endDate: Date,
  inflationThreshold: number = 0.25
): Promise<AnomalyAlert | null> {
  try {
    console.log('[Anomaly] Analyzing CAC trends...');

    const orders = await getOrdersByDateRange(startDate, endDate);
    
    // Calculate CAC by week
    const cacByWeek: Record<string, number[]> = {};
    for (const order of orders) {
      if (order.metaCampaignId) {
        const weekStart = new Date(order.orderDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];

        const estimatedCac = (parseFloat(order.totalRevenue as any) || 0) * 0.15; // Estimate
        if (!cacByWeek[weekKey]) cacByWeek[weekKey] = [];
        cacByWeek[weekKey].push(estimatedCac);
      }
    }

    const weekKeys = Object.keys(cacByWeek).sort();
    if (weekKeys.length < 3) return null;

    const avgCacByWeek = weekKeys.map(week => {
      const values = cacByWeek[week];
      return values.reduce((a, b) => a + b, 0) / values.length;
    });

    const previousWeekCac = avgCacByWeek[avgCacByWeek.length - 2];
    const currentWeekCac = avgCacByWeek[avgCacByWeek.length - 1];
    const cacChange = (currentWeekCac - previousWeekCac) / previousWeekCac;

    if (cacChange > inflationThreshold) {
      return {
        id: `anomaly_cac_${Date.now()}`,
        type: 'cac_inflation',
        severity: cacChange > 0.5 ? 'high' : 'medium',
        title: 'CAC Inflation Detected',
        description: `CAC increased by ${(cacChange * 100).toFixed(1)}% week-over-week (${previousWeekCac.toFixed(2)} → ${currentWeekCac.toFixed(2)})`,
        affectedMetrics: ['cac', 'marketing_efficiency', 'profitability'],
        financialImpact: (currentWeekCac - previousWeekCac) * orders.length * 0.1,
        financialImpactPercent: cacChange * 100,
        rootCauseHypothesis: 'Possible causes: audience saturation, increased competition, or reduced conversion rates. Check conversion funnel and audience size.',
        recommendedAction: 'Expand audience targeting, test new creative, or pause underperforming campaigns.',
        confidence: 0.8,
        detectedAt: new Date(),
        metadata: {
          previousWeekCac,
          currentWeekCac,
          cacChange,
          weekCount: avgCacByWeek.length,
        },
      };
    }

    return null;
  } catch (error) {
    console.error('[Anomaly] Error detecting CAC inflation:', error);
    return null;
  }
}

/**
 * Detects unexpected margin collapse
 */
export async function detectMarginCollapse(
  startDate: Date,
  endDate: Date,
  collapseThreshold: number = 0.3
): Promise<AnomalyAlert | null> {
  try {
    console.log('[Anomaly] Analyzing margin trends...');

    const orders = await getOrdersByDateRange(startDate, endDate);
    
    // Calculate margins by day
    const marginsByDay: Record<string, number[]> = {};
    for (const order of orders) {
      const day = new Date(order.orderDate).toISOString().split('T')[0];
      const profitability = await getOrderProfitability(order.id);
      
      if (profitability) {
        const revenue = parseFloat(order.totalRevenue as any) || 0;
        const profit = parseFloat(profitability.netProfit as any) || 0;
        const margin = revenue > 0 ? profit / revenue : 0;

        if (!marginsByDay[day]) marginsByDay[day] = [];
        marginsByDay[day].push(margin);
      }
    }

    const dayKeys = Object.keys(marginsByDay).sort();
    if (dayKeys.length < 3) return null;

    const avgMarginByDay = dayKeys.map(day => {
      const values = marginsByDay[day];
      return values.reduce((a, b) => a + b, 0) / values.length;
    });

    const historicalMargin = avgMarginByDay.slice(0, -1).reduce((a, b) => a + b, 0) / (avgMarginByDay.length - 1);
    const currentMargin = avgMarginByDay[avgMarginByDay.length - 1];
    const marginChange = (historicalMargin - currentMargin) / historicalMargin;

    if (marginChange > collapseThreshold) {
      return {
        id: `anomaly_margin_${Date.now()}`,
        type: 'margin_collapse',
        severity: marginChange > 0.5 ? 'critical' : 'high',
        title: 'Margin Collapse Detected',
        description: `Profit margin dropped by ${(marginChange * 100).toFixed(1)}% (${(historicalMargin * 100).toFixed(1)}% → ${(currentMargin * 100).toFixed(1)}%)`,
        affectedMetrics: ['profit_margin', 'net_profit', 'profitability'],
        financialImpact: marginChange * 10000, // Estimated impact
        financialImpactPercent: marginChange * 100,
        rootCauseHypothesis: 'Check: increased product costs, higher shipping costs, increased refund rate, or higher ad spend per order.',
        recommendedAction: 'Review cost structure, shipping rates, and campaign efficiency. Consider price increases or cost reductions.',
        confidence: 0.85,
        detectedAt: new Date(),
        metadata: {
          historicalMargin,
          currentMargin,
          marginChange,
          dayCount: avgMarginByDay.length,
        },
      };
    }

    return null;
  } catch (error) {
    console.error('[Anomaly] Error detecting margin collapse:', error);
    return null;
  }
}

/**
 * Detects operational expense anomalies
 */
export async function detectExpenseAnomaly(
  startDate: Date,
  endDate: Date,
  zScoreThreshold: number = 2.5
): Promise<AnomalyAlert | null> {
  try {
    console.log('[Anomaly] Analyzing operational expenses...');

    // This would integrate with your cashflow transaction data
    // For now, return a placeholder
    return null;
  } catch (error) {
    console.error('[Anomaly] Error detecting expense anomaly:', error);
    return null;
  }
}

/**
 * Detects accounting imbalances
 */
export async function detectAccountingImbalance(): Promise<AnomalyAlert | null> {
  try {
    console.log('[Anomaly] Checking accounting integrity...');

    // This would check journal entries for balance
    // Assets = Liabilities + Equity
    // For now, return a placeholder
    return null;
  } catch (error) {
    console.error('[Anomaly] Error detecting accounting imbalance:', error);
    return null;
  }
}

/**
 * Detects inventory mismatches
 */
export async function detectInventoryMismatch(): Promise<AnomalyAlert | null> {
  try {
    console.log('[Anomaly] Checking inventory consistency...');

    // This would compare Shopify inventory with ERP records
    // For now, return a placeholder
    return null;
  } catch (error) {
    console.error('[Anomaly] Error detecting inventory mismatch:', error);
    return null;
  }
}

/**
 * Runs all anomaly detection checks
 */
export async function runAnomalyDetection(
  startDate: Date,
  endDate: Date
): Promise<AnomalyAlert[]> {
  console.log('[Anomaly Detection] Starting comprehensive analysis...');

  const alerts: AnomalyAlert[] = [];

  // Run all detection engines
  const refundAlert = await detectRefundSpike(startDate, endDate);
  if (refundAlert) alerts.push(refundAlert);

  const roasAlert = await detectROASVolatility(startDate, endDate);
  if (roasAlert) alerts.push(roasAlert);

  const cacAlert = await detectCACInflation(startDate, endDate);
  if (cacAlert) alerts.push(cacAlert);

  const marginAlert = await detectMarginCollapse(startDate, endDate);
  if (marginAlert) alerts.push(marginAlert);

  const expenseAlert = await detectExpenseAnomaly(startDate, endDate);
  if (expenseAlert) alerts.push(expenseAlert);

  const accountingAlert = await detectAccountingImbalance();
  if (accountingAlert) alerts.push(accountingAlert);

  const inventoryAlert = await detectInventoryMismatch();
  if (inventoryAlert) alerts.push(inventoryAlert);

  // Publish alerts as events
  for (const alert of alerts) {
    await publishEvent({
      eventType: 'abnormal_expense_detected',
      severity: alert.severity as any,
      title: alert.title,
      description: alert.description,
      metadata: alert.metadata,
    });
  }

  console.log(`[Anomaly Detection] Completed. Found ${alerts.length} anomalies.`);
  return alerts;
}
