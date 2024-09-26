import React from "react"
import { renderToReadableStream } from "react-dom/server"
import {
  escapeHtmlAttributeValue,
  Frame,
  FrameFlattened,
  getFrameFlattened,
} from "frames.js"
import { GITHUB_URL } from "../constants"

export function getFrameHead(frame: Partial<Frame>): React.ReactNode[] {
  const flattened = getFrameFlattened(frame)

  const tags = Object.entries(flattened)
    .map(([key, value]) => {
      return value ? (
        <meta key={key} name={key} content={escapeHtmlAttributeValue(value)} />
      ) : null
    })
    .filter(Boolean)

  if (frame.title) {
    tags.push(
      <title key="title">{escapeHtmlAttributeValue(frame.title)}</title>,
    )
  }

  return tags
}

export function FrameComponent(props: { imageUrl: string; frame: Frame }) {
  return (
    <html>
      <head>
        {...getFrameHead(props.frame)}
        <style>{`
          body {
            display: flex;
            flex-direction: column;
            align-items: center;
            font-family: Arial, sans-serif;
            gap: 24px;
          }
          img {
            max-width: 80%;
            height: auto;
            border-bottom: 1px solid #e0e0e0;
          }
          .button {
            margin-top: 20px;
            padding: 15px 30px;
            background-color: #0077cc;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            font-size: 18px;
            text-align: center;
            min-width: 200px;
          }
        `}</style>
      </head>
      <body>
        <img src={props.imageUrl} alt="Frame Image" />
        <a
          href={GITHUB_URL}
          className="button"
          target="_blank"
          rel="noopener noreferrer"
        >
          Make your own Frame
        </a>
      </body>
    </html>
  )
}

// Update the renderFrame function to include the learnMoreUrl
export async function renderFrame(imageUrl: string, frame: Frame) {
  const stream = await renderToReadableStream(
    <FrameComponent imageUrl={imageUrl} frame={frame} />,
  )
  return stream
}
