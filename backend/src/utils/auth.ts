import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { Role } from "@prisma/client";

export interface JwtPayload {
  userId: string;
  role: Role;
}

export const hashPassword = (plain: string) => bcrypt.hash(plain, 10);
export const comparePassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

// process.env.X مطبوعة كـ string عام، لكن jsonwebtoken محتاج نوع StringValue محدد (زي "15m")،
// فبنعمل cast صريح هنا بدل ما نغيّر نوع الإرجاع بتاع process.env
export const signAccessToken = (payload: JwtPayload) =>
  jwt.sign(payload, process.env.JWT_ACCESS_SECRET as string, {
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || "15m") as SignOptions["expiresIn"],
  });

export const signRefreshToken = (payload: JwtPayload) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET as string, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || "7d") as SignOptions["expiresIn"],
  });

export const verifyAccessToken = (token: string): JwtPayload =>
  jwt.verify(token, process.env.JWT_ACCESS_SECRET as string) as JwtPayload;

export const verifyRefreshToken = (token: string): JwtPayload =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as JwtPayload;
