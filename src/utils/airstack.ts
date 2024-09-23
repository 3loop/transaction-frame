import { Effect } from "effect"
import { FrameActionPayload, hexStringToUint8Array } from "frames.js"

const airstackEndpoint = "https://api.airstack.xyz/graphql"

const getFarcasterUserInfoQuery = `
query GetFarcasterUserInfoByAddress($address: Address!) {
  Socials(
    input: {filter: {userAssociatedAddresses: {_eq: $address}, dappName: {_eq: farcaster}}, blockchain: ethereum}
  ) {
    Social {
      profileName
      userId
      profileImage
      profileHandle
    }
  }
}
`

interface FarcasterUserInfo {
  profileName: string
  userId: string
  profileImage: string
  profileHandle: string
}

interface AirstackResponse {
  data: {
    Socials: {
      Social: FarcasterUserInfo[]
    }
  }
}

export const getFarcasterUserInfoByAddress = (
  address: string,
): Effect.Effect<FarcasterUserInfo | null, Error> =>
  Effect.tryPromise({
    try: async () => {
      if (address == null) {
        return null
      }

      const response = await fetch(airstackEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: process.env.AIRSTACK_API_KEY || "",
        },
        body: JSON.stringify({
          query: getFarcasterUserInfoQuery,
          variables: { address: address.toLowerCase() },
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = (await response.json()) as AirstackResponse
      const userInfo = data.data.Socials.Social

      if (!userInfo) {
        return null
      }

      return (
        userInfo.filter(
          (u) => u.profileName !== null && u.profileName !== "",
        )[0] || null
      )
    },
    catch: (error) => {
      console.error("Error fetching Farcaster user info:", error)
      throw error
    },
  })

export const validateMessage = (data: FrameActionPayload) =>
  Effect.tryPromise(async () => {
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

    return response.ok
  }).pipe(Effect.orElseSucceed(() => false))
