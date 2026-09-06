import { Router } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../config/prisma";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();
router.use(authenticate, authorize(Role.ADMIN));

// GET /api/admin/stats — quick overview for the admin dashboard
router.get("/stats", async (_req, res) => {
  const [totalUsers, totalOrders, activeOrders, totalRestaurants, totalDrivers] = await Promise.all([
    prisma.user.count(),
    prisma.order.count(),
    prisma.order.count({ where: { status: { notIn: ["DELIVERED", "CANCELLED"] } } }),
    prisma.restaurant.count(),
    prisma.driver.count(),
  ]);

  res.json({ totalUsers, totalOrders, activeOrders, totalRestaurants, totalDrivers });
});

// GET /api/admin/orders — all orders, most recent first
router.get("/orders", async (req, res) => {
  const page = Number(req.query.page) || 1;
  const pageSize = 20;

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: { customer: { select: { name: true } }, restaurant: { select: { name: true } } },
  });
  res.json(orders);
});

// GET /api/admin/users — manage users
router.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(users);
});

export default router;
