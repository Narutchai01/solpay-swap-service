export const config = {
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
    rpcUrl: process.env.RPC_URL || "https://api.devnet.solana.com",
};
