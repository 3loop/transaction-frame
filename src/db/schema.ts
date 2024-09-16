import { sql } from "drizzle-orm"
import * as D from "drizzle-orm/sqlite-core"

export const contractAbiTable = D.sqliteTable("contractAbi", {
  id: D.integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  updatedAt: D.text("timestamp")
    .notNull()
    .default(sql`(current_timestamp)`),
  address: D.text("address"),
  signature: D.text("signature"),
  event: D.text("event"),
  chain: D.integer("chain"),
  abi: D.text("abi"),
  type: D.text("type", { enum: ["func", "event", "address"] }),
  status: D.text("status", { enum: ["success", "not-found"] }),
})

export const contractMetaTable = D.sqliteTable(
  "contractMeta",
  {
    address: D.text("address"),
    chain: D.integer("chain"),
    contractName: D.text("contractName"),
    tokenSymbol: D.text("tokenSymbol"),
    decimals: D.integer("decimals"),
    type: D.text("type"),
    status: D.text("status", { enum: ["success", "not-found"] }),
  },
  (table) => {
    return {
      pk: D.primaryKey({ columns: [table.address, table.chain] }),
    }
  },
)
