import "express-async-errors";
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { createServer } from "http";

import { validateEnv, env } from "./config/env";
import { logger } from "./config/logger";

validateEnv(); // بيوقف الإقلاع فورًا لو أي متغير بيئة أساسي ناقص، بدل ما يفشل بصمت وقت أول طلب

import authRoutes from "./routes/auth.routes";
import restaurantRoutes from "./routes/restaurants.routes";
import orderRoutes from "./routes/orders.routes";
import driverRoutes from "./routes/drivers.routes";
import adminRoutes from "./routes/admin.routes";
import addressRoutes from "./routes/addresses.routes";
import { errorHandler } from "./middleware/errorHandler";
import { initSocket } from "./sockets/tracking";

const app = express();
const httpServer = createServer(app);

app.use(helmet());
app.use(cors({ origin: env.clientUrl }));
app.use(express.json());
app.use(pinoHttp({ logger }));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/addresses", addressRoutes);

app.use(errorHandler);

initSocket(httpServer);

httpServer.listen(env.port, () => {
  logger.info(`🚀 AbuElZoz Delivery API running on port ${env.port}`);
});
