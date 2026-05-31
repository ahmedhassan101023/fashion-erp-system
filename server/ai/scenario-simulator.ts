/**
 * What-If Scenario Simulator
 * Implements CFO-level financial scenario analysis.
 *
 * Accounting Intelligence Skill: "Create 'What-if' scenarios for ad spend increases,
 * return rate changes, or shipping cost fluctuations."
 */

export interface BaselineMetrics {
  monthlyRevenue: number;
  monthlyOrders: number;
  avgOrderValue: number;
  grossMarginPercent: number;    // e.g. 0.45 = 45%
  adSpend: number;
  returnRate: number;            // e.g. 0.05 = 5%
  shippingCostPerOrder: number;
  cac: number;                   // Cost to acquire one customer
  operationalOverhead: number;   // Monthly fixed costs
  taxRate: number;               // e.g. 0.14 = 14%
}

export interface ScenarioInput {
  name: string;
  description: string;
  changes: {
    adSpendMultiplier?: number;       // e.g. 1.5 = +50% ad spend
    returnRateDelta?: number;         // e.g. +0.02 = return rate increases by 2pp
    shippingCostDelta?: number;       // e.g. +5 = shipping cost increases by 5 EGP
    avgOrderValueDelta?: number;      // e.g. +50 = AOV increases by 50 EGP
    grossMarginDelta?: number;        // e.g. -0.03 = margin drops 3pp
    operationalOverheadDelta?: number;// e.g. +5000 = overhead increases by 5000
    roasTarget?: number;              // Target ROAS for ad spend optimization
  };
}

export interface ScenarioResult {
  name: string;
  description: string;
  baseline: ScenarioFinancials;
  projected: ScenarioFinancials;
  delta: ScenarioDelta;
  verdict: 'highly_profitable' | 'profitable' | 'break_even' | 'loss';
  confidence: number;
  insights: string[];
}

export interface ScenarioFinancials {
  revenue: number;
  grossProfit: number;
  adSpend: number;
  shippingCosts: number;
  returnCosts: number;
  operationalOverhead: number;
  netProfit: number;
  netMarginPercent: number;
  roas: number;
  breakEvenRoas: number;
  orders: number;
}

export interface ScenarioDelta {
  revenueDelta: number;
  netProfitDelta: number;
  netMarginDelta: number;
  roasDelta: number;
  percentNetProfitChange: number;
}

/**
 * Calculate financials from baseline metrics + scenario changes.
 */
function computeFinancials(
  baseline: BaselineMetrics,
  changes: ScenarioInput['changes']
): ScenarioFinancials {
  // Apply changes
  const adSpend = baseline.adSpend * (changes.adSpendMultiplier ?? 1);
  const returnRate = Math.max(0, baseline.returnRate + (changes.returnRateDelta ?? 0));
  const shippingCostPerOrder = Math.max(0, baseline.shippingCostPerOrder + (changes.shippingCostDelta ?? 0));
  const avgOrderValue = Math.max(0, baseline.avgOrderValue + (changes.avgOrderValueDelta ?? 0));
  const grossMarginPercent = Math.max(0, Math.min(1, baseline.grossMarginPercent + (changes.grossMarginDelta ?? 0)));
  const operationalOverhead = Math.max(0, baseline.operationalOverhead + (changes.operationalOverheadDelta ?? 0));

  // Estimate orders: if ad spend changes, orders scale with ROAS assumption
  const adSpendRatio = adSpend / (baseline.adSpend || 1);
  const orders = Math.round(baseline.monthlyOrders * Math.sqrt(adSpendRatio)); // Diminishing returns

  // Revenue
  const grossRevenue = orders * avgOrderValue;
  const returnCosts = grossRevenue * returnRate;
  const revenue = grossRevenue - returnCosts;

  // Costs
  const grossProfit = revenue * grossMarginPercent;
  const shippingCosts = orders * shippingCostPerOrder;

  // Net profit
  const netProfit = grossProfit - adSpend - shippingCosts - operationalOverhead;

  // ROAS
  const roas = adSpend > 0 ? revenue / adSpend : 0;

  // Break-even ROAS: the minimum ROAS to cover all non-ad costs
  const nonAdCosts = shippingCosts + operationalOverhead + (revenue * (1 - grossMarginPercent));
  const breakEvenRoas = adSpend > 0 ? nonAdCosts / adSpend : 0;

  return {
    revenue,
    grossProfit,
    adSpend,
    shippingCosts,
    returnCosts,
    operationalOverhead,
    netProfit,
    netMarginPercent: revenue > 0 ? (netProfit / revenue) * 100 : 0,
    roas,
    breakEvenRoas,
    orders,
  };
}

/**
 * Run a single what-if scenario against the baseline.
 */
