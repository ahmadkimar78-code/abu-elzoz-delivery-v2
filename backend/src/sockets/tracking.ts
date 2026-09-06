import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { verifyAccessToken } from "../utils/auth";
import { logger } from "../config/logger";

let io: Server;

// آخر وقت اتبثت فيه تحديث موقع لكل طلب — عشان نمنع إغراق الغرفة بتحديثات متلاحقة
const lastLocationEmitAt = new Map<string, number>();
const LOCATION_THROTTLE_MS = 2000;

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL || "*" },
  });

  io.use((socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Unauthorized"));
      const payload = verifyAccessToken(token);
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("order:subscribe", (orderId: string) => {
      socket.join(`order:${orderId}`);
    });

    // driver app streams live GPS coordinates while on a delivery — مقيدة بمعدل أقصى
    socket.on("driver:location", (data: { orderId: string; lat: number; lng: number }) => {
      const now = Date.now();
      const last = lastLocationEmitAt.get(data.orderId) ?? 0;
      if (now - last < LOCATION_THROTTLE_MS) return; // تجاهل التحديثات المتقاربة جدًا

      lastLocationEmitAt.set(data.orderId, now);
      io.to(`order:${data.orderId}`).emit("order:driverLocation", {
        lat: data.lat,
        lng: data.lng,
      });
    });

    socket.on("disconnect", () => {
      // cleanup handled automatically by socket.io room membership
    });
  });

  return io;
}

// called from REST controllers (e.g. order status change) to push updates
export function emitOrderUpdate(orderId: string, payload: unknown) {
  io?.to(`order:${orderId}`).emit("order:statusUpdate", payload);
  if (payload && typeof payload === "object" && "status" in payload) {
    const status = (payload as { status: string }).status;
    if (status === "DELIVERED" || status === "CANCELLED") {
      lastLocationEmitAt.delete(orderId); // تنظيف الذاكرة بعد انتهاء الطلب
    }
  }
}
