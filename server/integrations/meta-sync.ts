import {
  getMetaAdsIntegration,
  getMetaCampaigns,
  getOrdersByDateRange,
  getOrderProfitability,
} from '../queries';
import {
  fetchMetaCampaigns,
  calculateRoas,
  calculateCACFromSpend,
  calculateCPP,
  calculateCTR,
  calculateCPM,
  calculateCPC,
  calculateConversionRate,
} from './meta';
import { publishEvent } from '../events';

/**
 * Meta Ads Synchronization Engine
 * Handles: campaign sync, attribution reconciliation, spend normalization, blended ROAS, MER, CAC calculations
 */

export interface CampaignMetrics {
  campaignId: string;
  campaignName: string;
  spend: number;
  revenue: number;
  roas: number;
  cac: number;
  cpp: number;
  ctr: number;
  cpm: number;
  cpc: number;
  conversions: number;
  conversionRate: number;
  impressions: number;
  clicks: number;
  status: string;
  startDate: Date;
  endDate: Date;
}

export interface AttributionData {
  orderId: number;
  campaignId: string;
  campaignName: string;
  adsetId: string;
  adId: string;
  revenue: number;
  cost: number;
  profit: number;
  profitMargin: number;
}

export interface BlendedMetrics {
  totalSpend: number;
  totalRevenue: number;
  blendedRoas: number;
  totalCac: number;
  averageCac: number;
  totalCpp: number;
  totalConversions: number;
  totalImpressions: number;
  totalClicks: number;
  blendedCtr: number;
  blendedCpm: number;
  blendedCpc: number;
  blendedConversionRate: number;
  profitableOrders: number;
  losingOrders: number;
  mer: number; // Marketing Efficiency Ratio
}

/**
 * Syncs Meta campaigns and calculates metrics
 */
export async function syncMetaCampaigns(
  businessAccountId: string,
  accessToken: string,
  startDate: Date,
  endDate: Date
): Promise<CampaignMetrics[]> {
  try {
    console.log(`[Meta Sync] Starting campaign sync for ${businessAccountId}`);

    // Fetch campaigns from Meta API
    const metaCampaigns = await fetchMetaCampaigns(businessAccountId, accessToken);

    const campaignMetrics: CampaignMetrics[] = [];

    for (const campaign of metaCampaigns) {
      try {
        // Get orders attributed to this campaign
        const attributedOrders = await getOrdersByDateRange(startDate, endDate);
        const campaignOrders = attributedOrders.filter(
          order => order.metaCampaignId === campaign.id
        );

        // Calculate revenue from attributed orders
        let campaignRevenue = 0;
        let profitableCount = 0;
        let losingCount = 0;

        for (const order of campaignOrders) {
          campaignRevenue += parseFloat(order.totalRevenue as any) || 0;
          const profitability = await getOrderProfitability(order.id);
          if (profitability) {
            if (profitability.profitabilityStatus === 'profitable') {
              profitableCount++;
            } else if (profitability.profitabilityStatus === 'losing') {
              losingCount++;
            }
          }
        }

        const spend = parseFloat(campaign.spend as any) || 0;
        const roas = calculateRoas(campaignRevenue, spend);
        const cac = calculateCACFromSpend(spend, campaignOrders.length);
        const cpp = calculateCPP(spend, campaignOrders.length);
        const ctr = calculateCTR(
          parseInt(campaign.clicks as any) || 0,
          parseInt(campaign.impressions as any) || 0
        );
        const cpm = calculateCPM(spend, parseInt(campaign.impressions as any) || 0);
        const cpc = calculateCPC(spend, parseInt(campaign.clicks as any) || 0);
        const conversionRate = calculateConversionRate(
          parseInt(campaign.conversions as any) || 0,
          parseInt(campaign.clicks as any) || 0
        );

        const metrics: CampaignMetrics = {
          campaignId: campaign.id,
          campaignName: campaign.name || 'Unknown Campaign',
          spend,
          revenue: campaignRevenue,
          roas,
          cac,
          cpp,
          ctr,
          cpm,
          cpc,
          conversions: parseInt(campaign.conversions as any) || 0,
          conversionRate,
          impressions: parseInt(campaign.impressions as any) || 0,
          clicks: parseInt(campaign.clicks as any) || 0,
          status: campaign.status || 'unknown',
          startDate: new Date(campaign.start_date),
          endDate: new Date(campaign.end_date),
        };

        campaignMetrics.push(metrics);

        // Detect losing campaigns
        if (roas < 3 && spend > 100) {
          await publishEvent({
            eventType: 'losing_campaign_detected',
            severity: 'warning',
            title: 'Losing Campaign Detected',
            description: `Campaign "${campaign.name}" has ROAS of ${roas.toFixed(2)} (threshold: 3.0)`,
            metadata: {
              campaignId: campaign.id,
              campaignName: campaign.name,
              roas,
              spend,
              revenue: campaignRevenue,
              profitableOrders: profitableCount,
              losingOrders: losingCount,
            },
          });
        }
      } catch (error) {
        console.error(`[Meta Sync] Error processing campaign ${campaign.id}:`, error);
      }
    }

    console.log(`[Meta Sync] Synced ${campaignMetrics.length} campaigns`);
    return campaignMetrics;
  } catch (error) {
    console.error('[Meta Sync] Error syncing campaigns:', error);
    throw error;
  }
}

