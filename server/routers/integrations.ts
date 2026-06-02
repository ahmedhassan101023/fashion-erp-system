import { z } from "zod";
import { router, protectedProcedure, ownerProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { eq, desc } from "drizzle-orm";
import {
  shopifyIntegration, shopifySyncLog,
  orders, products, customers,
  InsertOrder, InsertOrderLineItem,
} from "../../drizzle/schema";
import { createOrder, addOrderLineItem } from "../queries";

// ─────────────────────────────────────────────
// Shopify REST helper
// ─────────────────────────────────────────────
async function shopifyFetch(
  shopName: string,
  accessToken: string,
  path: string,
  apiVersion = "2025-01"
) {
  // Strip trailing .myshopify.com / trailing slash / whitespace
  const cleanShop = shopName
    .replace(/https?:\/\//i, "")   // remove protocol if pasted
    .replace(/\.myshopify\.com\/?$/, "")
    .replace(/\/$/, "")
    .trim();

  // Trim the token — a stray space/newline causes 401 immediately
  const cleanToken = accessToken.trim();

  if (!cleanShop) throw new Error("اسم المتجر فارغ — أدخل اسم المتجر بدون .myshopify.com");
  if (!cleanToken) throw new Error("Access Token فارغ — أدخل الـ Token من Shopify Admin");

  const url = `https://${cleanShop}.myshopify.com/admin/api/${apiVersion}${path}`;

  const res = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": cleanToken,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let hint = "";
    if (res.status === 401) {
      hint = " — تأكد أن الـ Access Token صحيح ولم ينتهِ صلاحيته، وأن التطبيق مفعّل في Shopify Admin";
    } else if (res.status === 404) {
      hint = " — تأكد من اسم المتجر (بدون .myshopify.com)";
    } else if (res.status === 403) {
      hint = " — التطبيق لا يملك صلاحية هذا الـ Scope، راجع API permissions في Shopify";
    }
    throw new Error(
      `Shopify API ${res.status} ${res.statusText}${hint}: ${body.slice(0, 300)}`
    );
  }
  return res.json();
}

// Paginate through all pages using Link header cursor
async function shopifyFetchAll(
  shopName: string,
  accessToken: string,
  path: string,
  rootKey: string,
  apiVersion = "2025-01"
): Promise<any[]> {
  const cleanShop = shopName
    .replace(/https?:\/\//i, "")
    .replace(/\.myshopify\.com\/?$/, "")
    .replace(/\/$/, "")
    .trim();
  const cleanToken = accessToken.trim();
  let url = `https://${cleanShop}.myshopify.com/admin/api/${apiVersion}${path}`;
  const all: any[] = [];

  while (url) {
    const res = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": cleanToken,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      let hint = "";
      if (res.status === 401) hint = " — تأكد من صحة الـ Access Token";
      throw new Error(`Shopify API ${res.status}${hint}: ${body.slice(0, 300)}`);
    }

    const data = await res.json();
    const items = data[rootKey] ?? [];
    all.push(...items);

    // Parse Link header for cursor-based pagination
    const link = res.headers.get("Link") ?? "";
    const nextMatch = link.match(/<([^>]+)>;\s*rel="next"/);
    url = nextMatch ? nextMatch[1] : "";
  }

  return all;
}

// ─────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────
export const integrationsRouter = router({
  // ── GET saved Shopify config ──────────────
  getShopifyConfig: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;
    const rows = await db.select().from(shopifyIntegration).limit(1);
    if (!rows.length) return null;
    const row = rows[0];
    // Mask the token for frontend display
    return {
      id: row.id,
      shopName: row.shopName,
      accessTokenMasked: row.accessToken
        ? "•".repeat(Math.max(0, row.accessToken.length - 4)) +
          row.accessToken.slice(-4)
        : "",
      apiVersion: row.apiVersion ?? "2024-01",
      status: row.status,
      lastSyncDate: row.lastSyncDate,
      syncErrorMessage: row.syncErrorMessage,
    };
  }),

  // ── SAVE Shopify credentials ──────────────
  saveShopifyConfig: ownerProcedure
    .input(
      z.object({
        shopName: z.string().min(1, "اسم المتجر مطلوب"),
        accessToken: z.string().min(1, "Access Token مطلوب"),
        apiVersion: z.string().default("2024-01"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("قاعدة البيانات غير متاحة");

      // Normalise before saving — prevents 401 from stray whitespace
      const cleanShop = input.shopName
        .replace(/https?:\/\//i, "")
        .replace(/\.myshopify\.com\/?$/, "")
        .replace(/\/$/, "")
        .trim();
      const newToken = input.accessToken.trim();
      const cleanVersion = (input.apiVersion || "2025-01").trim();

      if (!cleanShop) throw new Error("اسم المتجر فارغ");

      const existing = await db
        .select({ id: shopifyIntegration.id, accessToken: shopifyIntegration.accessToken })
        .from(shopifyIntegration).limit(1);

      // If no new token provided, preserve the existing one
      const savedToken = existing[0]?.accessToken ?? "";
      const cleanToken = newToken || savedToken;

      if (!cleanToken) throw new Error("Access Token فارغ — أدخل الـ Token أولاً");

      if (existing.length) {
        await db
          .update(shopifyIntegration)
          .set({
            shopName: cleanShop,
            accessToken: cleanToken,
            apiVersion: cleanVersion,
            status: "active",
            syncErrorMessage: null,
          })
          .where(eq(shopifyIntegration.id, existing[0].id));
      } else {
        await db.insert(shopifyIntegration).values({
          shopName: cleanShop,
          accessToken: cleanToken,
          apiVersion: cleanVersion,
          status: "active",
        });
      }

      return { success: true };
    }),

  // ── TEST connection ───────────────────────
  // Accepts optional new credentials; falls back to saved token server-side
  testShopifyConnection: ownerProcedure
    .input(
      z.object({
        shopName: z.string(),
        // Empty string means "use the saved token"
        accessToken: z.string().default(""),
        apiVersion: z.string().default("2024-01"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();

      // Always prefer the freshly-typed token; fall back to saved DB token
      let token = input.accessToken.trim();
      let shopName = input.shopName.trim();
      let apiVersion = (input.apiVersion || "2025-01").trim();

      // If no new token provided, load the saved one from DB (never expose to client)
      if (!token && db) {
        const saved = await db
          .select({ accessToken: shopifyIntegration.accessToken, shopName: shopifyIntegration.shopName, apiVersion: shopifyIntegration.apiVersion })
          .from(shopifyIntegration).limit(1);
        if (saved.length) {
          token = (saved[0].accessToken ?? "").trim();
          // Also use saved shop name if none provided
          if (!shopName) shopName = (saved[0].shopName ?? "").trim();
          if (!apiVersion || apiVersion === "2024-01") apiVersion = (saved[0].apiVersion ?? "2025-01").trim();
        }
      }

      if (!token) return { success: false, error: "لا يوجد Access Token — أدخل الـ Token أولاً واضغط حفظ" };
      if (!shopName) return { success: false, error: "أدخل اسم المتجر" };

      try {
        const data = await shopifyFetch(shopName, token, "/shop.json", apiVersion);
        return {
          success: true,
          shopInfo: {
            name: data.shop?.name,
            email: data.shop?.email,
            domain: data.shop?.domain,
            plan: data.shop?.plan_display_name,
            currency: data.shop?.currency,
            country: data.shop?.country_name,
          },
        };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }),

  // ── SYNC orders ───────────────────────────
  syncShopifyOrders: ownerProcedure
    .input(
      z.object({
        since: z.string().optional(), // ISO date string
        limit: z.number().default(250),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("قاعدة البيانات غير متاحة");

      const config = await db.select().from(shopifyIntegration).limit(1);
      if (!config.length || !config[0].accessToken) {
        throw new Error("لم يتم ربط Shopify بعد. يرجى إدخال بيانات الاتصال أولاً.");
      }

      const { shopName, accessToken, apiVersion } = config[0];
      const av = apiVersion ?? "2024-01";

      // Create sync log entry
      const logResult = await db.insert(shopifySyncLog).values({
        syncType: "orders",
        status: "in_progress",
        startTime: new Date(),
      });
      const logId = Number(logResult[0].insertId);

      let syncedCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      try {
        const sinceParam = input.since ? `&created_at_min=${input.since}` : "";
        const rawOrders = await shopifyFetchAll(
          shopName,
          accessToken!,
          `/orders.json?status=any&limit=250${sinceParam}`,
          "orders",
          av
        );

        for (const shopifyOrder of rawOrders) {
          try {
            // Skip if already synced
            const existing = await db
              .select({ id: orders.id })
              .from(orders)
              .where(eq(orders.shopifyOrderId, String(shopifyOrder.id)))
              .limit(1);

            if (existing.length) continue;

            const orderData: InsertOrder = {
              shopifyOrderId: String(shopifyOrder.id),
              orderId: shopifyOrder.name ?? `#${shopifyOrder.id}`,
              orderDate: new Date(shopifyOrder.created_at),
              totalRevenue: shopifyOrder.total_price ?? "0",
              subtotal: shopifyOrder.subtotal_price ?? "0",
              shippingCost: shopifyOrder.total_shipping_price_set?.shop_money?.amount
                ?? shopifyOrder.total_shipping_price ?? "0",
              taxAmount: shopifyOrder.total_tax ?? "0",
              discountAmount: shopifyOrder.total_discounts ?? "0",
              status:
                shopifyOrder.financial_status === "paid"
                  ? "processing"
                  : shopifyOrder.financial_status === "refunded"
                  ? "refunded"
                  : "pending",
              fulfillmentStatus:
                shopifyOrder.fulfillment_status === "fulfilled"
                  ? "fulfilled"
                  : "unfulfilled",
              paymentMethod:
                shopifyOrder.payment_gateway ??
                shopifyOrder.payment_details?.credit_card_company ??
                "unknown",
              shippingAddress: shopifyOrder.shipping_address
                ? JSON.stringify(shopifyOrder.shipping_address)
                : null,
              billingAddress: shopifyOrder.billing_address
                ? JSON.stringify(shopifyOrder.billing_address)
                : null,
            };

            const order = await createOrder(orderData);

            // Sync line items — try to resolve productId from synced products
            for (const item of shopifyOrder.line_items ?? []) {
              try {
                // Look up product by Shopify product ID
                let resolvedProductId: number | null = null;
                if (item.product_id && db) {
                  const found = await db
                    .select({ id: products.id })
                    .from(products)
                    .where(eq(products.shopifyProductId, String(item.product_id)))
                    .limit(1);
                  if (found.length) resolvedProductId = found[0].id;
                }

                if (resolvedProductId !== null) {
                  const lineItem: InsertOrderLineItem = {
                    orderId: order.id,
                    productId: resolvedProductId,
                    quantity: item.quantity ?? 1,
                    unitPrice: item.price ?? "0",
                  };
                  await addOrderLineItem(lineItem);
                }
                // If product not yet synced, skip the line item (can be resolved later)
              } catch {
                // Non-fatal: line item failure shouldn't abort the order
              }
            }

            syncedCount++;
          } catch (err: any) {
            failedCount++;
            errors.push(`Order ${shopifyOrder.name}: ${err.message}`);
          }
        }

        // Update sync log
        await db
          .update(shopifySyncLog)
          .set({
            status: "completed",
            itemsProcessed: syncedCount,
            itemsFailed: failedCount,
            endTime: new Date(),
            errorMessage: errors.length ? errors.slice(0, 5).join("; ") : null,
          })
          .where(eq(shopifySyncLog.id, logId));

        // Update last sync date
        await db
          .update(shopifyIntegration)
          .set({ lastSyncDate: new Date(), status: "active", syncErrorMessage: null })
          .where(eq(shopifyIntegration.id, config[0].id));

        return { success: true, syncedCount, failedCount, total: rawOrders.length };
      } catch (err: any) {
        await db
          .update(shopifySyncLog)
          .set({
            status: "failed",
            endTime: new Date(),
            errorMessage: err.message,
          })
          .where(eq(shopifySyncLog.id, logId));

        await db
          .update(shopifyIntegration)
          .set({ status: "error", syncErrorMessage: err.message })
          .where(eq(shopifyIntegration.id, config[0].id));

        throw err;
      }
    }),

  // ── SYNC products ─────────────────────────
  syncShopifyProducts: ownerProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("قاعدة البيانات غير متاحة");

    const config = await db.select().from(shopifyIntegration).limit(1);
    if (!config.length || !config[0].accessToken) {
      throw new Error("لم يتم ربط Shopify بعد.");
    }

    const { shopName, accessToken, apiVersion } = config[0];
    const av = apiVersion ?? "2024-01";

    const logResult = await db.insert(shopifySyncLog).values({
      syncType: "products",
      status: "in_progress",
      startTime: new Date(),
    });
    const logId = Number(logResult[0].insertId);

    let syncedCount = 0;
    let failedCount = 0;

    try {
      const rawProducts = await shopifyFetchAll(
        shopName,
        accessToken!,
        "/products.json?limit=250",
        "products",
        av
      );

      for (const sp of rawProducts) {
        const variants = sp.variants ?? [];
        const isSingleVariant = variants.length === 1 && variants[0].title === "Default Title";

        for (const variant of variants) {
          try {
            // Use variant-level Shopify ID as unique key so each variant is a separate SKU
            const variantShopifyId = `${sp.id}-${variant.id}`;

            const existing = await db
              .select({ id: products.id })
              .from(products)
              .where(eq(products.shopifyProductId, variantShopifyId))
              .limit(1);

            if (!existing.length) {
              await db.insert(products).values({
                // Store parent product ID for order line item matching
                shopifyProductId: String(sp.id),
                name: isSingleVariant
                  ? sp.title
                  : `${sp.title} - ${variant.title}`,
                sku: variant.sku || `SHOPIFY-${sp.id}-${variant.id}`,
                category: sp.product_type || "عام",
                description: sp.body_html?.replace(/<[^>]*>/g, "").slice(0, 500) ?? null,
                stockQuantity: variant.inventory_quantity ?? 0,
                reorderPoint: 5,
              });
              syncedCount++;
            } else {
              // Update stock quantity for existing product
              await db
                .update(products)
                .set({ stockQuantity: variant.inventory_quantity ?? 0 })
                .where(eq(products.shopifyProductId, String(sp.id)));
            }
          } catch {
            failedCount++;
          }
        }
      }

      await db
        .update(shopifySyncLog)
        .set({ status: "completed", itemsProcessed: syncedCount, itemsFailed: failedCount, endTime: new Date() })
        .where(eq(shopifySyncLog.id, logId));

      await db
        .update(shopifyIntegration)
        .set({ lastSyncDate: new Date(), status: "active" })
        .where(eq(shopifyIntegration.id, config[0].id));

      return { success: true, syncedCount, failedCount, total: rawProducts.length };
    } catch (err: any) {
      await db
        .update(shopifySyncLog)
        .set({ status: "failed", endTime: new Date(), errorMessage: err.message })
        .where(eq(shopifySyncLog.id, logId));
      throw err;
    }
  }),

  // ── GET sync logs ─────────────────────────
  getSyncLogs: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(shopifySyncLog)
      .orderBy(desc(shopifySyncLog.createdAt))
      .limit(20);
  }),
});
