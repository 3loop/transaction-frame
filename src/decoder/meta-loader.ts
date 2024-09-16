import { contractMetaTable } from "@/db/schema"
import type { ContractData } from "@3loop/transaction-decoder"
import {
  ContractMetaStore,
  ERC20RPCStrategyResolver,
  NFTRPCStrategyResolver,
  PublicClient,
} from "@3loop/transaction-decoder"
import { SqlClient } from "@effect/sql"
import * as SqliteDrizzle from "@effect/sql-drizzle/Sqlite"
import { and, eq } from "drizzle-orm"
import { Effect, Layer } from "effect"

export const ContractMetaStoreLive = Layer.effect(
  ContractMetaStore,
  Effect.gen(function* () {
    const db = yield* SqliteDrizzle.SqliteDrizzle
    const sql = yield* SqlClient.SqlClient

    const publicClient = yield* PublicClient
    const erc20Loader = ERC20RPCStrategyResolver(publicClient)
    const nftLoader = NFTRPCStrategyResolver(publicClient)

    return ContractMetaStore.of({
      strategies: { default: [erc20Loader, nftLoader] },
      set: (key, value) =>
        Effect.gen(function* () {
          if (value.status === "success") {
            yield* sql`
              INSERT INTO contractMeta (address, chain, contractName, tokenSymbol, decimals, type, status)
              VALUES (${key.address.toLowerCase()}, ${key.chainID}, ${value.result.contractName}, ${value.result.tokenSymbol}, ${value.result.decimals ?? null}, ${value.result.type}, "success")
            `
          } else {
            yield* sql`
              INSERT INTO contractMeta (address, chain, contractName, tokenSymbol, decimals, type, status)
              VALUES (${key.address.toLowerCase()}, ${key.chainID}, null, null, null, null, "not-found")
            `
          }
        }).pipe(Effect.catchAll(() => Effect.succeed(null))),
      get: ({ address, chainID }) =>
        Effect.gen(function* () {
          const items = yield* db
            .select()
            .from(contractMetaTable)
            .where(
              and(
                eq(contractMetaTable.address, address.toLowerCase()),
                eq(contractMetaTable.chain, chainID),
              ),
            )
            .pipe(Effect.catchAll(() => Effect.succeed([])))

          const item = items[0]

          if (item != null && item.status === "success") {
            return {
              status: "success",
              result: {
                address: address,
                contractAddress: address,
                contractName: item.contractName,
                tokenSymbol: item.tokenSymbol,
                decimals: item.decimals,
                type: item.type,
                chainID: chainID,
              } as ContractData,
            }
          } else if (item != null && item.status === "not-found") {
            return {
              status: "not-found",
              result: null,
            }
          }

          return {
            status: "empty",
            result: null,
          }
        }),
    })
  }),
)
