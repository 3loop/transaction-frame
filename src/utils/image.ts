import { HttpClient, HttpClientRequest } from "@effect/platform"
import { Effect } from "effect"
import { Buffer } from "node:buffer"
import sharp from "sharp"

const downloadAndConvertToJpeg = async (pfpUrl: string): Promise<Buffer> => {
  try {
    // Download the image using native fetch
    const response = await fetch(pfpUrl)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const arrayBuffer = await response.arrayBuffer()
    const imageBuffer = Buffer.from(arrayBuffer)

    // Convert to JPEG using sharp
    const jpegBuffer = await sharp(imageBuffer)
      .resize(200, 200, { fit: "cover" }) // Resize to 200x200 pixels
      .jpeg({ quality: 80, progressive: true }) // Adjust JPEG quality (0-100)
      .toBuffer()

    return jpegBuffer
  } catch (error) {
    console.error("Error downloading or converting image:", error)
    throw error
  }
}

export const resolveToJpeg = (image: string) =>
  Effect.tryPromise({
    try: async () => {
      const buffer = await downloadAndConvertToJpeg(image)
      const b64 = Buffer.from(buffer).toString("base64")
      return `data:image/jpeg;base64,${b64}`
    },
    catch: (error) => {
      console.error("Error downloading or converting image:", error)
      return null
    },
  })

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
