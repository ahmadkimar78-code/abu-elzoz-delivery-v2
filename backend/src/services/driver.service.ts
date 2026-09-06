import { prisma } from "../config/prisma";
import { redis } from "../config/redis";
import { AppError } from "../middleware/errorHandler";
import { logger } from "../config/logger";

const DRIVERS_GEO_KEY = "drivers:geo";
const SEARCH_RADIUS_KM = 15;

export async function getDriverByUserIdOrThrow(userId: string) {
  const driver = await prisma.driver.findUnique({ where: { userId } });
  if (!driver) throw new AppError("Driver profile not found", 404);
  return driver;
}

export async function updateDriverLocation(userId: string, lat: number, lng: number) {
  const driver = await getDriverByUserIdOrThrow(userId);

  const updated = await prisma.driver.update({
    where: { id: driver.id },
    data: { lastLat: lat, lastLng: lng },
  });

  // حدّث الموقع في Redis GEO فقط لو السائق شغّال (متاح) — عشان مجموعة البحث تفضل نظيفة
  if (updated.isAvailable) {
    await redis.geoadd(DRIVERS_GEO_KEY, lng, lat, updated.id);
  }

  return updated;
}

export async function setDriverAvailability(userId: string, isAvailable: boolean) {
  const driver = await getDriverByUserIdOrThrow(userId);

  const updated = await prisma.driver.update({
    where: { id: driver.id },
    data: { isAvailable },
  });

  if (isAvailable && updated.lastLat != null && updated.lastLng != null) {
    await redis.geoadd(DRIVERS_GEO_KEY, updated.lastLng, updated.lastLat, updated.id);
  } else {
    await redis.zrem(DRIVERS_GEO_KEY, updated.id);
  }

  return updated;
}

export async function toggleDriverAvailability(userId: string) {
  const driver = await getDriverByUserIdOrThrow(userId);
  return setDriverAvailability(userId, !driver.isAvailable);
}

/**
 * بيدور على أقرب سائق متاح باستخدام Redis GEOSEARCH (O(log n)) بدل ما كان
 * بيعمل scan كامل لكل السائقين المتاحين في Postgres على كل طلب.
 * لو Redis مش راجع نتيجة (مثلاً أول تشغيل قبل أي سائق يحدّث موقعه)، بيرجع null
 * والطلب يفضل بحالة READY_FOR_PICKUP لحد ما سائق يبقى متاح.
 */
export async function findNearestAvailableDriver(lat: number, lng: number) {
  let nearestIds: string[] = [];
  try {
    const result = (await redis.call(
      "GEOSEARCH",
      DRIVERS_GEO_KEY,
      "FROMLONLAT",
      lng,
      lat,
      "BYRADIUS",
      SEARCH_RADIUS_KM,
      "km",
      "ASC",
      "COUNT",
      "5"
    )) as string[];
    nearestIds = result;
  } catch (err) {
    logger.error({ err }, "GEOSEARCH failed, falling back to no-match");
    return null;
  }

  if (nearestIds.length === 0) return null;

  // بنتحقق من قاعدة البيانات إن السائق لسه متاح فعلاً (race condition guard:
  // ممكن يبقى اتعين لطلب تاني في نفس اللحظة قبل ما نوصله)
  for (const driverId of nearestIds) {
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (driver?.isAvailable) return driver;
    // لو مش متاح، نظّف الـ geo set من الإدخال القديم
    await redis.zrem(DRIVERS_GEO_KEY, driverId);
  }

  return null;
}

/** بيتنادى بعد ما السائق يتعين لطلب — يشيله من مجموعة البحث لحد ما يخلص التوصيلة */
export async function markDriverBusy(driverId: string) {
  await prisma.driver.update({ where: { id: driverId }, data: { isAvailable: false } });
  await redis.zrem(DRIVERS_GEO_KEY, driverId);
}

/** بيتنادى لما الطلب يتسلم أو يتلغي — يرجّع السائق متاح تاني */
export async function releaseDriver(driverId: string) {
  const driver = await prisma.driver.update({
    where: { id: driverId },
    data: { isAvailable: true },
  });
  if (driver.lastLat != null && driver.lastLng != null) {
    await redis.geoadd(DRIVERS_GEO_KEY, driver.lastLng, driver.lastLat, driver.id);
  }
}
