import { Raydium, PoolUtils, TxVersion } from "@raydium-io/raydium-sdk-v2";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import crypto from "crypto";
const DEFAULT_POOL_ID = "FXAXqgjNK6JVzVV2frumKTEuxC8hTEUhVTJTRhMMwLmM";
const DEFAULT_AMOUNT_IN = "1000000";
const DEFAULT_SLIPPAGE = 0.01;
export class SwapServiceImpl {
    raydium;
    constructor(raydium) {
        this.raydium = raydium;
    }
    async GetInfo(params) {
        return this.GetQuote(params);
    }
    async GetQuote(params) {
        const poolId = (params?.poolId || DEFAULT_POOL_ID).trim();
        const amountInRaw = (params?.amountIn || DEFAULT_AMOUNT_IN).trim();
        const slippage = params?.slippage ?? DEFAULT_SLIPPAGE;
        if (!/^\d+$/.test(amountInRaw) || new BN(amountInRaw).lte(new BN(0))) {
            throw new Error("amountIn must be a positive integer string");
        }
        if (!Number.isFinite(slippage) || slippage <= 0 || slippage >= 1) {
            throw new Error("slippage must be a decimal number between 0 and 1");
        }
        const { poolInfo } = await this.raydium.clmm.getPoolInfoFromRpc(poolId);
        const inputMint = (params?.inputMint || poolInfo.mintA.address).trim();
        if (inputMint !== poolInfo.mintA.address &&
            inputMint !== poolInfo.mintB.address) {
            throw new Error("inputMint must match pool mintA or mintB");
        }
        const tokenOut = poolInfo.mintA.address === inputMint ? poolInfo.mintB : poolInfo.mintA;
        const connection = this.raydium.connection;
        const clmmPoolInfo = await PoolUtils.fetchComputeClmmInfo({
            connection,
            poolInfo,
        });
        const tickCache = await PoolUtils.fetchMultiplePoolTickArrays({
            connection,
            poolKeys: [clmmPoolInfo],
        });
        const quote = PoolUtils.computeAmountOutFormat({
            poolInfo: clmmPoolInfo,
            tickArrayCache: tickCache[poolId],
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
    async BuildInstructions(params) {
        const poolId = (params?.poolId || DEFAULT_POOL_ID).trim();
        const amountInRaw = (params?.amountIn || DEFAULT_AMOUNT_IN).trim();
        const slippage = params?.slippage ?? DEFAULT_SLIPPAGE;
        const wallet = params.wallet?.trim();
        if (!wallet) {
            throw new Error("wallet is required");
        }
        if (!/^\d+$/.test(amountInRaw) || new BN(amountInRaw).lte(new BN(0))) {
            throw new Error("amountIn must be a positive integer string");
        }
        const connection = this.raydium.connection;
        const cluster = connection.rpcEndpoint.includes("devnet")
            ? "devnet"
            : "mainnet";
        const raydium = await Raydium.load({
            connection,
            owner: new PublicKey(wallet),
            cluster,
            disableFeatureCheck: true,
        });
        const { poolInfo, poolKeys } = await raydium.clmm.getPoolInfoFromRpc(poolId);
        const inputMint = (params?.inputMint || poolInfo.mintA.address).trim();
        const tokenOut = poolInfo.mintA.address === inputMint ? poolInfo.mintB : poolInfo.mintA;
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
            amountIn: new BN(amountInRaw),
            tokenOut,
            slippage,
            epochInfo: await connection.getEpochInfo(),
        });
        const swapResult = (await raydium.clmm.swap({
            poolInfo,
            poolKeys,
            inputMint,
            amountIn: new BN(amountInRaw),
            amountOutMin: new BN(quote.minAmountOut.amount.raw.toString()),
            observationId: new PublicKey(poolKeys.observationId),
            ownerInfo: { useSOLBalance: true },
            remainingAccounts: (quote.remainingAccounts ||
                []),
            txVersion: TxVersion.LEGACY,
        }));
        const instructions = [];
        const lookupTableAddresses = [];
        const builder = swapResult?.builder;
        const builderInstructions = builder?.allInstructions ?? [];
        if (Array.isArray(builderInstructions) && builderInstructions.length > 0) {
            for (const ix of builderInstructions) {
                instructions.push({
                    programId: ix.programId.toBase58(),
                    keys: ix.keys.map((k) => ({
                        pubkey: k.pubkey.toBase58(),
                        isSigner: k.isSigner,
                        isWritable: k.isWritable,
                    })),
                    data: Buffer.from(ix.data).toString("base64"),
                });
            }
            const builderLookupTables = builder?.AllTxData?.lookupTableAddress ?? [];
            for (const address of builderLookupTables) {
                lookupTableAddresses.push(address.toString());
            }
        }
        else {
            const innerTransactions = swapResult?.innerTransactions;
            if (!Array.isArray(innerTransactions)) {
                throw new Error("Raydium swap did not return instructions");
            }
            for (const inner of innerTransactions) {
                for (const ix of inner.instructions) {
                    instructions.push({
                        programId: ix.programId.toBase58(),
                        keys: ix.keys.map((k) => ({
                            pubkey: k.pubkey.toBase58(),
                            isSigner: k.isSigner,
                            isWritable: k.isWritable,
                        })),
                        data: Buffer.from(ix.data).toString("base64"),
                    });
                }
                if (inner.lookupTableAddress) {
                    for (const address of inner.lookupTableAddress) {
                        lookupTableAddresses.push(address.toString());
                    }
                }
            }
        }
        return {
            instructions,
            lookupTableAddresses: [...new Set(lookupTableAddresses)],
        };
    }
    async Swap(params) {
        const poolId = (params?.poolId || DEFAULT_POOL_ID).trim();
        const amountInRaw = (params?.amountIn || DEFAULT_AMOUNT_IN).trim();
        const slippage = params?.slippage ?? DEFAULT_SLIPPAGE;
        const wallet = params.wallet?.trim();
        if (!wallet) {
            throw new Error("wallet is required");
        }
        if (!/^\d+$/.test(amountInRaw) || new BN(amountInRaw).lte(new BN(0))) {
            throw new Error("amountIn must be a positive integer string");
        }
        if (!Number.isFinite(slippage) || slippage <= 0 || slippage >= 1) {
            throw new Error("slippage must be a decimal number between 0 and 1");
        }
        const connection = this.raydium.connection;
        // Detect cluster dynamically based on the RPC endpoint
        const cluster = connection.rpcEndpoint.includes("devnet")
            ? "devnet"
            : "mainnet";
        // Load a scoped Raydium instance to set the owner safely without concurrency issues
        const raydium = await Raydium.load({
            connection,
            owner: new PublicKey(wallet),
            cluster,
            disableFeatureCheck: true,
        });
        const { poolInfo, poolKeys } = await raydium.clmm.getPoolInfoFromRpc(poolId);
        const inputMint = (params?.inputMint || poolInfo.mintA.address).trim();
        if (inputMint !== poolInfo.mintA.address &&
            inputMint !== poolInfo.mintB.address) {
            throw new Error("inputMint must match pool mintA or mintB");
        }
        const tokenOut = poolInfo.mintA.address === inputMint ? poolInfo.mintB : poolInfo.mintA;
        const clmmPoolInfo = await PoolUtils.fetchComputeClmmInfo({
            connection: raydium.connection,
            poolInfo,
        });
        const tickCache = await PoolUtils.fetchMultiplePoolTickArrays({
            connection: raydium.connection,
            poolKeys: [clmmPoolInfo],
        });
        const epochInfo = await connection.getEpochInfo();
        const quote = PoolUtils.computeAmountOutFormat({
            poolInfo: clmmPoolInfo,
            tickArrayCache: tickCache[poolId],
            amountIn: new BN(amountInRaw),
            tokenOut,
            slippage,
            epochInfo,
        });
        const amountOutMin = new BN(quote.minAmountOut.amount.raw.toString());
        // ✅ Get remainingAccounts (Tick Arrays) from the computed quote
        const remainingAccounts = quote.remainingAccounts || [];
        // ✅ Fetch blockhash with 'finalized' commitment to ensure it is widely propagated across RPC nodes
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("finalized");
        const { transaction } = await raydium.clmm.swap({
            poolInfo,
            poolKeys,
            inputMint,
            amountIn: new BN(amountInRaw),
            amountOutMin,
            observationId: new PublicKey(poolKeys.observationId),
            ownerInfo: {
                useSOLBalance: true,
            },
            remainingAccounts: remainingAccounts,
            txVersion: TxVersion.V0,
        });
        if (!transaction) {
            throw new Error("Failed to build transaction");
        }
        // ✅ Assign the fresh blockhash to the VersionedTransaction message
        transaction.message.recentBlockhash = blockhash;
        const serialized = transaction.serialize();
        const base64Tx = Buffer.from(serialized).toString("base64");
        // Calculate a unique identifier (hash) short like SHA-256 (32 bytes)
        const txId = crypto.createHash("sha256").update(serialized).digest("hex");
        return {
            txId,
            transaction: base64Tx,
            blockhash,
            lastValidBlockHeight,
        };
    }
}
