import { HttpClient, HttpClientRequest } from "@effect/platform"
import { Effect } from "effect"
import { Buffer } from "node:buffer"
import sharp from "sharp"

export const resolveImage = (image: string) =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient

    const req = HttpClientRequest.get(image)

    const resp = yield* httpClient.execute(req)

    if (resp.status === 200) {
      return image
    }

    return null
  })

export const resolveTokenIcon = (address: string) =>
  resolveImage(
    `https://tokens-data.1inch.io/images/${address.toLowerCase()}.png`,
  )

export const resolveToJpeg = (image: string) =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient
    const req = HttpClientRequest.get(image)
    const resp = yield* httpClient.execute(req)

    if (resp.status !== 200) {
      return null
    }

    const buffer = yield* resp.arrayBuffer
    const imageBuffer = Buffer.from(buffer)

    // Convert to JPEG using sharp
    const jpegBuffer = yield* Effect.promise(() =>
      sharp(imageBuffer)
        .resize(200, 200, { fit: "cover" })
        .jpeg({ quality: 80, progressive: true })
        .toBuffer(),
    )

    const base64 = jpegBuffer.toString("base64")

    return `data:image/jpeg;base64,${base64}`
  })
