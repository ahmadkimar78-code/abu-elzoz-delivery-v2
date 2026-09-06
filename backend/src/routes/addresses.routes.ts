import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { authenticate } from "../middleware/auth";

const router = Router();

// GET /api/addresses — current user's saved addresses
router.get("/", authenticate, async (req, res) => {
  const addresses = await prisma.address.findMany({
    where: { userId: req.user!.userId },
    orderBy: { isDefault: "desc" },
  });
  res.json(addresses);
});

const createAddressSchema = z.object({
  label: z.string().min(1),
  street: z.string().min(1),
  city: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  isDefault: z.boolean().optional(),
});

// POST /api/addresses — add a new address for the current user
router.post("/", authenticate, async (req, res) => {
  const data = createAddressSchema.parse(req.body);

  // لو الـ address ده هيبقى default، نشيل الـ default من أي عنوان تاني للمستخدم
  if (data.isDefault) {
    await prisma.address.updateMany({
      where: { userId: req.user!.userId },
      data: { isDefault: false },
    });
  }

  const address = await prisma.address.create({
    data: { ...data, userId: req.user!.userId },
  });
  res.status(201).json(address);
});

export default router;
