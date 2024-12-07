import { providerConfigs } from "@/constants"
import { validateMessage } from "@/utils/airstack"
import {
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "@effect/platform"
import { Effect, Schema } from "effect"
import { Frame, getFrameHtml } from "frames.js"
import { Hex } from "viem"
import { renderFrame } from "@/pages/frame"
import { getFrameImageUrl } from "./interpret"

const FrameActionSchema = Schema.Struct({
  trustedData: Schema.Struct({
    messageBytes: Schema.String,
  }),
  untrustedData: Schema.Struct({
    fid: Schema.Number,
    url: Schema.String,
    messageHash: Schema.String,
    timestamp: Schema.Number,
    network: Schema.Number,
    buttonIndex: Schema.Literal(1, 2, 3, 4),
    castId: Schema.Struct({
      fid: Schema.Number,
      hash: Schema.String,
    }),
    inputText: Schema.optional(Schema.String),
  }),
})

const TransactionFrame = (chainId: number, hash: Hex) =>
  Effect.gen(function* () {
    const url = yield* getFrameImageUrl({
      chain: chainId,
      hash: hash,
    })

    const explorerUrl =
      providerConfigs[chainId as keyof typeof providerConfigs].explorerUrl ||
      providerConfigs[1].explorerUrl // Default to mainnet if not found

    const frameUrl = `${process.env.HOST}/frame/${chainId}/${hash}`
    const queryParams = new URLSearchParams()
    queryParams.append("embeds[]", frameUrl)
    const shareUrl = `https://warpcast.com/~/compose?${queryParams.toString()}`
    return {
      title: "Transaction Frame",
      version: "vNext",
      image: url,
      ogImage: url,
      imageAspectRatio: "1.91:1",
      inputText: "Enter transaction hash",
      buttons: [
        {
          label: "Search",
          action: "post",
          post_url: frameUrl,
        },
        {
          label: "Explorer",
          action: "link",
          target: `${explorerUrl}/${hash}`,
        },
        {
          label: "Share",
          action: "link",
          target: shareUrl,
        },
      ],
    } as Frame
  })

export const FrameRouteGet = HttpRouter.get(
  "/frame/:chain/:hash",
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

    const frame = yield* TransactionFrame(
      Number(params.chain),
      params.hash as Hex,
    )
    const stream = yield* Effect.promise(() => renderFrame(frame))

    return yield* HttpServerResponse.raw(stream).pipe(
      HttpServerResponse.setHeaders({
        "Cache-Control": "public, max-age=31536000",
        "Expires": new Date(Date.now() + 31536000000).toUTCString(),
      }),
    )
  }),
)

export const FrameRoutePost = HttpRouter.post(
  "/frame/:chain/:hash",
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

    const body = yield* HttpServerRequest.schemaBodyJson(FrameActionSchema)

    yield* validateMessage(body)

    const buttonIndex = body.untrustedData.buttonIndex
    const inputText = body.untrustedData.inputText

    const frame = yield* TransactionFrame(
      Number(params.chain),
      params.hash as Hex,
    )

    if (buttonIndex === 1 && inputText) {
      const isValidHash = /^0x[a-fA-F0-9]{64}$/.test(inputText)
      if (!isValidHash) {
        //ignore wrong input for now
        return yield* HttpServerResponse.html(getFrameHtml(frame))
      }
      // If valid, you can proceed with using the inputText as the new hash
      return yield* HttpServerResponse.html(getFrameHtml(frame))
    }

    return yield* HttpServerResponse.html(getFrameHtml(frame))
  }),
)