/**
 * Reconciles campaign attribution with Shopify orders
 */
export async function reconcileAttribution(
  startDate: Date,
  endDate: Date
): Promise<AttributionData[]> {
  try {
    console.log(`[Attribution] Starting reconciliation for ${startDate} to ${endDate}`);

    const orders = await getOrdersByDateRange(startDate, endDate);
    const attributionData: AttributionData[] = [];

    for (const order of orders) {
      if (!order.metaCampaignId) continue;

      const profitability = await getOrderProfitability(order.id);
      if (!profitability) continue;

      const revenue = parseFloat(order.totalRevenue as any) || 0;
      const cost = parseFloat(profitability.totalCost as any) || 0;
      const profit = revenue - cost;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

      attributionData.push({
        orderId: order.id,
        campaignId: order.metaCampaignId,
        campaignName: `Campaign ${order.metaCampaignId}`,
        adsetId: order.metaAdsetId || 'unknown',
        adId: order.metaAdId || 'unknown',
        revenue,
        cost,
        profit,
        profitMargin,
      });
    }

    console.log(`[Attribution] Reconciled ${attributionData.length} orders`);
    return attributionData;
  } catch (error) {
    console.error('[Attribution] Error reconciling attribution:', error);
    throw error;
  }
}

/**
 * Calculates blended metrics across all campaigns
 */
export async function calculateBlendedMetrics(
  campaignMetrics: CampaignMetrics[]
): Promise<BlendedMetrics> {
  const totalSpend = campaignMetrics.reduce((sum, c) => sum + c.spend, 0);
  const totalRevenue = campaignMetrics.reduce((sum, c) => sum + c.revenue, 0);
  const totalConversions = campaignMetrics.reduce((sum, c) => sum + c.conversions, 0);
  const totalImpressions = campaignMetrics.reduce((sum, c) => sum + c.impressions, 0);
  const totalClicks = campaignMetrics.reduce((sum, c) => sum + c.clicks, 0);

  const blendedRoas = calculateRoas(totalRevenue, totalSpend);
  const totalCac = campaignMetrics.reduce((sum, c) => sum + c.cac * c.conversions, 0);
  const averageCac = totalConversions > 0 ? totalCac / totalConversions : 0;
  const totalCpp = campaignMetrics.reduce((sum, c) => sum + c.cpp * c.conversions, 0);
  const blendedCtr = calculateCTR(totalClicks, totalImpressions);
  const blendedCpm = calculateCPM(totalSpend, totalImpressions);
  const blendedCpc = calculateCPC(totalSpend, totalClicks);
  const blendedConversionRate = calculateConversionRate(totalConversions, totalClicks);

  // MER (Marketing Efficiency Ratio) = Revenue / Marketing Spend
  const mer = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  // Count profitable vs losing campaigns
  let profitableOrders = 0;
  let losingOrders = 0;

  for (const metric of campaignMetrics) {
    if (metric.roas >= 3) {
      profitableOrders++;
    } else if (metric.roas < 3 && metric.spend > 0) {
      losingOrders++;
    }
  }

  return {
    totalSpend,
    totalRevenue,
    blendedRoas,
    totalCac,
    averageCac,
    totalCpp,
    totalConversions,
    totalImpressions,
    totalClicks,
    blendedCtr,
    blendedCpm,
    blendedCpc,
    blendedConversionRate,
    profitableOrders,
    losingOrders,
    mer,
  };
}

