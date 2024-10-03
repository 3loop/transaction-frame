import { BunFileSystem, BunHttpServer, BunPath, BunRuntime } from "@effect/platform-bun"

import * as Dotenv from "dotenv"
import { Config, Effect, Layer, LogLevel, Logger, Request } from "effect"
import { DatabaseLive } from "./db"
import { AbiStoreLive } from "./decoder/abi-loader"
import { ContractMetaStoreLive } from "./decoder/meta-loader"
import { RPCProviderLive } from "./decoder/provider"
import { HttpLive } from "./router"
import { TracingLive } from "./tracing"
import { FetchHttpClient } from '@effect/platform'
import { InterpreterLive } from "./interpreter"

Dotenv.config()

const LogLevelLive = Layer.unwrapEffect(
  Effect.gen(function* () {
    const debug = yield* Config.withDefault(Config.boolean("DEBUG"), false)
    const level = debug ? LogLevel.All : LogLevel.Info
    return Logger.minimumLogLevel(level)
  }),
)

const DataLayer = Layer.mergeAll(RPCProviderLive, DatabaseLive)
const LoadersLayer = Layer.mergeAll(ContractMetaStoreLive, AbiStoreLive)
const DecoderLayer = Layer.provideMerge(LoadersLayer, DataLayer)

const MainLive = Layer.provide(
  HttpLive,
  BunHttpServer.layer({ port: process.env.PORT }),
).pipe(
  Layer.provide(LogLevelLive),
  Layer.provide(Logger.logFmt),
  Layer.provide(DecoderLayer),
  Layer.provide(TracingLive),
  Layer.provide(FetchHttpClient.layer),
  Layer.provide(InterpreterLive),
  Layer.provide(BunFileSystem.layer),
  Layer.provide(BunPath.layer),
)

const cache = Effect.provide(
  Layer.setRequestCache(
    Request.makeCache({ capacity: 64, timeToLive: "60 minutes" }),
  ),
)

BunRuntime.runMain(Layer.launch(MainLive).pipe(cache))
