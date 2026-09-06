import { Role } from "@prisma/client";
import { prisma } from "../config/prisma";
import { redis } from "../config/redis";
import { AppError } from "../middleware/errorHandler";
import {
  hashPassword,
  comparePassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/auth";

const REFRESH_TOKEN_PREFIX = "refresh_token:";
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 يوم — يطابق JWT_REFRESH_EXPIRES_IN الافتراضي

async function issueTokenPair(userId: string, role: Role) {
  const payload = { userId, role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  // بنخزن الـ refresh token في Redis عشان نقدر نبطله وقت الـ logout —
  // من غير كده التوكن فضل صالح لحد ما ينتهي طبيعيًا حتى لو المستخدم عمل logout
  await redis.set(`${REFRESH_TOKEN_PREFIX}${refreshToken}`, userId, "EX", REFRESH_TTL_SECONDS);
  return { accessToken, refreshToken };
}

export async function registerUser(data: {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: Role;
}) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: data.email }, { phone: data.phone }] },
  });
  if (existing) throw new AppError("User with this email or phone already exists", 409);

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: { name: data.name, email: data.email, phone: data.phone, passwordHash, role: data.role },
  });

  const tokens = await issueTokenPair(user.id, user.role);
  return { user, ...tokens };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError("Invalid credentials", 401);

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) throw new AppError("Invalid credentials", 401);

  const tokens = await issueTokenPair(user.id, user.role);
  return { user, ...tokens };
}

export async function refreshAccessToken(refreshToken: string) {
  const storedUserId = await redis.get(`${REFRESH_TOKEN_PREFIX}${refreshToken}`);
  if (!storedUserId) throw new AppError("Invalid or expired refresh token", 401);

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  // Token rotation: نلغي القديم ونطلع زوج جديد — لو حد سرق الـ refresh token القديم
  // بعد ما اتستخدم، مش هيقدر يستخدمه تاني
  await redis.del(`${REFRESH_TOKEN_PREFIX}${refreshToken}`);
  return issueTokenPair(payload.userId, payload.role);
}

export async function logoutUser(refreshToken: string) {
  await redis.del(`${REFRESH_TOKEN_PREFIX}${refreshToken}`);
}
