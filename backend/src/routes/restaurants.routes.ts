import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../config/prisma";
import { redis } from "../config/redis";
import { env } from "../config/env";
import { authenticate, authorize } from "../middleware/auth";
import { requireRestaurantOwnership } from "../middleware/ownership";
import { logger } from "../config/logger";

const router = Router();

const listQuerySchema = z.object({
  city: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
});

// GET /api/restaurants?city=اللاذقية&page=1 — public listing, cached briefly per city+page
router.get("/", async (req, res) => {
  const { city, page, pageSize } = listQuerySchema.parse(req.query);
  const cacheKey = `restaurants:list:${city ?? "all"}:${page}:${pageSize}`;

  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) return res.json(JSON.parse(cached));

  const where = { isOpen: true, ...(city ? { city } : {}) };
  const [data, total] = await Promise.all([
    prisma.restaurant.findMany({
      where,
      orderBy: { rating: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.restaurant.count({ where }),
  ]);

  const result = { data, page, pageSize, total };

  redis
    .set(cacheKey, JSON.stringify(result), "EX", env.restaurantListCacheTtlSeconds)
    .catch((err) => logger.warn({ err }, "Failed to cache restaurant listing"));

  res.json(result);
});

// GET /api/restaurants/:id — details + menu (not cached: changes frequently via menu edits)
router.get("/:id", async (req, res) => {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: req.params.id },
    include: { menuItems: { where: { isAvailable: true } } },
  });
  if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });
  res.json(restaurant);
});

// POST /api/restaurants — create restaurant profile (restaurant-owner only)
const createRestaurantSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  city: z.string(),
  lat: z.number(),
  lng: z.number(),
});

router.post("/", authenticate, authorize(Role.RESTAURANT), async (req, res) => {
  const data = createRestaurantSchema.parse(req.body);
  const restaurant = await prisma.restaurant.create({
    data: { ...data, ownerId: req.user!.userId },
  });
  res.status(201).json(restaurant);
});

// POST /api/restaurants/:id/menu-items — add menu item (owner only, via ownership middleware)
const menuItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  category: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

router.post(
  "/:id/menu-items",
  authenticate,
  authorize(Role.RESTAURANT),
  requireRestaurantOwnership,
  async (req, res) => {
    const data = menuItemSchema.parse(req.body);
    const item = await prisma.menuItem.create({
      data: { ...data, restaurantId: req.restaurant!.id },
    });
    res.status(201).json(item);
  }
);

// PATCH /api/restaurants/:id/toggle-open — open/close store
router.patch(
  "/:id/toggle-open",
  authenticate,
  authorize(Role.RESTAURANT),
  requireRestaurantOwnership,
  async (req, res) => {
    const updated = await prisma.restaurant.update({
      where: { id: req.restaurant!.id },
      data: { isOpen: !req.restaurant!.isOpen },
    });
    // امسح الكاش الخاص بمدينة المطعم عشان أي فتح/قفل يظهر فورًا في القايمة
    const keys = await redis.keys(`restaurants:list:${req.restaurant!.city}:*`);
    if (keys.length) await redis.del(...keys);
    res.json(updated);
  }
);

export default router;
