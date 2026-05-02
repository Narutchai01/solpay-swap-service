import { HealthRoute } from "../handler/health.handler.js";
import { Hono } from "hono";
import { SwapRoute } from "../handler/swap.handler.js";
export class Routes {
    app;
    raydium;
    constructor(app, raydium) {
        this.app = app;
        this.raydium = raydium;
    }
    SetUp() {
        const v1 = new Hono();
        HealthRoute(v1);
        SwapRoute(v1, this.raydium);
        this.app.route("/api/v1", v1);
    }
}
