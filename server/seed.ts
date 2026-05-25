/**
 * Seed Data Generator for Demo Environment
 * Generates realistic e-commerce data for testing and demonstration
 */

import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import * as schema from "../drizzle/schema";
import { ENV } from "./_core/env";

const db = drizzle(process.env.DATABASE_URL!);

// Sample data generators
const sampleProducts = [
  {
    sku: "SHIRT-001",
    name: "Premium Cotton T-Shirt",
    description: "High-quality 100% cotton t-shirt",
    retailPrice: "29.99",
    category: "Apparel",
  },
  {
    sku: "SHIRT-002",
    name: "Organic Linen Shirt",
    description: "Breathable organic linen shirt",
    retailPrice: "39.99",
    category: "Apparel",
  },
  {
    sku: "PANTS-001",
    name: "Classic Denim Jeans",
    description: "Timeless denim jeans",
    retailPrice: "59.99",
    category: "Bottoms",
  },
  {
    sku: "PANTS-002",
    name: "Chino Trousers",
    description: "Comfortable chino trousers",
    retailPrice: "49.99",
    category: "Bottoms",
  },
  {
    sku: "DRESS-001",
    name: "Summer Sundress",
    description: "Light and airy summer dress",
    retailPrice: "44.99",
    category: "Dresses",
  },
];

const sampleProductCosts = [
  {
    productSku: "SHIRT-001",
    fabricCost: "5.00",
    manufacturingCost: "3.50",
    packagingCost: "1.00",
    shippingCost: "2.50",
    marketingCost: "2.00",
    influencerCost: "0.00",
    overheadCost: "1.50",
  },
  {
    productSku: "SHIRT-002",
    fabricCost: "8.00",
    manufacturingCost: "4.00",
    packagingCost: "1.20",
    shippingCost: "2.50",
    marketingCost: "2.50",
    influencerCost: "0.00",
    overheadCost: "2.00",
  },
  {
    productSku: "PANTS-001",
    fabricCost: "12.00",
    manufacturingCost: "6.00",
    packagingCost: "1.50",
    shippingCost: "3.00",
    marketingCost: "3.00",
    influencerCost: "1.00",
    overheadCost: "2.50",
  },
  {
    productSku: "PANTS-002",
    fabricCost: "10.00",
    manufacturingCost: "5.00",
    packagingCost: "1.30",
    shippingCost: "2.80",
    marketingCost: "2.50",
    influencerCost: "0.50",
    overheadCost: "2.00",
  },
  {
    productSku: "DRESS-001",
    fabricCost: "8.50",
    manufacturingCost: "4.50",
    packagingCost: "1.20",
    shippingCost: "2.50",
    marketingCost: "2.00",
    influencerCost: "0.00",
    overheadCost: "1.80",
  },
];

const sampleOrders = [
  {
    orderId: "ORD-001",
    customerId: "CUST-001",
    orderDate: new Date("2026-05-20"),
    totalRevenue: "89.97",
    status: "completed",
    fulfillmentStatus: "delivered",
    paymentMethod: "credit_card",
    notes: "Demo order 1",
  },
  {
    orderId: "ORD-002",
    customerId: "CUST-002",
    orderDate: new Date("2026-05-21"),
    totalRevenue: "129.96",
    status: "completed",
    fulfillmentStatus: "delivered",
    paymentMethod: "credit_card",
    notes: "Demo order 2",
  },
  {
    orderId: "ORD-003",
    customerId: "CUST-003",
    orderDate: new Date("2026-05-22"),
    totalRevenue: "59.99",
    status: "completed",
    fulfillmentStatus: "in_transit",
    paymentMethod: "cod",
    notes: "Demo order 3 - COD",
  },
  {
    orderId: "ORD-004",
    customerId: "CUST-001",
    orderDate: new Date("2026-05-23"),
    totalRevenue: "44.99",
    status: "completed",
    fulfillmentStatus: "delivered",
    paymentMethod: "credit_card",
    notes: "Demo order 4",
  },
  {
    orderId: "ORD-005",
    customerId: "CUST-004",
    orderDate: new Date("2026-05-24"),
    totalRevenue: "109.98",
    status: "pending",
    fulfillmentStatus: "pending",
    paymentMethod: "credit_card",
    notes: "Demo order 5 - Pending",
  },
];

