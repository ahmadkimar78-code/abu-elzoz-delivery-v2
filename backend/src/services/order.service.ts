import { OrderStatus, AppRole, isTransitionAllowed, OrderStatusType } from "@abuelzoz/shared";
import { prisma } from "../config/prisma";
import { AppError } from "../middleware/errorHandler";
import { env } from "../config/env";
import { findNearestAvailableDriver, markDriverBusy, releaseDriver } from "./driver.service";
import { emitOrderUpdate } from "../sockets/tracking";
import { logger } from "../config/logger";

interface CreateOrderInput {
  customerId: string;
  restaurantId: string;
  addressId: string;
  items: { menuItemId: string; quantity: number }[];
}

export async function createOrder(input: CreateOrderInput) {
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: input.items.map((i) => i.menuItemId) }, restaurantId: input.restaurantId },
  });
  if (menuItems.length !== input.items.length) {
    throw new AppError("One or more menu items are invalid", 400);
  }

  const address = await prisma.address.findUnique({ where: { id: input.addressId } });
  if (!address || address.userId !== input.customerId) {
    throw new AppError("Invalid delivery address", 400);
  }

  const priceMap = new Map(menuItems.map((m): [string, number] => [m.id, Number(m.price)]));
  const subtotal = input.items.reduce(
    (sum: number, item) => sum + priceMap.get(item.menuItemId)! * item.quantity,
    0
  );
  // NOTE: رسم توصيل ثابت مبدئيًا ومتحكم فيه بمتغير بيئة (DELIVERY_BASE_FEE) بدل ما يبقى
  // رقم هارد-كودد في الكود. التسعير حسب المسافة/المنطقة يحتاج جدول تسعير منفصل لاحقًا.
  const deliveryFee = env.deliveryBaseFee;
  const total = subtotal + deliveryFee;

  return prisma.order.create({
    data: {
      customerId: input.customerId,
      restaurantId: input.restaurantId,
      addressId: input.addressId,
      subtotal,
      deliveryFee,
      total,
      status: OrderStatus.PENDING,
      items: {
        create: input.items.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          price: priceMap.get(i.menuItemId)!,
        })),
      },
      statusLogs: { create: { status: OrderStatus.PENDING } },
    },
    include: { items: true },
  });
}

interface TransitionInput {
  orderId: string;
  requestedStatus: OrderStatusType;
  actingRole: AppRole;
}

/**
 * بينفذ انتقال حالة الطلب بعد التحقق من الـ state machine المشتركة (@abuelzoz/shared).
 * التخصيص التلقائي للسائق بيحصل هنا لما الحالة توصل READY_FOR_PICKUP، مش في الـ route.
 */
export async function transitionOrderStatus({ orderId, requestedStatus, actingRole }: TransitionInput) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { restaurant: true } });
  if (!order) throw new AppError("Order not found", 404);

  if (!isTransitionAllowed(order.status as OrderStatusType, requestedStatus, actingRole)) {
    throw new AppError(
      `Transition from ${order.status} to ${requestedStatus} is not allowed for role ${actingRole}`,
      422
    );
  }

  let driverId = order.driverId;

  if (requestedStatus === OrderStatus.READY_FOR_PICKUP && !driverId) {
    const driver = await findNearestAvailableDriver(order.restaurant.lat, order.restaurant.lng);
    if (driver) {
      await markDriverBusy(driver.id);
      driverId = driver.id;
    } else {
      logger.warn({ orderId }, "No available driver found nearby; order stays READY_FOR_PICKUP");
    }
  }

  const finalStatus = driverId && !order.driverId ? OrderStatus.DRIVER_ASSIGNED : requestedStatus;

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: finalStatus,
      driverId: driverId ?? undefined,
      statusLogs: { create: { status: finalStatus } },
    },
  });

  if (
    (requestedStatus === OrderStatus.DELIVERED || requestedStatus === OrderStatus.CANCELLED) &&
    updated.driverId
  ) {
    await releaseDriver(updated.driverId);
  }

  emitOrderUpdate(order.id, { status: updated.status, driverId: updated.driverId });
  return updated;
}
