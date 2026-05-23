import { getOrdersByDateRange } from '../queries';
import { publishEvent } from '../events';

/**
 * Cashflow Forecasting Engine
 * Predicts incoming/outgoing cash, COD collections, supplier obligations, payroll, and operational burn
 * Supports best-case, realistic, and worst-case scenarios
 */

export interface CashflowScenario {
  scenarioType: 'best_case' | 'realistic' | 'worst_case';
  incomingCash: number;
  outgoingCash: number;
  netCashflow: number;
  runwayDays: number;
  expectedShortage: number;
  liquidityRiskScore: number; // 0-1
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface CashflowForecast {
  forecastDate: Date;
  forecastPeriodDays: number;
  currentCashPosition: number;
  scenarios: {
    bestCase: CashflowScenario;
    realistic: CashflowScenario;
    worstCase: CashflowScenario;
  };
  expectedCashShortageAlerts: CashShortageAlert[];
  confidence: number; // 0-1
}

export interface CashShortageAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  expectedShortageDate: Date;
  expectedShortageAmount: number;
  recommendedAction: string;
  confidence: number;
}

export interface CashflowComponent {
  date: Date;
  category: 'sales' | 'cod_collection' | 'refunds' | 'supplier_payment' | 'payroll' | 'ad_spend' | 'operational' | 'tax';
  amount: number;
  confidence: number; // 0-1
  notes?: string;
}

/**
 * Forecasts incoming cash from sales
 */
export function forecastIncomingCash(
  historicalDailySales: number[],
  weeklyTrend: number,
  seasonalityFactor: number,
  forecastDays: number = 30
): CashflowComponent[] {
  const components: CashflowComponent[] = [];
  
  const avgDailySales = historicalDailySales.reduce((a, b) => a + b, 0) / historicalDailySales.length;
  
  for (let i = 1; i <= forecastDays; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    
    // Apply trend and seasonality
    const adjustedSales = avgDailySales * (1 + weeklyTrend * 0.1) * seasonalityFactor;
    
    components.push({
      date,
      category: 'sales',
      amount: adjustedSales,
      confidence: 0.8,
      notes: `Forecasted daily sales`,
    });
  }
  
  return components;
}

/**
 * Forecasts COD collections
 */
export function forecastCODCollections(
  historicalCODData: number[],
  collectionRate: number = 0.95,
  forecastDays: number = 30
): CashflowComponent[] {
  const components: CashflowComponent[] = [];
  
  const avgDailyCOD = historicalCODData.reduce((a, b) => a + b, 0) / historicalCODData.length;
  
  for (let i = 1; i <= forecastDays; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    
    // COD collections typically lag by 2-3 days
    if (i > 2) {
      components.push({
        date,
        category: 'cod_collection',
        amount: avgDailyCOD * collectionRate,
        confidence: 0.85,
        notes: `COD collection (${(collectionRate * 100).toFixed(0)}% collection rate)`,
      });
    }
  }
  
  return components;
}

/**
 * Forecasts refunds
 */
export function forecastRefunds(
  historicalDailySales: number[],
  refundRate: number = 0.05,
  forecastDays: number = 30
): CashflowComponent[] {
  const components: CashflowComponent[] = [];
  
  const avgDailySales = historicalDailySales.reduce((a, b) => a + b, 0) / historicalDailySales.length;
  
  for (let i = 1; i <= forecastDays; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    
    // Refunds typically process within 5-7 days
    if (i > 5) {
      components.push({
        date,
        category: 'refunds',
        amount: -(avgDailySales * refundRate),
        confidence: 0.7,
        notes: `Forecasted refunds (${(refundRate * 100).toFixed(1)}% rate)`,
      });
    }
  }
  
  return components;
}

/**
 * Forecasts supplier payments
 */
