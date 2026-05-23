import { getShopifyIntegration, updateShopifyIntegration, createOrder, addOrderLineItem } from "../queries";
import { onOrderCreated, onOrderDelivered } from "../events";
import { InsertOrder, InsertOrderLineItem } from "../../drizzle/schema";

/**
 * Shopify Integration Module
 * Handles real-time order, product, and inventory synchronization
 */

export interface ShopifyOrderData {
  id: string;
  name: string;
  email: string;
  created_at: string;
  total_price: string;
  subtotal_price: string;
  total_shipping_price: string;
  total_tax: string;
  total_discounts: string;
  financial_status: string;
  fulfillment_status: string;
  line_items: Array<{
    id: string;
    product_id: string;
    title: string;
    quantity: number;
    price: string;
  }>;
  shipping_address: {
    address1: string;
    city: string;
    province: string;
    zip: string;
    country: string;
  };
  billing_address: {
    address1: string;
    city: string;
    province: string;
    zip: string;
    country: string;
  };
  payment_details: {
    credit_card_company: string;
  };
}

/**
 * Syncs a Shopify order to the ERP system
 */
export async function syncShopifyOrder(shopifyOrder: ShopifyOrderData): Promise<number> {
  try {
    // Create order record
    const orderData: InsertOrder = {
      shopifyOrderId: shopifyOrder.id,
      orderId: shopifyOrder.name,
      orderDate: new Date(shopifyOrder.created_at),
      totalRevenue: shopifyOrder.total_price,
      subtotal: shopifyOrder.subtotal_price,
      shippingCost: shopifyOrder.total_shipping_price,
      taxAmount: shopifyOrder.total_tax,
      discountAmount: shopifyOrder.total_discounts,
      status: 'pending',
      fulfillmentStatus: shopifyOrder.fulfillment_status === 'fulfilled' ? 'fulfilled' : 'unfulfilled',
      paymentMethod: shopifyOrder.payment_details?.credit_card_company || 'unknown',
      shippingAddress: JSON.stringify(shopifyOrder.shipping_address),
      billingAddress: JSON.stringify(shopifyOrder.billing_address),
    };

    const order = await createOrder(orderData);

    // Add line items
    for (const item of shopifyOrder.line_items) {
      const lineItemData: InsertOrderLineItem = {
        orderId: order.id,
        productId: parseInt(item.product_id), // Note: In production, you'd need to map Shopify product IDs to your product IDs
        quantity: item.quantity,
        unitPrice: item.price,
      };

      await addOrderLineItem(lineItemData);
    }

    // Calculate and record profitability
    // Record order profitability will be handled by the profitability engine
    // await recordOrderProfitability(order.id);

    // Publish order created event
    await onOrderCreated(order.id, parseFloat(shopifyOrder.total_price), {
      shopifyOrderId: shopifyOrder.id,
      customerEmail: shopifyOrder.email,
    });

    return order.id;
  } catch (error) {
    console.error('Failed to sync Shopify order:', error);
    throw error;
  }
}

/**
 * Handles Shopify webhook for order creation
 */
export async function handleOrderCreatedWebhook(webhookData: any): Promise<void> {
  await syncShopifyOrder(webhookData);
}

/**
 * Handles Shopify webhook for order fulfillment
 */
export async function handleOrderFulfilledWebhook(webhookData: any): Promise<void> {
  const shopifyOrderId = webhookData.id;
  // Update order status in database
  // Publish order delivered event
  await onOrderDelivered(0, { shopifyOrderId }); // Note: You'd need to look up the order ID from Shopify ID
}

/**
 * Handles Shopify webhook for order refund
 */
export async function handleRefundCreatedWebhook(webhookData: any): Promise<void> {
  // Handle refund logic
  // Update order status
  // Create refund accounting entries
  console.log('Refund webhook received:', webhookData);
}

/**
 * Validates Shopify webhook signature
 */
export function validateShopifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto');
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64');

  return hmac === signature;
}

/**
 * Fetches orders from Shopify API
 */
export async function fetchShopifyOrders(
  shopName: string,
  accessToken: string,
  apiVersion: string = '2024-01',
  status: string = 'any'
): Promise<ShopifyOrderData[]> {
  try {
    const url = `https://${shopName}.myshopify.com/admin/api/${apiVersion}/orders.json?status=${status}&limit=250`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.orders || [];
  } catch (error) {
    console.error('Failed to fetch Shopify orders:', error);
    throw error;
  }
}

/**
 * Fetches products from Shopify API
 */
export async function fetchShopifyProducts(
  shopName: string,
  accessToken: string,
  apiVersion: string = '2024-01'
): Promise<any[]> {
  try {
    const url = `https://${shopName}.myshopify.com/admin/api/${apiVersion}/products.json?limit=250`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.products || [];
  } catch (error) {
    console.error('Failed to fetch Shopify products:', error);
    throw error;
  }
}

/**
 * Fetches inventory levels from Shopify API
 */
export async function fetchShopifyInventory(
  shopName: string,
  accessToken: string,
  apiVersion: string = '2024-01'
): Promise<any[]> {
  try {
    const url = `https://${shopName}.myshopify.com/admin/api/${apiVersion}/inventory_levels.json`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.inventory_levels || [];
  } catch (error) {
    console.error('Failed to fetch Shopify inventory:', error);
    throw error;
  }
}

/**
 * Syncs all historical Shopify orders
 */
export async function syncAllShopifyOrders(
  shopName: string,
  accessToken: string,
  apiVersion?: string
): Promise<number> {
  try {
    const orders = await fetchShopifyOrders(shopName, accessToken, apiVersion);
    let syncedCount = 0;

    for (const order of orders) {
      try {
        await syncShopifyOrder(order);
        syncedCount++;
      } catch (error) {
        console.error(`Failed to sync order ${order.id}:`, error);
      }
    }

    return syncedCount;
  } catch (error) {
    console.error('Failed to sync all Shopify orders:', error);
    throw error;
  }
}
