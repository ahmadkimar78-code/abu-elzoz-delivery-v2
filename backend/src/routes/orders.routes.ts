import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { OrderStatus, AppRole } from "@abuelzoz/shared";
import { prisma } from "../config/prisma";
import { authenticate, authorize } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { createOrder, transitionOrderStatus } from "../services/order.service";

const router = Router();

const createOrderSchema = z.object({
  restaurantId: z.string().uuid(),
  addressId: z.string().uuid(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().uuid(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
});

// POST /api/orders — customer places an order
router.post("/", authenticate, authorize(Role.CUSTOMER), async (req, res) => {
  const data = createOrderSchema.parse(req.body);
  const order = await createOrder({ customerId: req.user!.userId, ...data });
  res.status(201).json(order);
});

// GET /api/orders/:id — order details (customer, restaurant owner, driver, or admin)
router.get("/:id", authenticate, async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { items: { include: { menuItem: true } }, restaurant: true, driver: true, address: true },
  });
  if (!order) throw new AppError("Order not found", 404);
  res.json(order);
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
});

// GET /api/orders — paginated list of the current user's orders (customer view)
router.get("/", authenticate, async (req, res) => {
  const { page, pageSize } = listQuerySchema.parse(req.query);
  const where = { customerId: req.user!.userId };

  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { items: true, restaurant: { select: { name: true } } },
    }),
    prisma.order.count({ where }),
  ]);

  res.json({ data, page, pageSize, total });
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

// PATCH /api/orders/:id/status — restaurant/driver/admin transitions the order
// كل منطق التحقق من صحة الانتقال وتعيين السائق بقى جوه order.service.ts
router.patch(
  "/:id/status",
  authenticate,
  authorize(Role.RESTAURANT, Role.DRIVER, Role.ADMIN),
  async (req, res) => {
    const { status } = updateStatusSchema.parse(req.body);
    const updated = await transitionOrderStatus({
      orderId: req.params.id,
      requestedStatus: status,
      actingRole: req.user!.role as AppRole,
    });
    res.json(updated);
  }
);

export default router;