export function forecastSupplierPayments(
  historicalCOGS: number[],
  paymentTerms: number = 30, // days
  forecastDays: number = 30
): CashflowComponent[] {
  const components: CashflowComponent[] = [];
  
  const avgMonthlySpend = historicalCOGS.reduce((a, b) => a + b, 0) / historicalCOGS.length;
  const dailySpend = avgMonthlySpend / 30;
  
  // Supplier payments typically occur on fixed dates
  for (let i = 1; i <= forecastDays; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    
    // Simplified: assume payment every 30 days
    if (i % paymentTerms === 0) {
      components.push({
        date,
        category: 'supplier_payment',
        amount: -(dailySpend * paymentTerms),
        confidence: 0.9,
        notes: `Supplier payment (${paymentTerms}-day terms)`,
      });
    }
  }
  
  return components;
}

/**
 * Forecasts payroll
 */
export function forecastPayroll(
  monthlyPayroll: number,
  forecastDays: number = 30
): CashflowComponent[] {
  const components: CashflowComponent[] = [];
  
  // Payroll typically occurs on fixed dates (e.g., 1st and 15th)
  for (let i = 1; i <= forecastDays; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    
    if (date.getDate() === 1 || date.getDate() === 15) {
      components.push({
        date,
        category: 'payroll',
        amount: -(monthlyPayroll / 2),
        confidence: 0.95,
        notes: `Payroll`,
      });
    }
  }
  
  return components;
}

/**
 * Forecasts ad spend
 */
export function forecastAdSpend(
  historicalDailySpend: number[],
  weeklyTrend: number,
  forecastDays: number = 30
): CashflowComponent[] {
  const components: CashflowComponent[] = [];
  
  const avgDailySpend = historicalDailySpend.reduce((a, b) => a + b, 0) / historicalDailySpend.length;
  
  for (let i = 1; i <= forecastDays; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    
    const adjustedSpend = avgDailySpend * (1 + weeklyTrend * 0.05);
    
    components.push({
      date,
      category: 'ad_spend',
      amount: -adjustedSpend,
      confidence: 0.75,
      notes: `Forecasted ad spend`,
    });
  }
  
  return components;
}

/**
 * Forecasts operational expenses
 */
export function forecastOperationalExpenses(
  monthlyOperationalCost: number,
  forecastDays: number = 30
): CashflowComponent[] {
  const components: CashflowComponent[] = [];
  
  const dailyOperationalCost = monthlyOperationalCost / 30;
  
  for (let i = 1; i <= forecastDays; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    
    components.push({
      date,
      category: 'operational',
      amount: -dailyOperationalCost,
      confidence: 0.85,
      notes: `Operational expenses`,
    });
  }
  
  return components;
}

/**
 * Calculates liquidity risk score
 */
export function calculateLiquidityRiskScore(
  cashPosition: number,
  monthlyBurn: number,
  expectedShortage: number
): number {
  let score = 0;
  
  // Runway risk
  const runwayMonths = monthlyBurn > 0 ? cashPosition / monthlyBurn : 12;
  if (runwayMonths < 1) score += 0.5;
  else if (runwayMonths < 3) score += 0.3;
  else if (runwayMonths < 6) score += 0.1;
  
  // Shortage risk
  if (expectedShortage > 0) score += 0.3;
  
  // Volatility risk
  if (monthlyBurn > cashPosition * 0.5) score += 0.2;
  
  return Math.min(1, score);
}

/**
 * Generates cashflow forecast with scenarios
 */
