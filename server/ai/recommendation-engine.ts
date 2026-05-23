import { publishEvent } from '../events';
import type { AnomalyAlert } from './anomaly-detection';
import type { InventoryForecast } from './inventory-forecast';
import type { CashflowForecast } from './cashflow-forecast';
import type { SKUProfitability, CampaignProfitability } from './profitability-intelligence';

/**
 * AI Recommendation Engine
 * Generates explainable, data-backed operational recommendations with confidence scoring
 */

export interface Recommendation {
  id: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'marketing' | 'inventory' | 'pricing' | 'cashflow' | 'operations' | 'financial';
  title: string;
  description: string;
  dataBackedReasoning: string;
  financialJustification: string;
  estimatedImpact: {
    metric: string;
    currentValue: number;
    projectedValue: number;
    improvementPercent: number;
  };
  actionItems: string[];
  successMetrics: string[];
  confidence: number; // 0-1
  timeToImplement: string; // e.g., "1-2 days"
  generatedAt: Date;
  metadata: Record<string, any>;
}

/**
 * Generates recommendations from anomaly alerts
 */
export function generateAnomalyRecommendations(anomalies: AnomalyAlert[]): Recommendation[] {
  const recommendations: Recommendation[] = [];
  
  for (const anomaly of anomalies) {
    switch (anomaly.type) {
      case 'refund_spike':
        recommendations.push({
          id: `rec_refund_${Date.now()}`,
          priority: anomaly.severity === 'critical' ? 'critical' : 'high',
          category: 'operations',
          title: 'Investigate Refund Spike Root Cause',
          description: 'Abnormal refund spike detected. Investigate quality, shipping, or product-market fit issues.',
          dataBackedReasoning: `Z-score of ${anomaly.metadata.zScore?.toFixed(2) || 'N/A'} indicates statistical anomaly. Expected ${anomaly.metadata.mean?.toFixed(0) || 'N/A'} refunds, got ${anomaly.metadata.latestValue || 'N/A'}.`,
          financialJustification: `Potential revenue loss of $${anomaly.financialImpact?.toFixed(2) || 'N/A'} if trend continues.`,
          estimatedImpact: {
            metric: 'Refund Rate',
            currentValue: anomaly.metadata.refundRate || 0,
            projectedValue: 3,
            improvementPercent: -50,
          },
          actionItems: [
            'Review recent refund requests for common patterns',
            'Contact affected customers to understand root cause',
            'Audit product quality and shipping processes',
          ],
          successMetrics: ['Refund rate returns to baseline', 'Customer satisfaction improves'],
          confidence: anomaly.confidence,
          timeToImplement: '1-3 days',
          generatedAt: new Date(),
          metadata: anomaly.metadata,
        });
        break;
        
      case 'roas_volatility':
        recommendations.push({
          id: `rec_roas_${Date.now()}`,
          priority: 'high',
          category: 'marketing',
          title: 'Reduce Campaign ROAS Volatility',
          description: 'High ROAS volatility indicates inconsistent campaign performance. Consolidate and optimize.',
          dataBackedReasoning: `Coefficient of variation of ${(anomaly.metadata.coefficientOfVariation * 100)?.toFixed(1) || 'N/A'}% exceeds threshold of 40%. ROAS ranges from ${anomaly.metadata.minRoas?.toFixed(2) || 'N/A'} to ${anomaly.metadata.maxRoas?.toFixed(2) || 'N/A'}.`,
          financialJustification: `Volatility costs ~$${anomaly.financialImpact?.toFixed(2) || 'N/A'} in lost efficiency.`,
          estimatedImpact: {
            metric: 'ROAS Consistency',
            currentValue: anomaly.metadata.coefficientOfVariation || 0,
            projectedValue: 0.25,
            improvementPercent: 40,
          },
          actionItems: [
            'Consolidate similar campaigns to reduce audience overlap',
            'Rotate creative assets to prevent fatigue',
            'Implement audience exclusion rules',
            'Test different targeting parameters',
          ],
          successMetrics: ['ROAS volatility decreases', 'Overall ROAS improves'],
          confidence: anomaly.confidence,
          timeToImplement: '2-3 days',
          generatedAt: new Date(),
          metadata: anomaly.metadata,
        });
        break;
        
      case 'cac_inflation':
        recommendations.push({
          id: `rec_cac_${Date.now()}`,
          priority: 'high',
          category: 'marketing',
          title: 'Address CAC Inflation',
          description: `CAC increased ${(anomaly.metadata.cacChange * 100)?.toFixed(1) || 'N/A'}% week-over-week. Expand reach or optimize conversion.`,
          dataBackedReasoning: `CAC rose from $${anomaly.metadata.previousWeekCac?.toFixed(2) || 'N/A'} to $${anomaly.metadata.currentWeekCac?.toFixed(2) || 'N/A'}. Indicates audience saturation or reduced conversion.`,
          financialJustification: `Continued inflation would cost $${anomaly.financialImpact?.toFixed(2) || 'N/A'} monthly.`,
          estimatedImpact: {
            metric: 'CAC',
            currentValue: anomaly.metadata.currentWeekCac || 0,
            projectedValue: anomaly.metadata.previousWeekCac || 0,
            improvementPercent: -25,
          },
          actionItems: [
            'Expand audience targeting parameters',
            'Test new creative variations',
            'Optimize landing page conversion rate',
            'Pause underperforming ad sets',
          ],
          successMetrics: ['CAC stabilizes', 'Conversion rate improves'],
          confidence: anomaly.confidence,
          timeToImplement: '1-2 days',
          generatedAt: new Date(),
          metadata: anomaly.metadata,
        });
        break;
        
      case 'margin_collapse':
        recommendations.push({
          id: `rec_margin_${Date.now()}`,
          priority: anomaly.severity === 'critical' ? 'critical' : 'high',
          category: 'pricing',
          title: 'Urgent: Address Margin Collapse',
          description: `Profit margin dropped ${(anomaly.metadata.marginChange * 100)?.toFixed(1) || 'N/A'}%. Investigate cost structure immediately.`,
          dataBackedReasoning: `Margin fell from ${(anomaly.metadata.historicalMargin * 100)?.toFixed(1) || 'N/A'}% to ${(anomaly.metadata.currentMargin * 100)?.toFixed(1) || 'N/A'}%.`,
          financialJustification: `Margin loss of $${anomaly.financialImpact?.toFixed(2) || 'N/A'} if not addressed.`,
          estimatedImpact: {
            metric: 'Net Margin %',
            currentValue: anomaly.metadata.currentMargin || 0,
            projectedValue: anomaly.metadata.historicalMargin || 0,
            improvementPercent: 30,
          },
          actionItems: [
            'Review product costs and supplier pricing',
            'Audit shipping rates and logistics',
            'Analyze refund and return rates',
            'Consider price increases for high-margin products',
          ],
          successMetrics: ['Margin returns to baseline', 'Profitability improves'],
          confidence: anomaly.confidence,
          timeToImplement: '2-5 days',
          generatedAt: new Date(),
          metadata: anomaly.metadata,
        });
        break;
    }
  }
  
  return recommendations;
}

