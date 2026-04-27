import { Raydium } from "@raydium-io/raydium-sdk-v2";
import { Connection, Keypair } from "@solana/web3.js";
import { SwapServiceImpl } from "./src/service/swap.service.js";

async function main() {
  const connection = new Connection("https://api.devnet.solana.com");
  const raydium = await Raydium.load({
    connection,
    cluster: "devnet",
    disableFeatureCheck: true,
  });

  const svc = new SwapServiceImpl(raydium);
  
  const wallet = Keypair.generate().publicKey.toBase58();
  
  try {
    const res = await svc.Swap({
      wallet,
      amountIn: "100000",
      slippage: 0.01
    });
    console.log("Success", res);
  } catch (e) {
    console.error("Error:", e.message);
    console.error(e.stack);
  }
}
main().catch(console.error);
