import { Raydium } from "@raydium-io/raydium-sdk-v2";
import { SwapServiceImpl } from "../service/swap.service.js";
export const SwapRoute = (app, raydium) => {
    app.get("/swap", async (c) => {
        try {
            const swapService = new SwapServiceImpl(raydium);
            const slippageRaw = c.req.query("slippage");
            const slippage = slippageRaw === undefined ? undefined : Number.parseFloat(slippageRaw);
            const data = await swapService.GetInfo({
                poolId: c.req.query("poolId"),
                inputMint: c.req.query("inputMint"),
                amountIn: c.req.query("amountIn"),
                slippage,
            });
            return c.json({ status: "ok", data });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Failed to compute swap quote";
            return c.json({ status: "error", message }, 400);
        }
    });
    app.post("/swap", async (c) => {
        try {
            const swapService = new SwapServiceImpl(raydium);
            const body = await c.req.json().catch(() => ({}));
            const data = await swapService.Swap({
                wallet: body.wallet,
                poolId: body.poolId,
                inputMint: body.inputMint,
                amountIn: body.amountIn,
                slippage: body.slippage,
            });
            return c.json({ status: "ok", data });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Failed to build swap transaction";
            return c.json({ status: "error", message }, 400);
        }
    });
};
