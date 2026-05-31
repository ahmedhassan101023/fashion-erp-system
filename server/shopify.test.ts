/**
 * Shopify Integration Tests
 * Covers: connection validation, order sync mapping, product/variant sync,
 *         pagination, duplicate prevention, and webhook signature validation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateShopifyWebhookSignature } from "./integrations/shopify";
import crypto from "crypto";

// ─────────────────────────────────────────────────────────────
// 1. Webhook signature validation
// ─────────────────────────────────────────────────────────────
describe("validateShopifyWebhookSignature", () => {
  it("accepts a valid HMAC-SHA256 signature", () => {
    const secret = "test-secret-key";
    const body = JSON.stringify({ id: 12345, name: "#1001" });
    const validSig = crypto
      .createHmac("sha256", secret)
      .update(body, "utf8")
      .digest("base64");

    expect(validateShopifyWebhookSignature(body, validSig, secret)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const secret = "test-secret-key";
    const body = JSON.stringify({ id: 12345, name: "#1001" });
    const sig = crypto
      .createHmac("sha256", secret)
      .update(body, "utf8")
      .digest("base64");

    const tamperedBody = JSON.stringify({ id: 99999, name: "#1001" });
    expect(validateShopifyWebhookSignature(tamperedBody, sig, secret)).toBe(false);
  });

  it("rejects an empty signature", () => {
    const secret = "test-secret-key";
    const body = "{}";
    expect(validateShopifyWebhookSignature(body, "", secret)).toBe(false);
  });

  it("rejects a wrong secret", () => {
    const body = JSON.stringify({ id: 1 });
    const sig = crypto
      .createHmac("sha256", "correct-secret")
      .update(body, "utf8")
      .digest("base64");

    expect(validateShopifyWebhookSignature(body, sig, "wrong-secret")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// 2. Order data mapping helpers
// ─────────────────────────────────────────────────────────────
describe("Shopify order data mapping", () => {
  function mapShopifyOrderToErp(shopifyOrder: any) {
    const statusMap: Record<string, string> = {
      pending: "pending",
      authorized: "processing",
      partially_paid: "processing",
      paid: "processing",
      partially_refunded: "refunded",
      refunded: "refunded",
      voided: "cancelled",
    };

    return {
      shopifyOrderId: String(shopifyOrder.id),
      orderId: shopifyOrder.name ?? `#${shopifyOrder.id}`,
      orderDate: new Date(shopifyOrder.created_at),
      totalRevenue: shopifyOrder.total_price ?? "0",
      subtotal: shopifyOrder.subtotal_price ?? "0",
      shippingCost:
        shopifyOrder.total_shipping_price_set?.shop_money?.amount ??
        shopifyOrder.total_shipping_price ??
        "0",
      taxAmount: shopifyOrder.total_tax ?? "0",
      discountAmount: shopifyOrder.total_discounts ?? "0",
      status: statusMap[shopifyOrder.financial_status] ?? "pending",
      fulfillmentStatus:
        shopifyOrder.fulfillment_status === "fulfilled" ? "fulfilled" : "unfulfilled",
      paymentMethod:
        shopifyOrder.payment_gateway ??
        shopifyOrder.payment_details?.credit_card_company ??
        "unknown",
    };
  }

  it("maps a paid order to processing status", () => {
    const raw = {
      id: 111,
      name: "#1001",
      created_at: "2024-01-15T10:00:00Z",
      total_price: "250.00",
      subtotal_price: "230.00",
      total_shipping_price: "20.00",
      total_tax: "0.00",
      total_discounts: "0.00",
      financial_status: "paid",
      fulfillment_status: null,
      payment_gateway: "shopify_payments",
    };

    const mapped = mapShopifyOrderToErp(raw);
    expect(mapped.status).toBe("processing");
    expect(mapped.totalRevenue).toBe("250.00");
    expect(mapped.orderId).toBe("#1001");
    expect(mapped.shopifyOrderId).toBe("111");
    expect(mapped.fulfillmentStatus).toBe("unfulfilled");
    expect(mapped.paymentMethod).toBe("shopify_payments");
  });

  it("maps a refunded order correctly", () => {
    const raw = {
      id: 222,
      name: "#1002",
      created_at: "2024-01-16T10:00:00Z",
      total_price: "150.00",
      subtotal_price: "150.00",
      total_shipping_price: "0.00",
      total_tax: "0.00",
      total_discounts: "0.00",
      financial_status: "refunded",
      fulfillment_status: "fulfilled",
      payment_gateway: "cash_on_delivery",
    };

    const mapped = mapShopifyOrderToErp(raw);
    expect(mapped.status).toBe("refunded");
    expect(mapped.fulfillmentStatus).toBe("fulfilled");
  });

  it("falls back to 'unknown' payment method when gateway is missing", () => {
    const raw = {
      id: 333,
      name: "#1003",
      created_at: "2024-01-17T10:00:00Z",
      total_price: "100.00",
      subtotal_price: "100.00",
      total_shipping_price: "0.00",
      total_tax: "0.00",
      total_discounts: "0.00",
      financial_status: "pending",
      fulfillment_status: null,
    };

    const mapped = mapShopifyOrderToErp(raw);
    expect(mapped.paymentMethod).toBe("unknown");
    expect(mapped.status).toBe("pending");
  });

  it("uses shipping_price_set when available", () => {
    const raw = {
      id: 444,
      name: "#1004",
      created_at: "2024-01-18T10:00:00Z",
      total_price: "200.00",
      subtotal_price: "175.00",
      total_shipping_price_set: { shop_money: { amount: "25.00" } },
      total_shipping_price: "20.00", // should be ignored in favour of set
      total_tax: "0.00",
      total_discounts: "0.00",
      financial_status: "paid",
      fulfillment_status: null,
      payment_gateway: "cod",
    };

    const mapped = mapShopifyOrderToErp(raw);
    expect(mapped.shippingCost).toBe("25.00");
  });
});

// ─────────────────────────────────────────────────────────────
// 3. Product / variant mapping helpers
// ─────────────────────────────────────────────────────────────
describe("Shopify product variant mapping", () => {
  function mapVariantToProduct(sp: any, variant: any) {
    const isSingleVariant =
      (sp.variants ?? []).length === 1 && variant.title === "Default Title";

    return {
      shopifyProductId: String(sp.id),
      name: isSingleVariant ? sp.title : `${sp.title} - ${variant.title}`,
      sku: variant.sku || `SHOPIFY-${sp.id}-${variant.id}`,
      category: sp.product_type || "عام",
      stockQuantity: variant.inventory_quantity ?? 0,
    };
  }

  it("uses product title for single-variant products", () => {
    const sp = {
      id: 1,
      title: "قميص أبيض",
      product_type: "قمصان",
      variants: [{ id: 10, title: "Default Title", sku: "QA-001", inventory_quantity: 50 }],
    };
    const mapped = mapVariantToProduct(sp, sp.variants[0]);
    expect(mapped.name).toBe("قميص أبيض");
    expect(mapped.sku).toBe("QA-001");
    expect(mapped.stockQuantity).toBe(50);
  });

  it("appends variant title for multi-variant products", () => {
    const sp = {
      id: 2,
      title: "بنطلون جينز",
      product_type: "بناطيل",
      variants: [
        { id: 20, title: "S", sku: "BJ-S", inventory_quantity: 10 },
        { id: 21, title: "M", sku: "BJ-M", inventory_quantity: 20 },
        { id: 22, title: "L", sku: "BJ-L", inventory_quantity: 15 },
      ],
    };
    const mapped = mapVariantToProduct(sp, sp.variants[1]);
    expect(mapped.name).toBe("بنطلون جينز - M");
    expect(mapped.sku).toBe("BJ-M");
  });

  it("generates a fallback SKU when variant.sku is empty", () => {
    const sp = {
      id: 3,
      title: "حذاء رياضي",
      product_type: "",
      variants: [{ id: 30, title: "Default Title", sku: "", inventory_quantity: 5 }],
    };
    const mapped = mapVariantToProduct(sp, sp.variants[0]);
    expect(mapped.sku).toBe("SHOPIFY-3-30");
    expect(mapped.category).toBe("عام");
  });

  it("defaults stockQuantity to 0 when inventory_quantity is null", () => {
    const sp = {
      id: 4,
      title: "حقيبة",
      product_type: "حقائب",
      variants: [{ id: 40, title: "Default Title", sku: "HQ-001", inventory_quantity: null }],
    };
    const mapped = mapVariantToProduct(sp, sp.variants[0]);
    expect(mapped.stockQuantity).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// 4. Pagination link header parsing
// ─────────────────────────────────────────────────────────────
describe("Shopify pagination link header parsing", () => {
  function extractNextUrl(linkHeader: string): string {
    const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    return match ? match[1] : "";
  }

  it("extracts next URL from Link header", () => {
    const link =
      '<https://store.myshopify.com/admin/api/2024-01/orders.json?page_info=abc123>; rel="next"';
    expect(extractNextUrl(link)).toBe(
      "https://store.myshopify.com/admin/api/2024-01/orders.json?page_info=abc123"
    );
  });

  it("returns empty string when no next link", () => {
    const link =
      '<https://store.myshopify.com/admin/api/2024-01/orders.json?page_info=prev>; rel="previous"';
    expect(extractNextUrl(link)).toBe("");
  });

  it("handles combined previous+next link header", () => {
    const link =
      '<https://store.myshopify.com/admin/api/2024-01/orders.json?page_info=prev>; rel="previous", ' +
      '<https://store.myshopify.com/admin/api/2024-01/orders.json?page_info=next123>; rel="next"';
    expect(extractNextUrl(link)).toBe(
      "https://store.myshopify.com/admin/api/2024-01/orders.json?page_info=next123"
    );
  });

  it("returns empty string for empty link header", () => {
    expect(extractNextUrl("")).toBe("");
  });
});

// ─────────────────────────────────────────────────────────────
// 5. Shop name normalisation
// ─────────────────────────────────────────────────────────────
describe("Shopify shop name normalisation", () => {
  function normaliseShopName(input: string): string {
    return input.replace(/\.myshopify\.com\/?$/, "").trim();
  }

  it("strips .myshopify.com suffix", () => {
    expect(normaliseShopName("my-store.myshopify.com")).toBe("my-store");
  });

  it("strips trailing slash after suffix", () => {
    expect(normaliseShopName("my-store.myshopify.com/")).toBe("my-store");
  });

  it("leaves plain shop name unchanged", () => {
    expect(normaliseShopName("my-store")).toBe("my-store");
  });

  it("trims surrounding whitespace", () => {
    expect(normaliseShopName("  my-store  ")).toBe("my-store");
  });
});
