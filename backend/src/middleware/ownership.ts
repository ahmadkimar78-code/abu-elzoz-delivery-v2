import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma";
import { AppError } from "./errorHandler";

declare global {
  namespace Express {
    interface Request {
      restaurant?: Awaited<ReturnType<typeof prisma.restaurant.findUnique>>;
    }
  }
}

/**
 * بيتأكد إن صاحب المطعم اللي بيبعت الطلب هو فعلاً مالك المطعم بالـ :id في الـ URL.
 * بيحفظ المطعم على req.restaurant عشان الـ route handler ميعملش fetch تاني.
 */
export async function requireRestaurantOwnership(req: Request, _res: Response, next: NextFunction) {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: req.params.id } });
  if (!restaurant) throw new AppError("Restaurant not found", 404);
  if (restaurant.ownerId !== req.user!.userId) throw new AppError("Forbidden", 403);
  req.restaurant = restaurant;
  next();
}
