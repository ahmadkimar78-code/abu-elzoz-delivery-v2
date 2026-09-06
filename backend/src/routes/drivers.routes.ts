import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../config/prisma";
import { authenticate, authorize } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import {
  getDriverByUserIdOrThrow,
  toggleDriverAvailability,
  updateDriverLocation,
} from "../services/driver.service";

const router = Router();

// POST /api/drivers/profile — create driver profile after registering as DRIVER role
const profileSchema = z.object({ vehicleType: z.string().optional() });

router.post("/profile", authenticate, authorize(Role.DRIVER), async (req, res) => {
  const data = profileSchema.parse(req.body);
  const existing = await prisma.driver.findUnique({ where: { userId: req.user!.userId } });
  if (existing) throw new AppError("Driver profile already exists", 409);

  const driver = await prisma.driver.create({
    data: { userId: req.user!.userId, vehicleType: data.vehicleType },
  });
  res.status(201).json(driver);
});

// PATCH /api/drivers/availability — toggle online/offline (بيحدّث Redis GEO set كمان)
router.patch("/availability", authenticate, authorize(Role.DRIVER), async (req, res) => {
  const updated = await toggleDriverAvailability(req.user!.userId);
  res.json(updated);
});

// PATCH /api/drivers/location — update live GPS position (called periodically by driver app)
const locationSchema = z.object({ lat: z.number(), lng: z.number() });

router.patch("/location", authenticate, authorize(Role.DRIVER), async (req, res) => {
  const { lat, lng } = locationSchema.parse(req.body);
  const updated = await updateDriverLocation(req.user!.userId, lat, lng);
  res.json(updated);
});

// GET /api/drivers/active-orders — driver's currently assigned orders
router.get("/active-orders", authenticate, authorize(Role.DRIVER), async (req, res) => {
  const driver = await getDriverByUserIdOrThrow(req.user!.userId);

  const orders = await prisma.order.findMany({
    where: { driverId: driver.id, status: { notIn: ["DELIVERED", "CANCELLED"] } },
    include: { restaurant: true, address: true },
  });
  res.json(orders);
});

export default router;
