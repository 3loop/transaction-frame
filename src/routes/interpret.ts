import { decodeTransactionByHash } from "@3loop/transaction-decoder"
import {
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "@effect/platform"
import { Effect, Either } from "effect"
import { Hex } from "viem"
import { interpretTransaction } from "../interpreter"
import { drawFrame } from "../image-frame"
import { getFarcasterUserInfoByAddress } from "@/utils/airstack"
import { InterpretedTransaction } from "@3loop/transaction-interpreter"
import { TxContext } from "@/types"
import { generateHeapSnapshot } from "bun"
import { FileSystem, Path } from "@effect/platform"
import { Schema } from "@effect/schema"

async function getMemorySnapshot() {
  const mem = process.memoryUsage()

  // If memory usage is more than 90% of the heap limit, take a snapshot
  if (mem.heapUsed / mem.heapTotal > 0.8) {
    const snapshot = generateHeapSnapshot()
    await Bun.write("./heap.json", JSON.stringify(snapshot, null, 2))
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

const interpretAndGenerateImage = ({
  chain,
  hash,
  cacheBoost,
}: {
  chain: string
  hash: string
  cacheBoost?: string
}) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const cacheKey = `${chain}-${hash}`

    const cachePath = path.join("/tmp", cacheKey)

    const exists = yield* fs.exists(cachePath)

    if (exists) {
      if (cacheBoost != null) {
        yield* fs.remove(cachePath)
      } else {
        const content = yield* fs.readFile(cachePath)
        return content
      }
    }

    const decoded = yield* Effect.either(
      decodeTransactionByHash(hash as Hex, Number(chain)),
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

    yield* fs.writeFile(cachePath, new Uint8Array(image))

    return image
  })

export const InterpretRoute = HttpRouter.get(
  "/interpret/:chain/:hash",
  Effect.gen(function* () {
    const { chain, hash } = yield* HttpRouter.params

    const { cacheBoost } = yield* HttpServerRequest.schemaSearchParams(
      Schema.Struct({
        cacheBoost: Schema.optional(Schema.String),
      }),
    )

    if (chain == null || isNaN(Number(chain)) || hash == null) {
      return yield* HttpServerResponse.json(
        {
          error: "Missing required parameters",
        },
        {
          status: 400,
        },
      )
    }

    const image = yield* interpretAndGenerateImage({
      chain: chain,
      hash: hash,
      cacheBoost,
    })

    yield* Effect.try(getMemorySnapshot)

    return yield* HttpServerResponse.raw(image).pipe(
      HttpServerResponse.setHeader("Content-Type", "image/png"),
      HttpServerResponse.setHeader("Content-Disposition", "inline;"),
    )
  }),
)
