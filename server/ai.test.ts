import { describe, expect, it } from "vitest";
import {
  calculateZScore,
  calculateRollingAverage,
  calculateStdDev,
} from "./ai/anomaly-detection";
import {
  calculateSalesVelocity,
  calculateWeeklyTrend,
  calculateSeasonalityFactor,
  calculateReorderQuantity,
  calculateRiskScore,
} from "./ai/inventory-forecast";
import {
  forecastIncomingCash,
  forecastCODCollections,
  forecastRefunds,
} from "./ai/cashflow-forecast";
import {
  calculateTrueNetMargin,
} from "./ai/profitability-intelligence";

describe("Anomaly Detection - Statistical Functions", () => {
  it("calculates z-score correctly", () => {
    // value=10, mean=5, stdDev=2 → z = (10-5)/2 = 2.5
    expect(calculateZScore(10, 5, 2)).toBe(2.5);
  });

  it("returns 0 z-score when stdDev is 0", () => {
    expect(calculateZScore(10, 5, 0)).toBe(0);
  });

  it("calculates negative z-score for values below mean", () => {
    // value=2, mean=5, stdDev=2 → z = (2-5)/2 = -1.5
    expect(calculateZScore(2, 5, 2)).toBe(-1.5);
  });

  it("calculates rolling average correctly", () => {
    const values = [10, 20, 30, 40, 50];
    const result = calculateRollingAverage(values, 3);
    // Window of 3: [10], [10,20], [10,20,30], [20,30,40], [30,40,50]
    expect(result[0]).toBeCloseTo(10);
    expect(result[1]).toBeCloseTo(15);
    expect(result[2]).toBeCloseTo(20);
    expect(result[3]).toBeCloseTo(30);
    expect(result[4]).toBeCloseTo(40);
  });

  it("calculates standard deviation correctly", () => {
    const values = [2, 4, 4, 4, 5, 5, 7, 9];
    const stdDev = calculateStdDev(values);
    // Known stdDev for this dataset ≈ 2.0
    expect(stdDev).toBeGreaterThan(1.5);
    expect(stdDev).toBeLessThan(2.5);
  });

  it("returns 0 stdDev for empty array", () => {
    expect(calculateStdDev([])).toBe(0);
  });
});

describe("Inventory Forecast - Calculations", () => {
  it("calculates sales velocity correctly", () => {
    const salesData = [10, 12, 8, 14, 10, 11, 9];
    const velocity = calculateSalesVelocity(salesData, 7);
    // Average of last 7 days
    expect(velocity).toBeCloseTo(74 / 7, 1);
  });

  it("calculates weekly trend correctly (requires 14+ data points)", () => {
    // Increasing trend - need 14+ data points
    const increasing = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
    const trend = calculateWeeklyTrend(increasing);
    expect(trend).toBeGreaterThan(0);

    // Decreasing trend
    const decreasing = [23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10];
    const trendDown = calculateWeeklyTrend(decreasing);
    expect(trendDown).toBeLessThan(0);

    // Returns 0 for insufficient data
    const short = [10, 12, 14, 16, 18, 20, 22];
    expect(calculateWeeklyTrend(short)).toBe(0);
  });

  it("calculates seasonality factor (returns 1.0 for < 365 data points)", () => {
    const monthlySales = [100, 80, 90, 120, 150, 200, 180, 160, 140, 130, 110, 100];
    // With less than 365 data points, should return 1.0
    const factor = calculateSeasonalityFactor(monthlySales, 5);
    expect(factor).toBe(1.0);
  });

  it("calculates reorder quantity with safety stock", () => {
    // calculateReorderQuantity(dailyVelocity, leadTimeDays=7, safetyStock=14)
    // reorderPoint = 10 * 7 + 10 * 14 = 70 + 140 = 210
    // eoq = ceil(210 * 1.5) = 315
    // min = ceil(10 * 7) = 70
    // result = max(315, 70) = 315
    const quantity = calculateReorderQuantity(10, 7, 14);
    expect(quantity).toBe(315);
  });

  it("calculates risk score between 0 and 1", () => {
    const score = calculateRiskScore(5, 10, 2, 0.8); // low stock, high velocity
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe("Cashflow Forecast - Projections", () => {
  it("forecasts incoming cash with positive trend", () => {
    const historicalSales = [5000, 5500, 6000, 5800, 6200];
    const components = forecastIncomingCash(historicalSales, 0.05, 1.0, 7);
    expect(components.length).toBe(7);
    // All should be positive amounts
    components.forEach(c => {
      expect(c.amount).toBeGreaterThan(0);
      expect(c.category).toBe('sales');
    });
  });

  it("forecasts COD collections with lag (starts after day 2)", () => {
    const historicalCOD = [3000, 3200, 2800, 3500, 3100];
    const components = forecastCODCollections(historicalCOD, 0.95, 7);
    // COD collections start after day 2, so 7-2=5 components
    expect(components.length).toBe(5);
    components.forEach(c => {
      expect(c.amount).toBeGreaterThan(0);
      expect(c.category).toBe('cod_collection');
    });
  });

  it("forecasts refunds as negative amounts (starts after day 5)", () => {
    const historicalSales = [5000, 5500, 6000, 5800, 6200];
    const components = forecastRefunds(historicalSales, 0.05, 7);
    // Refunds start after day 5, so 7-5=2 components
    expect(components.length).toBe(2);
    components.forEach(c => {
      expect(c.amount).toBeLessThan(0);
      expect(c.category).toBe('refunds');
    });
  });
});

describe("Profitability Intelligence - Margin Calculation", () => {
  // Signature: calculateTrueNetMargin(revenue, cogs, adSpend, shippingCost, refunds, failedDeliveries, operationalOverhead)
  it("calculates true net margin correctly", () => {
    const result = calculateTrueNetMargin(
      1000,  // revenue
      400,   // cogs
      100,   // adSpend
      50,    // shippingCost
      30,    // refunds
      20,    // failedDeliveries
      50     // operationalOverhead
    );
    // totalCosts = 400 + 100 + 50 + 30 + 20 + 50 = 650
    // netProfit = 1000 - 650 = 350
    // netMarginPercent = (350/1000)*100 = 35
    expect(result.netProfit).toBe(350);
    expect(result.netMarginPercent).toBeCloseTo(35);
  });

  it("identifies losing orders with negative margin", () => {
    const result = calculateTrueNetMargin(
      500,   // revenue
      300,   // cogs
      150,   // adSpend
      100,   // shippingCost
      50,    // refunds
      25,    // failedDeliveries
      50     // operationalOverhead
    );
    // totalCosts = 300 + 150 + 100 + 50 + 25 + 50 = 675
    // netProfit = 500 - 675 = -175
    expect(result.netProfit).toBeLessThan(0);
    expect(result.netMarginPercent).toBeLessThan(0);
  });

  it("handles zero revenue gracefully", () => {
    const result = calculateTrueNetMargin(0, 100, 50, 20, 10, 50, 30);
    // totalCosts = 100 + 50 + 20 + 10 + 50 + 30 = 260
    // netProfit = 0 - 260 = -260
    expect(result.netProfit).toBe(-260);
    // When revenue is 0, margin should be 0 (not infinity)
    expect(result.netMarginPercent).toBe(0);
  });
});
