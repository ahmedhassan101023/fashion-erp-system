/**
 * Fraud Detection Engine
 * Implements Benford's Law analysis and statistical anomaly detection
 * for financial transaction integrity monitoring.
 *
 * Accounting Intelligence Skill: "Run statistical analysis (e.g., Benford's Law)
 * on transaction data to flag suspicious activity."
 */

export interface BenfordAnalysisResult {
  distribution: Record<string, number>;       // Actual first-digit distribution
  expected: Record<string, number>;           // Benford expected distribution
  chiSquare: number;                          // Chi-square test statistic
  pValue: number;                             // Approximate p-value
  suspiciousDigits: string[];                 // Digits with significant deviation
  riskScore: number;                          // 0–1 overall risk score
  verdict: 'clean' | 'suspicious' | 'high_risk';
  sampleSize: number;
}

export interface TransactionAnomaly {
  transactionId: number | string;
  amount: number;
  type: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  zScore?: number;
}

export interface FraudReport {
  benford: BenfordAnalysisResult;
  anomalies: TransactionAnomaly[];
  roundNumberBias: { count: number; percentage: number; threshold: number };
  duplicates: { count: number; pairs: Array<{ amount: number; occurrences: number }> };
  overallRisk: 'low' | 'medium' | 'high';
  recommendations: string[];
}

/**
 * Benford's Law: The expected frequency of each leading digit (1–9)
 * in naturally occurring financial data.
 */
export const BENFORD_EXPECTED: Record<string, number> = {
  '1': 0.301,
  '2': 0.176,
  '3': 0.125,
  '4': 0.097,
  '5': 0.079,
  '6': 0.067,
  '7': 0.058,
  '8': 0.051,
  '9': 0.046,
};

/**
 * Extract the leading digit from a number.
 */
export function getLeadingDigit(n: number): string | null {
  const abs = Math.abs(n);
  if (abs === 0) return null;
  const str = abs.toString().replace('.', '').replace(/^0+/, '');
  return str[0] || null;
}

/**
 * Compute the actual first-digit distribution from a list of amounts.
 */
export function computeFirstDigitDistribution(amounts: number[]): Record<string, number> {
  const counts: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0 };
  let valid = 0;
  for (const a of amounts) {
    const d = getLeadingDigit(a);
    if (d && d in counts) { counts[d]++; valid++; }
  }
  if (valid === 0) return counts;
  const dist: Record<string, number> = {};
  for (const d of Object.keys(counts)) {
    dist[d] = counts[d] / valid;
  }
  return dist;
}

/**
 * Chi-square goodness-of-fit test against Benford's Law.
 * Returns chi-square statistic and approximate p-value.
 */
export function chiSquareBenford(amounts: number[]): { chiSquare: number; pValue: number } {
  const n = amounts.filter(a => getLeadingDigit(a) !== null).length;
  if (n < 30) return { chiSquare: 0, pValue: 1 }; // Too few samples

  const observed = computeFirstDigitDistribution(amounts);
  let chi2 = 0;
  for (const d of Object.keys(BENFORD_EXPECTED)) {
    const expected = BENFORD_EXPECTED[d] * n;
    const obs = (observed[d] || 0) * n;
    chi2 += Math.pow(obs - expected, 2) / expected;
  }

  // Approximate p-value using chi-square CDF with 8 degrees of freedom
  // Using Wilson-Hilferty approximation
  const df = 8;
  const pValue = approximatePValue(chi2, df);

  return { chiSquare: chi2, pValue };
}

/**
 * Approximate chi-square p-value using Wilson-Hilferty normal approximation.
 */
function approximatePValue(chi2: number, df: number): number {
  // Wilson-Hilferty approximation: chi2 ~ N(df, 2*df) approximately
  const z = (Math.pow(chi2 / df, 1 / 3) - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df));
  // Standard normal CDF approximation (Abramowitz and Stegun)
  return 1 - normalCDF(z);
}

function normalCDF(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const pdf = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  const cdf = 1 - pdf * poly;
  return z >= 0 ? cdf : 1 - cdf;
}

/**
 * Full Benford's Law analysis on a set of transaction amounts.
 */
export function analyzeBenford(amounts: number[]): BenfordAnalysisResult {
  const validAmounts = amounts.filter(a => Math.abs(a) >= 1);
  const sampleSize = validAmounts.length;

  if (sampleSize < 30) {
    return {
      distribution: computeFirstDigitDistribution(validAmounts),
      expected: BENFORD_EXPECTED,
      chiSquare: 0,
      pValue: 1,
      suspiciousDigits: [],
      riskScore: 0,
      verdict: 'clean',
      sampleSize,
    };
  }

  const distribution = computeFirstDigitDistribution(validAmounts);
  const { chiSquare, pValue } = chiSquareBenford(validAmounts);

  // Identify digits with > 2x deviation from expected
  const suspiciousDigits: string[] = [];
  for (const d of Object.keys(BENFORD_EXPECTED)) {
    const actual = distribution[d] || 0;
    const expected = BENFORD_EXPECTED[d];
    if (Math.abs(actual - expected) / expected > 0.5) {
      suspiciousDigits.push(d);
    }
  }

  // Risk score: based on chi-square and p-value
  let riskScore = 0;
  if (pValue < 0.01) riskScore = 0.9;
  else if (pValue < 0.05) riskScore = 0.6;
  else if (pValue < 0.1) riskScore = 0.3;
  else riskScore = Math.min(0.2, chiSquare / 50);

  const verdict: BenfordAnalysisResult['verdict'] =
    riskScore >= 0.7 ? 'high_risk' : riskScore >= 0.35 ? 'suspicious' : 'clean';

  return {
    distribution,
    expected: BENFORD_EXPECTED,
    chiSquare,
    pValue,
    suspiciousDigits,
    riskScore,
    verdict,
    sampleSize,
  };
}

