import { decodeTransactionByHash } from "@3loop/transaction-decoder"
import {
  HttpRouter,
  HttpServerResponse,
} from "@effect/platform"
import { Effect, Either } from "effect"
import { Hex } from "viem"
import { interpretTransaction } from "../interpreter"
import { drawErrorFrame, drawFrame } from "../image-frame"
import { getFarcasterUserInfoByAddress } from "@/utils/airstack"
import { InterpretedTransaction } from "@3loop/transaction-interpreter"
import { TxContext } from "@/types"
import { generateHeapSnapshot } from "bun"
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3"

async function getMemorySnapshot() {
  const mem = process.memoryUsage()

  // If memory usage is more than 90% of the heap limit, take a snapshot
  if (mem.heapUsed / mem.heapTotal > 0.8) {
    const snapshot = generateHeapSnapshot()
    await Bun.write("./heap.json", JSON.stringify(snapshot, null, 2))
  }
}

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  endpoint: process.env.AWS_ENDPOINT_URL_S3!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

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

function makeCacheKey(chain: number, hash: string) {
  return `${chain}-${hash}`
}

/**
 * If the image was previously cached in s3, return the public url otherwise generate the image and cache it
 */
export const getFrameImageUrl = ({
  chain,
  hash,
}: {
  chain: number
  hash: string
}) =>
  Effect.gen(function* () {
    const cacheKey = makeCacheKey(chain, hash)

    const command = new HeadObjectCommand({
      Bucket: process.env.BUCKET_NAME!,
      Key: cacheKey,
    })

    const exists = yield* Effect.either(
      Effect.tryPromise(() => s3Client.send(command)),
    )

    if (Either.isLeft(exists)) {
      yield* interpretAndGenerateImage({
        chain: chain,
        hash: hash,
      })
    }

    return `https://fly.storage.tigris.dev/${process.env.BUCKET_NAME!}/${cacheKey}`
  })

const interpretAndGenerateImage = ({
  chain,
  hash,
}: {
  chain: number
  hash: string
}) =>
  Effect.gen(function* () {
    const cacheKey = makeCacheKey(Number(chain), hash)

    const decoded = yield* Effect.either(
      decodeTransactionByHash(hash as Hex, Number(chain)),
    )

    if (Either.isLeft(decoded)) {
      yield* Effect.logError("Decode failed", decoded.left)
      return yield* drawErrorFrame("Couldn't decode this transaction")
    }

    const result = yield* Effect.either(interpretTransaction(decoded.right))

    if (Either.isLeft(result)) {
      yield* Effect.logError("Interpret failed", result.left)
      return yield* drawErrorFrame("Couldn't interpret this transaction")
    }

    const context = yield* getTxContext(result.right)

    const image = yield* drawFrame(result.right, context)

    yield* Effect.tryPromise(() =>
      s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.BUCKET_NAME!,
          Key: cacheKey,
          Body: new Uint8Array(image),
          ContentType: "image/png",
        }),
      ),
    )

    return image
  })

export const InterpretRoute = HttpRouter.get(
  "/interpret/:chain/:hash",
  Effect.gen(function* () {
    const { chain, hash } = yield* HttpRouter.params

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
      chain: Number(chain),
      hash: hash,
    })

    yield* Effect.try(getMemorySnapshot)

    return yield* HttpServerResponse.raw(image).pipe(
      HttpServerResponse.setHeader("Content-Type", "image/png"),
      HttpServerResponse.setHeader("Content-Disposition", "inline;"),
    )
  }),
)
