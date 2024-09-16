import * as SqliteDrizzle from "@effect/sql-drizzle/Sqlite"
import { SqliteClient } from "@effect/sql-sqlite-bun"
import { Config, Layer } from "effect"

const SqlLive = SqliteClient.layer({
  filename: Config.string("DB_PATH"),
})

const DrizzleLive = SqliteDrizzle.layer.pipe(Layer.provide(SqlLive))

export const DatabaseLive = Layer.mergeAll(SqlLive, DrizzleLive)