/**
 * Generates recommendations from inventory forecasts
 */
export function generateInventoryRecommendations(forecasts: InventoryForecast[]): Recommendation[] {
  const recommendations: Recommendation[] = [];
  
  for (const forecast of forecasts) {
    if (forecast.daysUntilDepletion < 7 && forecast.daysUntilDepletion > 0) {
      recommendations.push({
        id: `rec_inv_reorder_${forecast.productId}`,
        priority: forecast.daysUntilDepletion < 3 ? 'critical' : 'high',
        category: 'inventory',
        title: `Reorder ${forecast.productName} Immediately`,
        description: `Stock will deplete in ${forecast.daysUntilDepletion} days. Reorder ${forecast.recommendedReorderQuantity} units.`,
        dataBackedReasoning: `Current stock: ${forecast.currentStock} units. Daily velocity: ${forecast.dailySalesVelocity.toFixed(1)} units/day. Projected depletion: ${forecast.predictedDepletionDate.toLocaleDateString()}.`,
        financialJustification: `Stockout would result in lost sales of ~$${(forecast.dailySalesVelocity * 100 * Math.max(0, 7 - (forecast.daysUntilDepletion || 0))).toFixed(2)}.`,
        estimatedImpact: {
          metric: 'Days of Stock',
          currentValue: forecast.daysUntilDepletion,
          projectedValue: 30,
          improvementPercent: 300,
        },
        actionItems: [
          `Contact supplier to expedite ${forecast.recommendedReorderQuantity} units`,
          'Confirm delivery timeline',
          'Update inventory forecasts',
        ],
        successMetrics: ['Stock levels maintained', 'No stockouts'],
        confidence: forecast.confidence,
        timeToImplement: '1 day',
        generatedAt: new Date(),
        metadata: {
          productId: forecast.productId,
          sku: forecast.sku,
          currentStock: forecast.currentStock,
          dailyVelocity: forecast.dailySalesVelocity,
          reorderQuantity: forecast.recommendedReorderQuantity,
        },
      });
    }
    
    if (forecast.deadInventory) {
      recommendations.push({
        id: `rec_inv_dead_${forecast.productId}`,
        priority: 'medium',
        category: 'inventory',
        title: `Clear Dead Inventory: ${forecast.productName}`,
        description: `${forecast.currentStock} units with low velocity (${forecast.dailySalesVelocity.toFixed(2)}/day). Consider discontinuing or discounting.`,
        dataBackedReasoning: `Daily velocity of ${forecast.dailySalesVelocity.toFixed(2)} units indicates low demand. At current pace, would take ${Math.ceil(forecast.currentStock / (forecast.dailySalesVelocity || 1))} days to sell.`,
        financialJustification: `Holding cost of $${(forecast.currentStock * 10)?.toFixed(2) || 'N/A'} monthly. Opportunity cost of capital.`,
        estimatedImpact: {
          metric: 'Inventory Turnover',
          currentValue: 0,
          projectedValue: 4,
          improvementPercent: 400,
        },
        actionItems: [
          'Run clearance sale or bundle with popular items',
          'Offer deep discounts to move inventory',
          'Consider donation for tax benefit',
          'Discontinue product if no improvement',
        ],
        successMetrics: ['Inventory cleared', 'Cash freed up'],
        confidence: forecast.confidence,
        timeToImplement: '3-7 days',
        generatedAt: new Date(),
        metadata: {
          productId: forecast.productId,
          sku: forecast.sku,
          currentStock: forecast.currentStock,
          holdingCost: forecast.currentStock * 10,
        },
      });
    }
  }
  
  return recommendations;
}

