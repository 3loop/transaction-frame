import {
  HttpMiddleware,
  HttpRouter,
  HttpServer,
  HttpServerResponse,
} from "@effect/platform"
import { Effect } from "effect"
import { FrameRouteGet, FrameRoutePost } from "./routes/frame"
import { InterpretRoute } from "./routes/interpret"

const GetRoute = HttpRouter.get(
  "/",
  Effect.gen(function* () {
    return yield* HttpServerResponse.text("ok")
  }),
)
export const HttpLive = HttpRouter.empty.pipe(
  GetRoute,
  InterpretRoute,
  FrameRouteGet,
  FrameRoutePost,
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