/**
 * Normalizes spend across different time zones and currencies
 */
export function normalizeSpend(
  spend: number,
  currency: string,
  exchangeRates: Record<string, number> = {}
): number {
  // Default to USD if no exchange rate provided
  const rate = exchangeRates[currency] || 1;
  return spend * rate;
}

/**
 * Calculates CAC by campaign, adset, and ad level
 */
export async function calculateCAChierarchy(
  startDate: Date,
  endDate: Date
): Promise<{
  byCampaign: Record<string, number>;
  byAdset: Record<string, number>;
  byAd: Record<string, number>;
}> {
  const orders = await getOrdersByDateRange(startDate, endDate);

  const byCampaign: Record<string, number> = {};
  const byAdset: Record<string, number> = {};
  const byAd: Record<string, number> = {};

  const campaignSpend: Record<string, number> = {};
  const campaignConversions: Record<string, number> = {};
  const adsetSpend: Record<string, number> = {};
  const adsetConversions: Record<string, number> = {};
  const adSpend: Record<string, number> = {};
  const adConversions: Record<string, number> = {};

  for (const order of orders) {
    if (order.metaCampaignId) {
      // Estimate spend per order (simplified)
      const orderValue = parseFloat(order.totalRevenue as any) || 0;
      const estimatedSpend = orderValue * 0.15; // Assume 15% ad spend ratio

      campaignSpend[order.metaCampaignId] =
        (campaignSpend[order.metaCampaignId] || 0) + estimatedSpend;
      campaignConversions[order.metaCampaignId] =
        (campaignConversions[order.metaCampaignId] || 0) + 1;

      if (order.metaAdsetId) {
        adsetSpend[order.metaAdsetId] = (adsetSpend[order.metaAdsetId] || 0) + estimatedSpend;
        adsetConversions[order.metaAdsetId] = (adsetConversions[order.metaAdsetId] || 0) + 1;
      }

      if (order.metaAdId) {
        adSpend[order.metaAdId] = (adSpend[order.metaAdId] || 0) + estimatedSpend;
        adConversions[order.metaAdId] = (adConversions[order.metaAdId] || 0) + 1;
      }
    }
  }

  // Calculate CAC at each level
  for (const [campaignId, spend] of Object.entries(campaignSpend)) {
    const conversions = campaignConversions[campaignId] || 1;
    byCampaign[campaignId] = spend / conversions;
  }

  for (const [adsetId, spend] of Object.entries(adsetSpend)) {
    const conversions = adsetConversions[adsetId] || 1;
    byAdset[adsetId] = spend / conversions;
  }

  for (const [adId, spend] of Object.entries(adSpend)) {
    const conversions = adConversions[adId] || 1;
    byAd[adId] = spend / conversions;
  }

  return { byCampaign, byAdset, byAd };
}

/**
 * Generates comprehensive Meta Ads report
 */
export async function generateMetaAdsReport(
  businessAccountId: string,
  accessToken: string,
  startDate: Date,
  endDate: Date
): Promise<{
  campaigns: CampaignMetrics[];
  attribution: AttributionData[];
  blended: BlendedMetrics;
  cacheHierarchy: {
    byCampaign: Record<string, number>;
    byAdset: Record<string, number>;
    byAd: Record<string, number>;
  };
}> {
  console.log(`[Meta Report] Generating report for ${startDate} to ${endDate}`);

  const campaigns = await syncMetaCampaigns(businessAccountId, accessToken, startDate, endDate);
  const attribution = await reconcileAttribution(startDate, endDate);
  const blended = await calculateBlendedMetrics(campaigns);
  const cacheHierarchy = await calculateCAChierarchy(startDate, endDate);

  return {
    campaigns,
    attribution,
    blended,
    cacheHierarchy,
  };
}
