import { HttpClient, HttpClientRequest } from "@effect/platform";
import { Effect } from "effect";

export const resolveImage = (image: string) => Effect.gen(function* () {
  const httpClient = yield* HttpClient.HttpClient

  const req = HttpClientRequest.get(image)

  const resp = yield* httpClient.execute(req)

  if (resp.status === 200) {
    return image
  }

  return null
});

export const resolveTokenIcon = (address: string) =>
  resolveImage(`https://tokens-data.1inch.io/images/${address.toLowerCase()}.png`)