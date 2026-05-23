import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

// Owner-only procedure (for system administration)
export const ownerProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'owner') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// Alias for backward compatibility
export const adminProcedure = ownerProcedure;

// Accountant-only procedure (for financial operations)
export const accountantProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || !['owner', 'accountant'].includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Only owner and accountant can access this" });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// Media buyer procedure (for ad campaign management)
export const mediaBuyerProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || !['owner', 'media_buyer'].includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Only owner and media buyer can access this" });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// Operations procedure (for order and fulfillment management)
export const operationsProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || !['owner', 'operations', 'customer_support'].includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Only owner, operations, and customer support can access this" });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// Inventory manager procedure
export const inventoryProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || !['owner', 'inventory_manager'].includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Only owner and inventory manager can access this" });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
