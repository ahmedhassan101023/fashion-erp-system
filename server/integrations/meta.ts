import { getMetaAdsIntegration, getMetaCampaignById } from "../queries";
import { onLosingCampaignDetected } from "../events";

/**
 * Meta Ads Integration Module
 * Handles campaign sync, ROAS calculation, and performance tracking
 */

export interface MetaCampaignData {
  id: string;
  name: string;
  status: string;
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  start_date: string;
  end_date: string;
}

export interface MetaAdsetData {
  id: string;
  campaign_id: string;
  name: string;
  status: string;
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

export interface MetaAdData {
  id: string;
  adset_id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

/**
 * Fetches campaigns from Meta Ads API
 */
export async function fetchMetaCampaigns(
  businessAccountId: string,
  accessToken: string,
  fields: string[] = [
    'id',
    'name',
    'status',
    'budget',
    'spend',
    'impressions',
    'clicks',
    'conversions',
    'start_date',
    'end_date',
  ]
): Promise<MetaCampaignData[]> {
  try {
    const url = `https://graph.facebook.com/v18.0/${businessAccountId}/campaigns`;
    const params = new URLSearchParams({
      fields: fields.join(','),
      access_token: accessToken,
    });

    const response = await fetch(`${url}?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Meta API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Failed to fetch Meta campaigns:', error);
    throw error;
  }
}

/**
 * Fetches adsets from Meta Ads API
 */
export async function fetchMetaAdsets(
  campaignId: string,
  accessToken: string,
  fields: string[] = [
    'id',
    'name',
    'status',
    'budget',
    'spend',
    'impressions',
    'clicks',
    'conversions',
  ]
): Promise<MetaAdsetData[]> {
  try {
    const url = `https://graph.facebook.com/v18.0/${campaignId}/adsets`;
    const params = new URLSearchParams({
      fields: fields.join(','),
      access_token: accessToken,
    });

    const response = await fetch(`${url}?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Meta API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Failed to fetch Meta adsets:', error);
    throw error;
  }
}

/**
 * Fetches ads from Meta Ads API
 */
export async function fetchMetaAds(
  adsetId: string,
  accessToken: string,
  fields: string[] = [
    'id',
    'name',
    'status',
    'spend',
    'impressions',
    'clicks',
    'conversions',
  ]
): Promise<MetaAdData[]> {
  try {
    const url = `https://graph.facebook.com/v18.0/${adsetId}/ads`;
    const params = new URLSearchParams({
      fields: fields.join(','),
      access_token: accessToken,
    });

    const response = await fetch(`${url}?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Meta API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Failed to fetch Meta ads:', error);
    throw error;
  }
}

/**
 * Calculates ROAS (Return on Ad Spend)
 * ROAS = Revenue / Ad Spend
 */
export function calculateRoas(revenue: number, adSpend: number): number {
  if (adSpend <= 0) return 0;
  return revenue / adSpend;
}

/**
 * Calculates CAC (Customer Acquisition Cost)
 * CAC = Total Ad Spend / Number of Conversions
 */
export function calculateCACFromSpend(spend: number, conversions: number): number {
  if (conversions <= 0) return 0;
  return spend / conversions;
}

/**
 * Calculates CPP (Cost Per Purchase)
 * CPP = Total Ad Spend / Number of Purchases
 */
export function calculateCPP(spend: number, purchases: number): number {
  if (purchases <= 0) return 0;
  return spend / purchases;
}

/**
 * Calculates CTR (Click-Through Rate)
 * CTR = Clicks / Impressions * 100
 */
export function calculateCTR(clicks: number, impressions: number): number {
  if (impressions <= 0) return 0;
  return (clicks / impressions) * 100;
}

/**
 * Calculates CPM (Cost Per Mille/Thousand Impressions)
 * CPM = (Ad Spend / Impressions) * 1000
 */
export function calculateCPM(spend: number, impressions: number): number {
  if (impressions <= 0) return 0;
  return (spend / impressions) * 1000;
}

/**
 * Calculates CPC (Cost Per Click)
 * CPC = Ad Spend / Clicks
 */
export function calculateCPC(spend: number, clicks: number): number {
  if (clicks <= 0) return 0;
  return spend / clicks;
}

/**
 * Calculates conversion rate
 * Conversion Rate = Conversions / Clicks * 100
 */
export function calculateConversionRate(conversions: number, clicks: number): number {
  if (clicks <= 0) return 0;
  return (conversions / clicks) * 100;
}

/**
 * Determines if a campaign is profitable
 * A campaign is profitable if ROAS >= 3 (typical e-commerce threshold)
 */
export function isCampaignProfitable(roas: number, minThreshold: number = 3): boolean {
  return roas >= minThreshold;
}

/**
 * Analyzes campaign performance and detects losing campaigns
 */
export async function analyzeCampaignPerformance(
  campaignId: number,
  revenue: number,
  spend: number,
  minProfitableRoas: number = 3
): Promise<{
  roas: number;
  isProfitable: boolean;
  shouldAlert: boolean;
}> {
  const roas = calculateRoas(revenue, spend);
  const isProfitable = isCampaignProfitable(roas, minProfitableRoas);

  if (!isProfitable && spend > 0) {
    // Get campaign details for alert
    const campaign = await getMetaCampaignById(campaignId);
    if (campaign) {
      await onLosingCampaignDetected(
        campaignId,
        campaign.campaignName || 'Unknown Campaign',
        roas,
        spend,
        revenue
      );
    }
  }

  return {
    roas,
    isProfitable,
    shouldAlert: !isProfitable && spend > 0,
  };
}

/**
 * Syncs campaign performance metrics
 */
export async function syncCampaignMetrics(
  businessAccountId: string,
  accessToken: string
): Promise<number> {
  try {
    const campaigns = await fetchMetaCampaigns(businessAccountId, accessToken);
    let syncedCount = 0;

    for (const campaign of campaigns) {
      try {
        // In production, you would update the campaign record in the database
        // with the latest metrics from Meta
        syncedCount++;
      } catch (error) {
        console.error(`Failed to sync campaign ${campaign.id}:`, error);
      }
    }

    return syncedCount;
  } catch (error) {
    console.error('Failed to sync campaign metrics:', error);
    throw error;
  }
}

/**
 * Creates a conversion event via Meta Conversions API
 * Used for server-side tracking of purchases and other events
 */
export async function trackConversionEvent(
  pixelId: string,
  accessToken: string,
  eventData: {
    eventName: string;
    eventTime: number;
    eventSourceUrl: string;
    eventId: string;
    userData?: {
      em?: string; // Email (hashed)
      ph?: string; // Phone (hashed)
      fn?: string; // First name (hashed)
      ln?: string; // Last name (hashed)
      ct?: string; // City (hashed)
      st?: string; // State (hashed)
      zp?: string; // Zip (hashed)
      country?: string; // Country (hashed)
    };
    customData?: {
      value?: number;
      currency?: string;
      content_name?: string;
      content_type?: string;
      content_ids?: string[];
    };
  }
): Promise<boolean> {
  try {
    const url = `https://graph.facebook.com/v18.0/${pixelId}/events`;

    const payload = {
      data: [
        {
          event_name: eventData.eventName,
          event_time: eventData.eventTime,
          event_source_url: eventData.eventSourceUrl,
          event_id: eventData.eventId,
          user_data: eventData.userData,
          custom_data: eventData.customData,
        },
      ],
      access_token: accessToken,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Meta API error: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Failed to track conversion event:', error);
    return false;
  }
}
