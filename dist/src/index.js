import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { Routes } from "./routers/routes.js";
import { config } from "./config/config.js";
import { Raydium } from "@raydium-io/raydium-sdk-v2";
import { Connection } from "@solana/web3.js";
import { logger } from "hono/logger";
const app = new Hono();
app.use(logger());
const connection = new Connection(config.rpcUrl, "confirmed");
const raydium = await Raydium.load({
    connection,
});
const routes = new Routes(app, raydium);
routes.SetUp();
serve({
    fetch: app.fetch,
    port: config.port,
}, (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
});