const sampleLineItems = [
  { orderId: "ORD-001", productSku: "SHIRT-001", quantity: "3", unitPrice: "29.99" },
  { orderId: "ORD-002", productSku: "PANTS-001", quantity: "2", unitPrice: "59.99" },
  { orderId: "ORD-003", productSku: "DRESS-001", quantity: "1", unitPrice: "44.99" },
  { orderId: "ORD-003", productSku: "SHIRT-002", quantity: "1", unitPrice: "39.99" },
  { orderId: "ORD-004", productSku: "DRESS-001", quantity: "1", unitPrice: "44.99" },
  { orderId: "ORD-005", productSku: "PANTS-002", quantity: "2", unitPrice: "49.99" },
];

const sampleCampaigns = [
  {
    metaCampaignId: "META-CAM-001",
    campaignName: "Summer Collection Launch",
    budget: "5000.00",
    spend: "4250.00",
    impressions: "125000",
    clicks: "3750",
    conversions: "150",
    revenue: "4500.00",
    roas: "1.06",
    cac: "28.33",
    cpp: "0.04",
    ctr: "3.0",
    cpc: "1.13",
    cpm: "34.00",
    status: "active",
  },
  {
    metaCampaignId: "META-CAM-002",
    campaignName: "Spring Sale Campaign",
    budget: "3000.00",
    spend: "2800.00",
    impressions: "95000",
    clicks: "2850",
    conversions: "95",
    revenue: "2850.00",
    roas: "1.02",
    cac: "29.47",
    cpp: "0.03",
    ctr: "3.0",
    cpc: "0.98",
    cpm: "29.47",
    status: "active",
  },
  {
    metaCampaignId: "META-CAM-003",
    campaignName: "Retargeting Campaign",
    budget: "2000.00",
    spend: "1500.00",
    impressions: "50000",
    clicks: "1500",
    conversions: "45",
    revenue: "1350.00",
    roas: "0.90",
    cac: "33.33",
    cpp: "0.03",
    ctr: "3.0",
    cpc: "1.00",
    cpm: "30.00",
    status: "paused",
  },
];

const sampleCashflowTransactions = [
  {
    transactionDate: new Date("2026-05-20"),
    transactionType: "incoming",
    category: "sales",
    amount: "89.97",
    description: "Order ORD-001 payment",
    status: "completed",
  },
  {
    transactionDate: new Date("2026-05-21"),
    transactionType: "incoming",
    category: "sales",
    amount: "129.96",
    description: "Order ORD-002 payment",
    status: "completed",
  },
  {
    transactionDate: new Date("2026-05-21"),
    transactionType: "outgoing",
    category: "ad_spend",
    amount: "500.00",
    description: "Meta Ads spend - May 21",
    status: "completed",
  },
  {
    transactionDate: new Date("2026-05-22"),
    transactionType: "incoming",
    category: "cod_collections",
    amount: "59.99",
    description: "COD collection - Order ORD-003",
    status: "pending",
  },
  {
    transactionDate: new Date("2026-05-22"),
    transactionType: "outgoing",
    category: "supplier_payments",
    amount: "1200.00",
    description: "Supplier payment - Fabric supplier",
    status: "completed",
  },
  {
    transactionDate: new Date("2026-05-23"),
    transactionType: "incoming",
    category: "sales",
    amount: "44.99",
    description: "Order ORD-004 payment",
    status: "completed",
  },
  {
    transactionDate: new Date("2026-05-23"),
    transactionType: "outgoing",
    category: "payroll",
    amount: "2000.00",
    description: "Weekly payroll",
    status: "completed",
  },
];

