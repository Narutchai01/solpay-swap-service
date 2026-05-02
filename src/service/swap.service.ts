import { Raydium, PoolUtils, TxVersion } from "@raydium-io/raydium-sdk-v2";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import crypto from "crypto";

const DEFAULT_POOL_ID = "FXAXqgjNK6JVzVV2frumKTEuxC8hTEUhVTJTRhMMwLmM";
const DEFAULT_AMOUNT_IN = "1000000";
const DEFAULT_SLIPPAGE = 0.01;

export interface GetSwapInfoParams {
  poolId?: string;
  inputMint?: string;
  amountIn?: string;
  slippage?: number;
}

export interface SwapParams extends GetSwapInfoParams {
  wallet: string;
}

export interface SwapResult {
  txId: string;
  transaction: string;
  blockhash: string;
  lastValidBlockHeight: number;
}

export interface SwapQuoteAmount {
  rawAmount: string;
  decimalAmount: string;
  feeRawAmount?: string;
  feeDecimalAmount?: string;
  expirationTime?: number;
}

export interface SwapQuoteResult {
  poolId: string;
  inputMint: string;
  outputMint: string;
  slippage: number;
  amountInRequested: string;
  currentPrice: string;
  executionPrice: string;
  priceImpact: string;
  executionPriceX64: string;
  remainingAccounts: string[];
  realAmountIn: SwapQuoteAmount;
  amountOut: SwapQuoteAmount;
  minAmountOut: SwapQuoteAmount;
  fee: {
    rawAmount: string;
    decimalAmount: string;
  };
}

interface SwapService {
  GetQuote(params?: GetSwapInfoParams): Promise<SwapQuoteResult>;
  GetInfo(params?: GetSwapInfoParams): Promise<SwapQuoteResult>;
  Swap(params: SwapParams): Promise<SwapResult>;
}

export class SwapServiceImpl implements SwapService {
  constructor(private raydium: Raydium) {}

  async GetInfo(params?: GetSwapInfoParams): Promise<SwapQuoteResult> {
    return this.GetQuote(params);
  }

  async GetQuote(params?: GetSwapInfoParams): Promise<SwapQuoteResult> {
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
    if (
      inputMint !== poolInfo.mintA.address &&
      inputMint !== poolInfo.mintB.address
    ) {
      throw new Error("inputMint must match pool mintA or mintB");
    }

    const tokenOut =
      poolInfo.mintA.address === inputMint ? poolInfo.mintB : poolInfo.mintA;
    const connection = (this.raydium as any).connection;

    const clmmPoolInfo = await PoolUtils.fetchComputeClmmInfo({
      connection,
      poolInfo,
    });

    const tickCache = await PoolUtils.fetchMultiplePoolTickArrays({
      connection,
      poolKeys: [clmmPoolInfo],
    });

    const quote = PoolUtils.computeAmountOutFormat({
      poolInfo: clmmPoolInfo as any,
      tickArrayCache: tickCache[poolId] as any,
      amountIn: new BN(amountInRaw),
      tokenOut,
      slippage,
      epochInfo: await connection.getEpochInfo(),
    });

    const toAmountView = (value: any): SwapQuoteAmount => ({
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
      remainingAccounts: quote.remainingAccounts.map((account: any) =>
        account.toBase58(),
      ),
      realAmountIn: toAmountView(quote.realAmountIn),
      amountOut: toAmountView(quote.amountOut),
      minAmountOut: toAmountView(quote.minAmountOut),
      fee: {
        rawAmount: quote.fee.raw.toString(),
        decimalAmount: quote.fee.toFixed(),
      },
    };
  }

  async Swap(params: SwapParams): Promise<SwapResult> {
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

    const connection = (this.raydium as any).connection;

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

    const { poolInfo, poolKeys } =
      await raydium.clmm.getPoolInfoFromRpc(poolId);

    const inputMint = (params?.inputMint || poolInfo.mintA.address).trim();
    if (
      inputMint !== poolInfo.mintA.address &&
      inputMint !== poolInfo.mintB.address
    ) {
      throw new Error("inputMint must match pool mintA or mintB");
    }

    const tokenOut =
      poolInfo.mintA.address === inputMint ? poolInfo.mintB : poolInfo.mintA;

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
      poolInfo: clmmPoolInfo as any,
      tickArrayCache: tickCache[poolId] as any,
      amountIn: new BN(amountInRaw),
      tokenOut,
      slippage,
      epochInfo,
    });

    const amountOutMin = new BN(quote.minAmountOut.amount.raw.toString());

    // ✅ Get remainingAccounts (Tick Arrays) from the computed quote
    const remainingAccounts = quote.remainingAccounts || [];

    // ✅ Fetch blockhash with 'finalized' commitment to ensure it is widely propagated across RPC nodes
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("finalized");

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
      remainingAccounts: remainingAccounts as unknown as PublicKey[],
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
