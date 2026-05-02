import { Raydium, PoolUtils } from "@raydium-io/raydium-sdk-v2";
import { Connection } from "@solana/web3.js";
import BN from "bn.js";
async function main() {
    const connection = new Connection("https://api.devnet.solana.com");
    const raydium = await Raydium.load({
        connection,
        cluster: "devnet",
        disableFeatureCheck: true,
    });
    const poolId = "FXAXqgjNK6JVzVV2frumKTEuxC8hTEUhVTJTRhMMwLmM";
    const { poolInfo, tickData } = await raydium.clmm.getPoolInfoFromRpc(poolId);
    const clmmPoolInfo = await PoolUtils.fetchComputeClmmInfo({
        connection: raydium.connection,
        poolInfo,
    });
    const tickCache = await PoolUtils.fetchMultiplePoolTickArrays({
        connection: raydium.connection,
        poolKeys: [clmmPoolInfo],
    });
    const quote = PoolUtils.computeAmountOutFormat({
        poolInfo: clmmPoolInfo,
        tickArrayCache: tickCache[poolId],
        amountIn: new BN("1000000"),
        tokenOut: poolInfo.mintB,
        slippage: 0.01,
        epochInfo: await connection.getEpochInfo(),
    });
    console.log("Success GetInfo", quote.executionPrice.toFixed());
}
main().catch(console.error);
