import { DecodedTransaction } from "@3loop/transaction-decoder"
import {
  EvalInterpreterLive,
  TransactionInterpreter,
  fallbackInterpreter,
} from "@3loop/transaction-interpreter"
import { Effect } from "effect"

export const InterpreterLive = EvalInterpreterLive

export const interpretTransaction = (decodedTx: DecodedTransaction) =>
  Effect.gen(function* () {
    const interpreterService = yield* TransactionInterpreter

    let interpreter = interpreterService.findInterpreter(decodedTx)

    if (interpreter == null) {
      interpreter = { id: "fallback", schema: fallbackInterpreter }
    }

    const result = yield* interpreterService.interpretTx(decodedTx, interpreter)

    return result
  })