export function runScenario(
  baseline: BaselineMetrics,
  scenario: ScenarioInput
): ScenarioResult {
  const baselineFinancials = computeFinancials(baseline, {});
  const projectedFinancials = computeFinancials(baseline, scenario.changes);

  const delta: ScenarioDelta = {
    revenueDelta: projectedFinancials.revenue - baselineFinancials.revenue,
    netProfitDelta: projectedFinancials.netProfit - baselineFinancials.netProfit,
    netMarginDelta: projectedFinancials.netMarginPercent - baselineFinancials.netMarginPercent,
    roasDelta: projectedFinancials.roas - baselineFinancials.roas,
    percentNetProfitChange: baselineFinancials.netProfit !== 0
      ? ((projectedFinancials.netProfit - baselineFinancials.netProfit) / Math.abs(baselineFinancials.netProfit)) * 100
      : 0,
  };

  // Verdict
  const margin = projectedFinancials.netMarginPercent;
  const verdict: ScenarioResult['verdict'] =
    margin >= 20 ? 'highly_profitable' :
    margin >= 5 ? 'profitable' :
    margin >= 0 ? 'break_even' : 'loss';

  // Confidence: higher with fewer simultaneous changes
  const changeCount = Object.keys(scenario.changes).length;
  const confidence = Math.max(0.4, 1 - changeCount * 0.1);

  // Insights
  const insights: string[] = [];
  if (delta.netProfitDelta > 0) {
    insights.push(`✅ الربح الصافي سيرتفع بمقدار ${Math.abs(delta.netProfitDelta).toLocaleString('ar-EG')} جنيه (+${delta.percentNetProfitChange.toFixed(1)}%)`);
  } else {
    insights.push(`⚠️ الربح الصافي سينخفض بمقدار ${Math.abs(delta.netProfitDelta).toLocaleString('ar-EG')} جنيه (${delta.percentNetProfitChange.toFixed(1)}%)`);
  }

  if (scenario.changes.adSpendMultiplier && scenario.changes.adSpendMultiplier > 1) {
    const roasOk = projectedFinancials.roas > projectedFinancials.breakEvenRoas;
    insights.push(roasOk
      ? `✅ ROAS المتوقع (${projectedFinancials.roas.toFixed(2)}x) يتجاوز نقطة التعادل (${projectedFinancials.breakEvenRoas.toFixed(2)}x)`
      : `❌ ROAS المتوقع (${projectedFinancials.roas.toFixed(2)}x) أقل من نقطة التعادل (${projectedFinancials.breakEvenRoas.toFixed(2)}x)`
    );
  }

  if (scenario.changes.returnRateDelta && scenario.changes.returnRateDelta > 0) {
    insights.push(`📦 ارتفاع معدل الإرجاع سيكلف إضافياً ${Math.abs(projectedFinancials.returnCosts - baselineFinancials.returnCosts).toLocaleString('ar-EG')} جنيه شهرياً`);
  }

  if (scenario.changes.shippingCostDelta && scenario.changes.shippingCostDelta > 0) {
    insights.push(`🚚 ارتفاع تكلفة الشحن سيضيف ${Math.abs(projectedFinancials.shippingCosts - baselineFinancials.shippingCosts).toLocaleString('ar-EG')} جنيه للتكاليف`);
  }

  return {
    name: scenario.name,
    description: scenario.description,
    baseline: baselineFinancials,
    projected: projectedFinancials,
    delta,
    verdict,
    confidence,
    insights,
  };
}

/**
 * Run multiple scenarios and return a comparison.
 */
export function runScenarioComparison(
  baseline: BaselineMetrics,
  scenarios: ScenarioInput[]
): ScenarioResult[] {
  return scenarios.map(s => runScenario(baseline, s));
}

/**
 * Generate standard CFO scenario set for a given baseline.
 */
export function generateStandardScenarios(baseline: BaselineMetrics): ScenarioInput[] {
  return [
    {
      name: 'زيادة الإنفاق الإعلاني 50%',
      description: 'ماذا لو زدنا الإنفاق على Meta Ads بنسبة 50%؟',
      changes: { adSpendMultiplier: 1.5 },
    },
    {
      name: 'ارتفاع معدل الإرجاع 5%',
      description: 'ماذا لو ارتفع معدل الإرجاع بـ 5 نقاط مئوية؟',
      changes: { returnRateDelta: 0.05 },
    },
    {
      name: 'ارتفاع تكلفة الشحن 20 جنيه',
      description: 'تأثير ارتفاع تكلفة الشحن بمقدار 20 جنيه للطلب',
      changes: { shippingCostDelta: 20 },
    },
    {
      name: 'تحسين متوسط قيمة الطلب 15%',
      description: 'تأثير رفع متوسط قيمة الطلب بنسبة 15%',
      changes: { avgOrderValueDelta: baseline.avgOrderValue * 0.15 },
    },
    {
      name: 'السيناريو المتشائم',
      description: 'ارتفاع الشحن + ارتفاع الإرجاع + انخفاض الهامش',
      changes: {
        shippingCostDelta: 15,
        returnRateDelta: 0.03,
        grossMarginDelta: -0.05,
      },
    },
    {
      name: 'السيناريو المتفائل',
      description: 'زيادة الإنفاق الإعلاني + تحسين متوسط الطلب + تحسين الهامش',
      changes: {
        adSpendMultiplier: 1.3,
        avgOrderValueDelta: baseline.avgOrderValue * 0.1,
        grossMarginDelta: 0.03,
      },
    },
  ];
}
