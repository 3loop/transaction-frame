import { EXPLORER_URLS } from "@/constants"
import { validateMessage } from "@/utils"
import {
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "@effect/platform"
import { Effect } from "effect"
import { getFrameHtml, FrameActionPayload } from "frames.js"
import { Hex } from "viem"

const FrameHtml = (chainId: number, hash: Hex) => {
  const explorerUrl =
    EXPLORER_URLS[chainId as keyof typeof EXPLORER_URLS] || EXPLORER_URLS[1] // Default to mainnet if not found
  return getFrameHtml({
    version: "vNext",
    image: `${process.env.HOST}/interpret/${chainId}/${hash}`,
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
  })
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

    return yield* HttpServerResponse.html(
      FrameHtml(Number(params.chain), params.hash as Hex),
    )
  }),
)

export const FrameRoutePost = HttpRouter.post(
  "/frame/:chain/:hash",
  Effect.gen(function* () {
    const params = yield* HttpRouter.params
    const req = yield* HttpServerRequest.HttpServerRequest
    const body = (yield* req.json) as FrameActionPayload

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

    // TODO: validate message
    yield* validateMessage(body)

    return yield* HttpServerResponse.html(
      FrameHtml(Number(params.chain), params.hash as Hex),
    )
  }),
)