/**
 * Generates recommendations from cashflow forecast
 */
export function generateCashflowRecommendations(forecast: CashflowForecast): Recommendation[] {
  const recommendations: Recommendation[] = [];
  
  if (forecast.scenarios.worstCase.expectedShortage > 0) {
    recommendations.push({
      id: `rec_cashflow_${Date.now()}`,
      priority: forecast.scenarios.worstCase.riskLevel === 'critical' ? 'critical' : 'high',
      category: 'cashflow',
      title: 'Secure Credit Line for Cashflow Buffer',
      description: `Worst-case scenario shows $${forecast.scenarios.worstCase.expectedShortage?.toFixed(2) || 'N/A'} shortage. Secure credit line immediately.`,
      dataBackedReasoning: `Worst-case runway: ${forecast.scenarios.worstCase.runwayDays?.toFixed(0) || 'N/A'} days. Realistic scenario runway: ${forecast.scenarios.realistic.runwayDays?.toFixed(0) || 'N/A'} days.`,
      financialJustification: `Prevents forced liquidation or missed obligations. Cost of credit line (~5%) is lower than opportunity cost of closure.`,
      estimatedImpact: {
        metric: 'Liquidity Risk',
        currentValue: forecast.scenarios.worstCase.liquidityRiskScore || 0,
        projectedValue: 0.3,
        improvementPercent: 60,
      },
      actionItems: [
        'Contact lenders for credit line quotes',
        'Prepare financial statements and projections',
        'Negotiate terms and rates',
        'Set up automatic draw if needed',
      ],
      successMetrics: ['Credit line secured', 'Liquidity risk reduced'],
      confidence: 0.85,
      timeToImplement: '3-7 days',
      generatedAt: new Date(),
      metadata: {
        worstCaseShortage: forecast.scenarios.worstCase.expectedShortage,
        runwayDays: forecast.scenarios.worstCase.runwayDays,
      },
    });
  }
  
  return recommendations;
}

