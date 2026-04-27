import { Raydium, PoolUtils } from "@raydium-io/raydium-sdk-v2";
import BN from "bn.js";
const DEFAULT_POOL_ID = "FXAXqgjNK6JVzVV2frumKTEuxC8hTEUhVTJTRhMMwLmM";
const DEFAULT_AMOUNT_IN = "1000000";
const DEFAULT_SLIPPAGE = 0.01;
export class SwapServiceImpl {
    raydium;
    constructor(raydium) {
        this.raydium = raydium;
    }
    async GetInfo(params) {
        const poolId = (params?.poolId || DEFAULT_POOL_ID).trim();
        const amountInRaw = (params?.amountIn || DEFAULT_AMOUNT_IN).trim();
        const slippage = params?.slippage ?? DEFAULT_SLIPPAGE;
        if (!/^\d+$/.test(amountInRaw) || new BN(amountInRaw).lte(new BN(0))) {
            throw new Error("amountIn must be a positive integer string");
        }
        if (!Number.isFinite(slippage) || slippage <= 0 || slippage >= 1) {
            throw new Error("slippage must be a decimal number between 0 and 1");
        }
        const { poolInfo, tickData } = await this.raydium.clmm.getPoolInfoFromRpc(poolId);
        const inputMint = (params?.inputMint || poolInfo.mintA.address).trim();
        if (inputMint !== poolInfo.mintA.address &&
            inputMint !== poolInfo.mintB.address) {
            throw new Error("inputMint must match pool mintA or mintB");
        }
        const tokenOut = poolInfo.mintA.address === inputMint ? poolInfo.mintB : poolInfo.mintA;
        const connection = this.raydium.connection;
        const quote = PoolUtils.computeAmountOutFormat({
            poolInfo: poolInfo,
            tickArrayCache: tickData,
            amountIn: new BN(amountInRaw),
            tokenOut,
            slippage,
            epochInfo: await connection.getEpochInfo(),
        });
        const toAmountView = (value) => ({
            rawAmount: value.amount.raw.toString(),
            decimalAmount: value.amount.toFixed(),
            feeRawAmount: value.fee?.raw?.toString(),
            feeDecimalAmount: value.fee?.toFixed?.(),
            expirationTime: value.expirationTime,
        });
        return {
            poolId,
            inputMint,
            outputMint: tokenOut.address,
            slippage,
            amountInRequested: amountInRaw,
            currentPrice: quote.currentPrice.toFixed(),
            executionPrice: quote.executionPrice.toFixed(),
            priceImpact: quote.priceImpact.toSignificant(),
            executionPriceX64: quote.executionPriceX64.toString(),
            remainingAccounts: quote.remainingAccounts.map((account) => account.toBase58()),
            realAmountIn: toAmountView(quote.realAmountIn),
            amountOut: toAmountView(quote.amountOut),
            minAmountOut: toAmountView(quote.minAmountOut),
            fee: {
                rawAmount: quote.fee.raw.toString(),
                decimalAmount: quote.fee.toFixed(),
            },
        };
    }
}
