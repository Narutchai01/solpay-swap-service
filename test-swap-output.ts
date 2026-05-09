import { Raydium, TxVersion } from "@raydium-io/raydium-sdk-v2";
import { Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";

async function main() {
  const connection = new Connection("https://api.mainnet-beta.solana.com");
  const raydium = await Raydium.load({
    connection,
    cluster: "mainnet",
    disableFeatureCheck: true,
  });

  const poolId = "FXAXqgjNK6JVzVV2frumKTEuxC8hTEUhVTJTRhMMwLmM";
  const { poolInfo, poolKeys } = await raydium.clmm.getPoolInfoFromRpc(poolId);

  const res = await raydium.clmm.swap({
    poolInfo,
    poolKeys,
    inputMint: poolInfo.mintA.address,
    amountIn: new BN(1000),
    amountOutMin: new BN(0),
    observationId: new PublicKey(poolKeys.observationId),
    ownerInfo: { useSOLBalance: true },
    remainingAccounts: [],
    txVersion: TxVersion.LEGACY,
  });

  console.log("Keys in response:", Object.keys(res));
  if ((res as any).innerTransactions) {
    console.log(
      "innerTransactions is array:",
      Array.isArray((res as any).innerTransactions),
    );
  }
}

main().catch(console.error);
