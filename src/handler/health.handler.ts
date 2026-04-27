import type { Hono } from "hono";
import { HealthServiceImpl } from "../service/health.service.js";

export const HealthRoute = (app: Hono) => {
  app.get("/health", async (c) => {
    const healthService = new HealthServiceImpl();
    const isHealthy = await healthService.HealthCheck();
    return c.json({ status: isHealthy ? "ok" : "error" });
  });
};
