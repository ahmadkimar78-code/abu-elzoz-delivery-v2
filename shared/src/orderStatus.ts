// المصدر الوحيد للحقيقة لحالات الطلب — الباك اند والفرونت اند بياخدوا منه بدل التكرار

export const OrderStatus = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  PREPARING: "PREPARING",
  READY_FOR_PICKUP: "READY_FOR_PICKUP",
  DRIVER_ASSIGNED: "DRIVER_ASSIGNED",
  PICKED_UP: "PICKED_UP",
  ON_THE_WAY: "ON_THE_WAY",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
} as const;

export type OrderStatusType = (typeof OrderStatus)[keyof typeof OrderStatus];

export const ORDER_STATUS_LABELS_AR: Record<OrderStatusType, string> = {
  PENDING: "بانتظار تأكيد المطعم",
  ACCEPTED: "تم قبول الطلب",
  PREPARING: "جاري التحضير",
  READY_FOR_PICKUP: "جاهز للاستلام",
  DRIVER_ASSIGNED: "تم تعيين السائق",
  PICKED_UP: "استلم السائق الطلب",
  ON_THE_WAY: "في الطريق إليك",
  DELIVERED: "تم التوصيل",
  CANCELLED: "تم الإلغاء",
};

export type AppRole = "CUSTOMER" | "RESTAURANT" | "DRIVER" | "ADMIN";

/**
 * خريطة الانتقالات المسموحة: كل حالة بتحدد مين يقدر ينقلها لأنهي حالة تالية.
 * ده بيمنع مثلاً DRIVER من رجوع الطلب لـ PENDING، أو RESTAURANT من تخطي التحضير مباشرة لـ DELIVERED.
 */
export const ALLOWED_TRANSITIONS: Record<
  OrderStatusType,
  Partial<Record<AppRole, OrderStatusType[]>>
> = {
  PENDING: {
    RESTAURANT: [OrderStatus.ACCEPTED, OrderStatus.CANCELLED],
    ADMIN: [OrderStatus.ACCEPTED, OrderStatus.CANCELLED],
  },
  ACCEPTED: {
    RESTAURANT: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
    ADMIN: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  },
  PREPARING: {
    RESTAURANT: [OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED],
    ADMIN: [OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED],
  },
  READY_FOR_PICKUP: {
    // النظام هو اللي بينقلها تلقائيًا لـ DRIVER_ASSIGNED عند إيجاد سائق
    ADMIN: [OrderStatus.CANCELLED],
  },
  DRIVER_ASSIGNED: {
    DRIVER: [OrderStatus.PICKED_UP],
    ADMIN: [OrderStatus.PICKED_UP, OrderStatus.CANCELLED],
  },
  PICKED_UP: {
    DRIVER: [OrderStatus.ON_THE_WAY],
    ADMIN: [OrderStatus.ON_THE_WAY, OrderStatus.CANCELLED],
  },
  ON_THE_WAY: {
    DRIVER: [OrderStatus.DELIVERED],
    ADMIN: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  },
  DELIVERED: {},
  CANCELLED: {},
};

export function isTransitionAllowed(
  current: OrderStatusType,
  next: OrderStatusType,
  role: AppRole
): boolean {
  const allowedForRole = ALLOWED_TRANSITIONS[current]?.[role];
  return Boolean(allowedForRole?.includes(next));
}
