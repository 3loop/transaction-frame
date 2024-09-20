import { Effect } from "effect"
import { FrameActionPayload, hexStringToUint8Array } from "frames.js"

export const validateMessage = (
  data: FrameActionPayload,
): Effect.Effect<boolean, boolean> =>
  Effect.tryPromise({
    try: async () => {
      const airstackApiKey = process.env.AIRSTACK_API_KEY

      if (!airstackApiKey) return false

      const response = await fetch(
        "https://hubs.airstack.xyz/v1/validateMessage",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "x-airstack-hubs": airstackApiKey,
          },
          body: hexStringToUint8Array(data.trustedData.messageBytes),
        },
      )

      if (!response.ok) {
        console.log("Failed", await response.text())
      }

      return response.ok
    },
    catch: (error) => {
      console.error(error)
      return false
    },
  })
