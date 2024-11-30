import { sql, SQL } from "drizzle-orm"
import * as D from "drizzle-orm/sqlite-core"

export function lower(email: D.AnySQLiteColumn): SQL {
  return sql`lower(${email})`
}
