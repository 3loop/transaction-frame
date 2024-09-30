import { decodeTransactionByHash } from "@3loop/transaction-decoder"
import { HttpRouter, HttpServerResponse } from "@effect/platform"
import { Effect, Either } from "effect"
import { Hex } from "viem"
import { interpretTransaction } from "../interpreter"
import { drawFrame } from "../image-frame"
import { getFarcasterUserInfoByAddress } from "@/utils/airstack"
import { InterpretedTransaction } from "@3loop/transaction-interpreter"
import { TxContext } from "@/types"
import { generateHeapSnapshot } from "bun";

async function getMemorySnapshot() {
  const mem = process.memoryUsage()

  // If memory usage is more than 90% of the heap limit, take a snapshot
  if (mem.heapUsed / mem.heapTotal > 0.8) {
    const snapshot = generateHeapSnapshot();
    await Bun.write("./heap.json", JSON.stringify(snapshot, null, 2));
  }
}

function getTxContext(
  tx: InterpretedTransaction,
): Effect.Effect<TxContext, Error> {
  return Effect.gen(function* () {
    const fromAddress: string | null = tx.user.address.toLowerCase()
    const toAddress: string | null =
      tx.type === "swap"
        ? tx.assetsReceived?.[0]?.to?.address?.toLowerCase()
        : tx.type === "transfer-token"
          ? tx.assetsSent?.[0]?.to?.address?.toLowerCase()
          : null

    if (fromAddress == null && toAddress == null) {
      return {
        from: null,
        to: null,
      }
    }

    if (fromAddress === toAddress || toAddress == null) {
      //get the user info for the address
      const userInfo = yield* getFarcasterUserInfoByAddress(fromAddress)
      return {
        from: userInfo,
        to: null,
      }
    }

    const [fromInfo, toInfo] = yield* Effect.all(
      [
        getFarcasterUserInfoByAddress(fromAddress),
        getFarcasterUserInfoByAddress(toAddress),
      ],
      {
        concurrency: "unbounded",
      },
    )

    return {
      from: fromInfo,
      to: toInfo,
    }
  })
}

export const InterpretRoute = HttpRouter.get(
  "/interpret/:chain/:hash",
  Effect.gen(function* () {
    const params = yield* HttpRouter.params

    if (isNaN(Number(params.chain)) || params.hash == null) {
      return yield* HttpServerResponse.json(
        {
          error: "Missing required parameters",
        },
        {
          status: 400,
        },
      )
    }

    const decoded = yield* Effect.either(
      decodeTransactionByHash(params.hash as Hex, Number(params.chain)),
    )

    if (Either.isLeft(decoded)) {
      yield* Effect.logError("Decode failed", decoded.left)
      return yield* HttpServerResponse.json(
        {
          error: "Failed to decode transaction",
        },
        {
          status: 400,
        },
      )
    }

    const result = yield* Effect.either(interpretTransaction(decoded.right))

    if (Either.isLeft(result)) {
      yield* Effect.logError("Interpret failed", result.left)
      return yield* HttpServerResponse.json(
        {
          error: "Failed to interpret transaction",
        },
        {
          status: 400,
        },
      )
    }

    const context = yield* getTxContext(result.right)

    const image = yield* drawFrame(result.right, context)

    yield* Effect.try(getMemorySnapshot);

    return yield* HttpServerResponse.raw(image).pipe(
      HttpServerResponse.setHeader("Content-Type", "image/png"),
      HttpServerResponse.setHeader("Content-Disposition", "inline;"),
    )
  }),
)
