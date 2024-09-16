import type { PublicClientObject } from "@3loop/transaction-decoder"
import { PublicClient, UnknownNetwork } from "@3loop/transaction-decoder"
import { Effect, Layer } from "effect"
import { createPublicClient, http } from "viem"

const providerConfigs: Record<number, any> = {
  1: {
    rpcUrl: process.env.ETH_RPC_URL,
    traceAPI: 'parity',
  },
  11155111: { rpcUrl: process.env.SEPOLIA_RPC_URL },
}

const providers: Record<number, PublicClientObject> = {}

export function getProvider(chainID: number): PublicClientObject | null {
  let provider = providers[chainID]

  if (provider != null) {
    return provider
  }

  const url = providerConfigs[chainID].rpcUrl

  if (url != null) {
    provider = {
      client: createPublicClient({
        transport: http(url),
      }),
      config: {
        traceAPI: providerConfigs[chainID]?.traceAPI ?? 'none',
      },
    }

    providers[chainID] = provider
    return provider
  }

  return null
}

export const RPCProviderLive = Layer.succeed(
  PublicClient,
  PublicClient.of({
    _tag: "PublicClient",
    getPublicClient: (chainID: number) => {
      const provider = getProvider(chainID)
      if (provider != null) {
        return Effect.succeed(provider)
      }
      return Effect.fail(new UnknownNetwork(chainID))
    },
  }),
)
