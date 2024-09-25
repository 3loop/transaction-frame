import { providerConfigs } from "@/constants"
import { validateMessage } from "@/utils/airstack"
import {
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "@effect/platform"
import { Effect, pipe } from "effect"
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

const InitialFrame = (chainId: number, hash: Hex) => {
  const explorerUrl =
    providerConfigs[chainId as keyof typeof providerConfigs].explorerUrl ||
    providerConfigs[1].explorerUrl // Default to mainnet if not found
  return {
    title: "Transaction Frame",
    version: "vNext",
    image: `${process.env.HOST}/interpret/${chainId}/${hash}`,
    imageAspectRatio: "1.91:1",
    buttons: [
      {
        label: "Refresh",
        action: "post",
        post_url: `${process.env.HOST}/frame/${chainId}/${hash}`,
      },
      {
        label: "Explorer",
        action: "link",
        target: `${explorerUrl}/${hash}`,
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
        `${process.env.HOST}/interpret/${Number(params.chain)}/${params.hash}`,
        InitialFrame(Number(params.chain), params.hash as Hex),
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
    console.log("is valid", isValid)

    return yield* HttpServerResponse.html(
      getFrameHtml(InitialFrame(Number(params.chain), params.hash as Hex)),
    )
  }),
)