/**
 * Generates recommendations from profitability analysis
 */
export function generateProfitabilityRecommendations(
  skuProfitabilities: SKUProfitability[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  
  const hiddenLosses = skuProfitabilities.filter(s => s.isHiddenLoss);
  
  for (const sku of hiddenLosses) {
    recommendations.push({
      id: `rec_profit_${sku.productId}`,
      priority: sku.netMarginPercent < -10 ? 'critical' : 'high',
      category: 'pricing',
      title: `Fix Hidden Loss: ${sku.productName}`,
      description: `SKU ${sku.sku} has ${sku.netMarginPercent?.toFixed(1) || 'N/A'}% margin. Losing $${Math.abs(sku.netProfit)?.toFixed(2) || 'N/A'} per unit.`,
      dataBackedReasoning: `Revenue: $${sku.totalRevenue?.toFixed(2) || 'N/A'}. Total costs: $${(sku.totalCOGS + sku.totalAdSpend + sku.totalShippingCost)?.toFixed(2) || 'N/A'}.`,
      financialJustification: `Discontinuing would save $${Math.abs(sku.netProfit * sku.unitsSold)?.toFixed(2) || 'N/A'} monthly.`,
      estimatedImpact: {
        metric: 'Profit Margin %',
        currentValue: sku.netMarginPercent || 0,
        projectedValue: 15,
        improvementPercent: 100,
      },
      actionItems: [
        'Increase price by 15-20%',
        'Reduce ad spend or pause marketing',
        'Negotiate lower COGS with suppliers',
        'Discontinue if price increase not viable',
      ],
      successMetrics: ['Margin becomes positive', 'Profitability improves'],
      confidence: 0.9,
      timeToImplement: '1-2 days',
      generatedAt: new Date(),
      metadata: {
        productId: sku.productId,
        sku: sku.sku,
        currentMargin: sku.netMarginPercent,
        lossPerUnit: sku.profitPerUnit,
        totalMonthlyLoss: sku.netProfit * sku.unitsSold,
      },
    });
  }
  
  return recommendations;
}

/**
 * Consolidates all recommendations and ranks by impact
 */
export async function generateConsolidatedRecommendations(
  anomalies: AnomalyAlert[],
  inventoryForecasts: InventoryForecast[],
  cashflowForecast: CashflowForecast,
  skuProfitabilities: SKUProfitability[]
): Promise<Recommendation[]> {
  console.log('[Recommendation Engine] Generating consolidated recommendations...');
  
  const allRecommendations: Recommendation[] = [
    ...generateAnomalyRecommendations(anomalies),
    ...generateInventoryRecommendations(inventoryForecasts),
    ...generateCashflowRecommendations(cashflowForecast),
    ...generateProfitabilityRecommendations(skuProfitabilities),
  ];
  
  // Sort by priority and confidence
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  allRecommendations.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.confidence - a.confidence;
  });
  
  // Publish recommendations as events
  for (const rec of allRecommendations.slice(0, 5)) { // Top 5 recommendations
    await publishEvent({
      eventType: 'daily_financial_summary',
      severity: rec.priority as any,
      title: rec.title,
      description: rec.description,
      metadata: {
        category: rec.category,
        confidence: rec.confidence,
        estimatedImpact: rec.estimatedImpact,
      },
    });
  }
  
  console.log(`[Recommendation Engine] Generated ${allRecommendations.length} recommendations.`);
  return allRecommendations;
}
