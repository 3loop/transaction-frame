import { providerConfigs } from "@/constants"
import { validateMessage } from "@/utils/airstack"
import {
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "@effect/platform"
import { Effect } from "effect"
import { Frame, getFrameHtml } from "frames.js"
import { Hex } from "viem"
import { Schema } from "@effect/schema"
import { renderFrame } from "@/pages/frame"

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

const TransactionFrame = (chainId: number, hash: Hex) => {
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
    image: `${process.env.HOST}/interpret/${chainId}/${hash}`,
    ogImage: `${process.env.HOST}/interpret/${chainId}/${hash}`,
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
}

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

    const stream = yield* Effect.promise(() =>
      renderFrame(
        `/interpret/${Number(params.chain)}/${params.hash}`,
        TransactionFrame(Number(params.chain), params.hash as Hex),
      ),
    )

    return yield* HttpServerResponse.raw(stream)
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

    const isValid = yield* validateMessage(body)
    const buttonIndex = body.untrustedData.buttonIndex
    const inputText = body.untrustedData.inputText

    if (buttonIndex === 1 && inputText) {
      const isValidHash = /^0x[a-fA-F0-9]{64}$/.test(inputText)
      if (!isValidHash) {
        //ignore wrong input for now
        return yield* HttpServerResponse.html(
          getFrameHtml(
            TransactionFrame(Number(params.chain), params.hash as Hex),
          ),
        )
      }
      // If valid, you can proceed with using the inputText as the new hash
      return yield* HttpServerResponse.html(
        getFrameHtml(TransactionFrame(Number(params.chain), inputText as Hex)),
      )
    }

    return yield* HttpServerResponse.html(
      getFrameHtml(TransactionFrame(Number(params.chain), params.hash as Hex)),
    )
  }),
)