async function seedDatabase() {
  try {
    console.log("[Seed] Starting database seeding...");

    // Clear existing data (in demo mode only)
    console.log("[Seed] Clearing existing data...");
    // Note: In production, use migrations instead

    // Seed Products
    console.log("[Seed] Seeding products...");
    for (const product of sampleProducts) {
      await db.insert(schema.products).values({
        sku: product.sku,
        name: product.name,
        description: product.description,
        category: product.category,
      });
    }

    // Seed Product Costs
    console.log("[Seed] Seeding product costs...");
    const products = await db.select().from(schema.products);
    for (const costData of sampleProductCosts) {
      const product = products.find((p) => p.sku === costData.productSku);
      if (product) {
        const totalCost = (
          parseFloat(costData.fabricCost) +
          parseFloat(costData.manufacturingCost) +
          parseFloat(costData.packagingCost) +
          parseFloat(costData.shippingCost) +
          parseFloat(costData.marketingCost) +
          parseFloat(costData.influencerCost) +
          parseFloat(costData.overheadCost)
        ).toString();

        await db.insert(schema.productCosts).values({
          productId: product.id,
          fabricCost: costData.fabricCost,
          manufacturingCost: costData.manufacturingCost,
          packagingCost: costData.packagingCost,
          shippingCost: costData.shippingCost,
          marketingCost: costData.marketingCost,
          influencerCost: costData.influencerCost,
          overheadAllocation: costData.overheadCost,
          totalCost: totalCost,
          effectiveDate: new Date(),
        });
      }
    }

    // Seed Orders
    console.log("[Seed] Seeding orders...");
    for (const order of sampleOrders) {
      await db.insert(schema.orders).values({
        orderId: order.orderId,
        orderDate: order.orderDate,
        totalRevenue: order.totalRevenue,
        status: order.status as "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded",
        fulfillmentStatus: order.fulfillmentStatus as "unfulfilled" | "partially_fulfilled" | "fulfilled" | "cancelled",
        paymentMethod: order.paymentMethod,
        notes: order.notes,
      });
    }

    // Seed Order Line Items
    console.log("[Seed] Seeding order line items...");
    const orders = await db.select().from(schema.orders);
    for (const lineItem of sampleLineItems) {
      const order = orders.find((o) => o.orderId === lineItem.orderId);
      const product = products.find((p) => p.sku === lineItem.productSku);
      if (order && product) {
        await db.insert(schema.orderLineItems).values({
          orderId: order.id,
          productId: product.id,
          quantity: parseInt(lineItem.quantity),
          unitPrice: lineItem.unitPrice,
        });
      }
    }

    // Seed Order Profitability
    console.log("[Seed] Seeding order profitability...");
    for (const order of orders) {
      const lineItems = await db
        .select()
        .from(schema.orderLineItems)
        .where(eq(schema.orderLineItems.orderId, order.id));

      let totalProductCost = "0";
      for (const item of lineItems) {
        const costs = await db
          .select()
          .from(schema.productCosts)
          .where(eq(schema.productCosts.productId, item.productId))
          .limit(1);

        if (costs.length > 0) {
          const cost = costs[0];
          const itemCost =
            (parseFloat(cost.fabricCost || "0") +
              parseFloat(cost.manufacturingCost || "0") +
              parseFloat(cost.packagingCost || "0")) *
            item.quantity;
          totalProductCost = (parseFloat(totalProductCost) + itemCost).toString();
        }
      }

      const shippingCost = (parseFloat(order.totalRevenue) * 0.05).toString();
      const gatewayFee = (parseFloat(order.totalRevenue) * 0.03).toString();
      const packagingCost = (parseFloat(order.totalRevenue) * 0.02).toString();
      const netProfit = (
        parseFloat(order.totalRevenue) -
        parseFloat(totalProductCost) -
        parseFloat(shippingCost) -
        parseFloat(gatewayFee) -
        parseFloat(packagingCost)
      ).toString();

      await db.insert(schema.orderProfitability).values({
        orderId: order.id,
        revenue: order.totalRevenue,
        productCost: totalProductCost,
        shippingCost: shippingCost,
        gatewayFee: gatewayFee,
        packagingCost: packagingCost,
        netProfit: netProfit,
        profitabilityStatus:
          parseFloat(netProfit) > 0 ? "profitable" : parseFloat(netProfit) === 0 ? "break_even" : "losing",
      });
    }

    // Seed Meta Campaigns
    console.log("[Seed] Seeding Meta Ads campaigns...");
    for (const campaign of sampleCampaigns) {
      await db.insert(schema.metaCampaigns).values({
        metaCampaignId: campaign.metaCampaignId,
        campaignName: campaign.campaignName,
        budget: campaign.budget,
        spend: campaign.spend,
        impressions: parseInt(campaign.impressions),
        clicks: parseInt(campaign.clicks),
        conversions: parseInt(campaign.conversions),
        roas: campaign.roas,
        cac: campaign.cac,
        cpp: campaign.cpp,
        ctr: campaign.ctr,
        cpm: campaign.cpm,
        status: campaign.status as "active" | "paused" | "archived",
      });
    }

    // Seed Cashflow Transactions
    console.log("[Seed] Seeding cashflow transactions...");
    for (const transaction of sampleCashflowTransactions) {
      await db.insert(schema.cashflowTransactions).values({
        transactionDate: transaction.transactionDate,
        transactionType: transaction.transactionType as "incoming" | "outgoing",
        category: transaction.category as
          | "sales"
          | "cod_collections"
          | "refunds"
          | "supplier_payments"
          | "ad_spend"
          | "payroll"
          | "subscriptions"
          | "operational",
        amount: transaction.amount,
        description: transaction.description,
        status: transaction.status as "pending" | "completed" | "failed",
      });
    }

    console.log("[Seed] ✅ Database seeding completed successfully!");
  } catch (error) {
    console.error("[Seed] ❌ Error seeding database:", error);
    throw error;
  }
}

// Run seed if executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedDatabase };
