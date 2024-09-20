export const providerConfigs: Record<number, any> = {
  1: {
    rpcUrl: process.env.ETH_RPC_URL,
    traceAPI: "parity",
    explorerUrl: "https://etherscan.io/tx",
    name: "Ethereum",
  },
  8453: {
    rpcUrl: process.env.BASE_RPC_URL,
    traceAPI: "parity",
    explorerUrl: "https://basescan.org/tx",
    name: "Base",
  },
}

export const IMG_WIDTH = 1200
export const IMG_HEIGHT = 628