/**
 * Detect statistically anomalous transaction amounts using z-score method.
 * Flags transactions beyond ±3 standard deviations.
 */
export function detectAmountAnomalies(
  transactions: Array<{ id: number | string; amount: number; type: string }>,
  zThreshold = 3.0
): TransactionAnomaly[] {
  if (transactions.length < 5) return [];

  const amounts = transactions.map(t => t.amount);
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const variance = amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / amounts.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return [];

  const anomalies: TransactionAnomaly[] = [];
  for (const t of transactions) {
    const z = (t.amount - mean) / stdDev;
    if (Math.abs(z) >= zThreshold) {
      anomalies.push({
        transactionId: t.id,
        amount: t.amount,
        type: t.type,
        reason: z > 0
          ? `مبلغ مرتفع بشكل غير عادي (${z.toFixed(1)} انحراف معياري فوق المتوسط)`
          : `مبلغ منخفض بشكل غير عادي (${Math.abs(z).toFixed(1)} انحراف معياري تحت المتوسط)`,
        severity: Math.abs(z) >= 5 ? 'high' : Math.abs(z) >= 4 ? 'medium' : 'low',
        zScore: z,
      });
    }
  }

  return anomalies;
}

/**
 * Detect round-number bias (e.g., 1000, 5000, 10000).
 * High frequency of round numbers can indicate manual data entry manipulation.
 */
export function detectRoundNumberBias(amounts: number[]): { count: number; percentage: number; threshold: number } {
  const threshold = 0.15; // Flag if > 15% are round numbers
  const roundCount = amounts.filter(a => {
    const abs = Math.abs(a);
    return abs >= 100 && abs % 100 === 0;
  }).length;
  const percentage = amounts.length > 0 ? roundCount / amounts.length : 0;
  return { count: roundCount, percentage, threshold };
}

/**
 * Detect duplicate transaction amounts that appear suspiciously often.
 */
export function detectDuplicateAmounts(
  amounts: number[]
): { count: number; pairs: Array<{ amount: number; occurrences: number }> } {
  const freq: Record<number, number> = {};
  for (const a of amounts) {
    freq[a] = (freq[a] || 0) + 1;
  }

  const suspicious = Object.entries(freq)
    .filter(([, count]) => count >= 3)
    .map(([amount, occurrences]) => ({ amount: Number(amount), occurrences }))
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 10);

  return { count: suspicious.length, pairs: suspicious };
}

/**
 * Run a comprehensive fraud analysis on a set of transactions.
 */
export function runFraudAnalysis(
  transactions: Array<{ id: number | string; amount: number; type: string }>
): FraudReport {
  const amounts = transactions.map(t => t.amount);

  const benford = analyzeBenford(amounts);
  const anomalies = detectAmountAnomalies(transactions);
  const roundNumberBias = detectRoundNumberBias(amounts);
  const duplicates = detectDuplicateAmounts(amounts);

  // Aggregate risk
  let riskFactors = 0;
  if (benford.verdict === 'high_risk') riskFactors += 3;
  else if (benford.verdict === 'suspicious') riskFactors += 1;
  if (anomalies.filter(a => a.severity === 'high').length > 0) riskFactors += 2;
  if (roundNumberBias.percentage > roundNumberBias.threshold) riskFactors += 1;
  if (duplicates.count > 5) riskFactors += 1;

  const overallRisk: FraudReport['overallRisk'] =
    riskFactors >= 4 ? 'high' : riskFactors >= 2 ? 'medium' : 'low';

  const recommendations: string[] = [];
  if (benford.verdict !== 'clean') {
    recommendations.push('مراجعة توزيع الأرقام الأولى في المعاملات - يوجد انحراف عن قانون بنفورد');
  }
  if (anomalies.length > 0) {
    recommendations.push(`فحص ${anomalies.length} معاملة بمبالغ غير عادية إحصائياً`);
  }
  if (roundNumberBias.percentage > roundNumberBias.threshold) {
    recommendations.push(`${(roundNumberBias.percentage * 100).toFixed(1)}% من المعاملات بأرقام مستديرة - قد يشير لإدخال يدوي`);
  }
  if (duplicates.count > 0) {
    recommendations.push(`اكتشاف ${duplicates.count} مبلغ متكرر بشكل مشبوه - تحقق من التكرار`);
  }
  if (recommendations.length === 0) {
    recommendations.push('لم يتم اكتشاف أي مؤشرات احتيال - البيانات تبدو طبيعية');
  }

  return { benford, anomalies, roundNumberBias, duplicates, overallRisk, recommendations };
}