export async function generateCashflowForecast(
  currentCashPosition: number,
  historicalData: {
    dailySales: number[];
    dailyAdSpend: number[];
    dailyCOGS: number[];
    codCollections: number[];
    monthlyPayroll: number;
    monthlyOperational: number;
  },
  forecastDays: number = 30
): Promise<CashflowForecast> {
  console.log('[Cashflow Forecast] Generating forecast...');
  
  const avgDailySales = historicalData.dailySales.reduce((a, b) => a + b, 0) / historicalData.dailySales.length;
  const weeklyTrend = 0.05; // Placeholder
  const seasonalityFactor = 1.0; // Placeholder
  
  // Collect all components
  const allComponents: CashflowComponent[] = [
    ...forecastIncomingCash(historicalData.dailySales, weeklyTrend, seasonalityFactor, forecastDays),
    ...forecastCODCollections(historicalData.codCollections, 0.95, forecastDays),
    ...forecastRefunds(historicalData.dailySales, 0.05, forecastDays),
    ...forecastSupplierPayments(historicalData.dailyCOGS, 30, forecastDays),
    ...forecastPayroll(historicalData.monthlyPayroll, forecastDays),
    ...forecastAdSpend(historicalData.dailyAdSpend, weeklyTrend, forecastDays),
    ...forecastOperationalExpenses(historicalData.monthlyOperational, forecastDays),
  ];
  
  // Calculate scenarios
  const bestCaseComponents = allComponents.map(c => ({
    ...c,
    amount: c.category === 'sales' || c.category === 'cod_collection' ? c.amount * 1.2 : c.amount * 0.9,
  }));
  
  const worstCaseComponents = allComponents.map(c => ({
    ...c,
    amount: c.category === 'sales' || c.category === 'cod_collection' ? c.amount * 0.8 : c.amount * 1.2,
  }));
  
  const calculateScenario = (components: CashflowComponent[]): CashflowScenario => {
    const incoming = components.filter(c => c.amount > 0).reduce((a, b) => a + b.amount, 0);
    const outgoing = components.filter(c => c.amount < 0).reduce((a, b) => a + Math.abs(b.amount), 0);
    const netCashflow = incoming - outgoing;
    
    const finalCashPosition = currentCashPosition + netCashflow;
    const monthlyBurn = outgoing / (forecastDays / 30);
    const runwayDays = monthlyBurn > 0 ? (finalCashPosition / monthlyBurn) * 30 : 365;
    const expectedShortage = Math.max(0, -finalCashPosition);
    
    const riskScore = calculateLiquidityRiskScore(finalCashPosition, monthlyBurn, expectedShortage);
    const riskLevel = riskScore > 0.75 ? 'critical' : riskScore > 0.5 ? 'high' : riskScore > 0.25 ? 'medium' : 'low';
    
    return {
      scenarioType: 'realistic',
      incomingCash: incoming,
      outgoingCash: outgoing,
      netCashflow,
      runwayDays,
      expectedShortage,
      liquidityRiskScore: riskScore,
      riskLevel,
    };
  };
  
  const realistic = calculateScenario(allComponents);
  const bestCase = calculateScenario(bestCaseComponents);
  const worstCase = calculateScenario(worstCaseComponents);
  
  // Generate alerts
  const alerts: CashShortageAlert[] = [];
  if (worstCase.expectedShortage > 0) {
    alerts.push({
      id: `cashflow_alert_${Date.now()}`,
      severity: worstCase.riskLevel as any,
      title: 'Potential Cashflow Shortage',
      description: `In worst-case scenario, expected shortage of $${worstCase.expectedShortage.toFixed(2)}`,
      expectedShortageDate: new Date(Date.now() + worstCase.runwayDays * 24 * 60 * 60 * 1000),
      expectedShortageAmount: worstCase.expectedShortage,
      recommendedAction: 'Secure credit line or reduce operational expenses',
      confidence: 0.7,
    });
  }
  
  // Publish alerts
  for (const alert of alerts) {
    await publishEvent({
      eventType: 'negative_cashflow_alert',
      severity: alert.severity as any,
      title: alert.title,
      description: alert.description,
      metadata: alert,
    });
  }
  
  return {
    forecastDate: new Date(),
    forecastPeriodDays: forecastDays,
    currentCashPosition,
    scenarios: {
      bestCase: { ...bestCase, scenarioType: 'best_case' },
      realistic,
      worstCase: { ...worstCase, scenarioType: 'worst_case' },
    },
    expectedCashShortageAlerts: alerts,
    confidence: 0.75,
  };
}
