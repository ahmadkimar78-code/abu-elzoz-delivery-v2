import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { Role } from "@prisma/client";
import { registerUser, loginUser, refreshAccessToken, logoutUser } from "../services/auth.service";

const router = Router();

// حماية بسيطة من محاولات تخمين كلمة المرور — 10 محاولات كل 15 دقيقة لكل IP
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again later" },
});

function toPublicUser(user: { id: string; name: string; email: string; role: Role }) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  password: z.string().min(6),
  role: z.nativeEnum(Role).default(Role.CUSTOMER),
});

router.post("/register", authRateLimiter, async (req, res) => {
  const data = registerSchema.parse(req.body);
  const { user, accessToken, refreshToken } = await registerUser(data);
  res.status(201).json({ user: toPublicUser(user), accessToken, refreshToken });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post("/login", authRateLimiter, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const { user, accessToken, refreshToken } = await loginUser(email, password);
  res.json({ user: toPublicUser(user), accessToken, refreshToken });
});

const refreshSchema = z.object({ refreshToken: z.string() });

router.post("/refresh", async (req, res) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  const tokens = await refreshAccessToken(refreshToken);
  res.json(tokens);
});

// POST /api/auth/logout — بيبطل الـ refresh token فعليًا بدل ما يفضل صالح على السيرفر
router.post("/logout", async (req, res) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  await logoutUser(refreshToken);
  res.status(204).send();
});

export default router;
