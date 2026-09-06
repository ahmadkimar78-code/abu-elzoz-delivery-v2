import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";

export interface JwtPayload {
  userId: string;
  role: Role;
}

export const hashPassword = (plain: string) => bcrypt.hash(plain, 10);
export const comparePassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

export const signAccessToken = (payload: JwtPayload) =>
  jwt.sign(payload, process.env.JWT_ACCESS_SECRET as string, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  });

export const signRefreshToken = (payload: JwtPayload) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET as string, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  });

export const verifyAccessToken = (token: string): JwtPayload =>
  jwt.verify(token, process.env.JWT_ACCESS_SECRET as string) as JwtPayload;

export const verifyRefreshToken = (token: string): JwtPayload =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as JwtPayload;
