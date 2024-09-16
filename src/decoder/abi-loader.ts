import { contractAbiTable } from "@/db/schema"
import {
  AbiStore,
  ContractAbiResult,
  EtherscanStrategyResolver,
  FourByteStrategyResolver,
  OpenchainStrategyResolver,
  SourcifyStrategyResolver,
} from "@3loop/transaction-decoder"
import * as SqliteDrizzle from "@effect/sql-drizzle/Sqlite"
import { eq, and, or } from "drizzle-orm"
import { Config, Effect, Layer } from "effect"
import { LOCAL_FRAGMENTS } from "./abis"
import { SqlClient } from "@effect/sql"

export const AbiStoreLive = Layer.effect(
  AbiStore,
  Effect.gen(function* () {
    const db = yield* SqliteDrizzle.SqliteDrizzle
    const etherscanApiKey = yield* Config.withDefault(
      Config.string("ETHERSCAN_API_KEY"),
      undefined,
    )
    const sql = yield* SqlClient.SqlClient

    return AbiStore.of({
      strategies: {
        default: [
          EtherscanStrategyResolver({
            apikey: etherscanApiKey,
          }),
          SourcifyStrategyResolver(),
          OpenchainStrategyResolver(),
          FourByteStrategyResolver(),
        ],
      },
      set: (key, value) =>
        Effect.gen(function* (_) {
          const normalizedAddress = key.address.toLowerCase()
          if (value.status === "success" && value.result.type === "address") {
            const result = value.result
            yield* sql`
              INSERT INTO contractAbi (type, address, chain, abi, status)
              VALUES (${result.type}, ${normalizedAddress}, ${result.chainID}, ${result.abi}, "success")
            `
          } else if (value.status === "success") {
            const result = value.result
            yield* sql`
              INSERT INTO contractAbi (type, event, signature, abi, status)
              VALUES (${result.type}, ${"event" in result ? result.event : null}, ${"signature" in result ? result.signature : null}, ${result.abi}, "success")
            `
          } else {
            yield* sql`
              INSERT INTO contractAbi (type, address, chain, status)
              VALUES ("address", ${normalizedAddress}, ${key.chainID}, "not-found")
            `
          }
        }).pipe(Effect.catchAll(() => Effect.succeed(null))),

      get: ({ address, signature, event, chainID }) =>
        Effect.gen(function* (_) {
          // NOTE: For common contracts such as ERC20 we store the fragment locally for fast access
          const match = signature ? LOCAL_FRAGMENTS[signature] : null
          if (signature != null && match != null) {
            return {
              status: "success",
              result: {
                type: "func",
                address,
                signature: signature,
                chainID: chainID,
                abi: match.fragment,
              },
            }
          }
          const eventMatch = event ? LOCAL_FRAGMENTS[event] : null
          if (event != null && eventMatch != null) {
            return {
              status: "success",
              result: {
                type: "event",
                address: address,
                event: event,
                chainID: chainID,
                abi: eventMatch.fragment,
              },
            }
          }

          // For non local abis we need to fetch from database
          const items = yield* db
            .select()
            .from(contractAbiTable)
            .where(
              or(
                and(
                  eq(contractAbiTable.address, address.toLowerCase()),
                  eq(contractAbiTable.chain, chainID),
                  eq(contractAbiTable.type, "address"),
                ),
                ...[
                  signature != null &&
                  and(
                    eq(contractAbiTable.signature, signature),
                    eq(contractAbiTable.type, "func"),
                  ),
                  event != null &&
                  and(
                    eq(contractAbiTable.event, event),
                    eq(contractAbiTable.type, "event"),
                  ),
                ].filter(Boolean),
              ),
            )
            .pipe(Effect.catchAll(() => Effect.succeed([])))

          const item =
            items.find((item) => {
              // Prioritize address over fragments
              return item.type === "address"
            }) ?? items[0]

          if (item != null && item.status === "success") {
            return {
              status: "success",
              result: {
                type: item.type,
                event: item.event,
                signature: item.signature,
                address,
                chainID,
                abi: item.abi,
              },
            } as ContractAbiResult
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
