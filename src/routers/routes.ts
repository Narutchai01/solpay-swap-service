import type { Raydium } from "@raydium-io/raydium-sdk-v2";
import { HealthRoute } from "../handler/health.handler.js";
import { Hono } from "hono";
import { SwapRoute } from "../handler/swap.handler.js";

export class Routes {
  constructor(
    private readonly app: Hono,
    private readonly raydium: Raydium,
  ) {}

  SetUp() {
    const v1 = new Hono();
    HealthRoute(v1);
    SwapRoute(v1, this.raydium);
    this.app.route("/api/v1", v1);
  }
}
