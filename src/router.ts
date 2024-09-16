import { decodeTransactionByHash } from "@3loop/transaction-decoder"
import {
  HttpMiddleware,
  HttpRouter,
  HttpServer,
  HttpServerResponse,
} from "@effect/platform"
import { Effect, Either } from "effect"
import { Hex } from "viem"
import { interpretTransaction } from "./interpreter"
import { drawFrame } from "./frame"

const GetRoute = HttpRouter.get(
  "/",
  Effect.gen(function* () {
    return yield* HttpServerResponse.text("ok")
  }),
)

const InterpretRoute = HttpRouter.get(
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

    const image = yield* drawFrame(result.right)

    return yield* HttpServerResponse.raw(image).pipe(
      HttpServerResponse.setHeader("Content-Type", "image/png"),
      HttpServerResponse.setHeader("Content-Disposition", "inline;"),
    )
  }),
)

export const HttpLive = HttpRouter.empty.pipe(
  GetRoute,
  InterpretRoute,
  Effect.timeoutFail({
    duration: "10 seconds",
    onTimeout: () =>
      HttpServerResponse.text("timeout", {
        status: 408,
      }),
  }),
  Effect.catchTag("RouteNotFound", () =>
    Effect.gen(function* () {
      return HttpServerResponse.text("Not Found", {
        status: 404,
      })
    }),
  ),
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      yield* Effect.logError("Error", error)
      return HttpServerResponse.text("Error", {
        status: 500,
      })
    }),
  ),
  Effect.catchAllDefect((defect) =>
    Effect.gen(function* () {
      yield* Effect.logError("Defect", defect)
      return HttpServerResponse.text("Defect", {
        status: 500,
      })
    }),
  ),
  HttpServer.serve(HttpMiddleware.logger),
  HttpServer.withLogAddress,
)
