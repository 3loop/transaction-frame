import { Effect } from "effect"
import satori from "satori"
import { Resvg } from "@resvg/resvg-js"
import { fonts } from "./fonts"
import {
  AssetTransfer,
  InterpretedTransaction,
} from "@3loop/transaction-interpreter"
import { match } from "ts-pattern"

function shortenHash(hash: string) {
  return hash.slice(0, 10) + "..." + hash.slice(-10)
}

const chainIdToName: Record<number, string> = {
  1: "Ethereum",
} as const

let NumberFormatter = new Intl.NumberFormat("en-US", {})

const FooterColumn: React.FC<{ title: string; description: string }> = ({
  title,
  description,
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
      }}
    >
      <span
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: "rgb(134, 143, 151)",
        }}
      >
        {title}
      </span>
      <span>{description}</span>
    </div>
  )
}

const Asset: React.FC<{ transfer: AssetTransfer; label: string }> = ({
  transfer,
  label,
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "16px",
      }}
    >
      <img
        src={`https://tokens-data.1inch.io/images/${transfer.asset.address.toLowerCase()}.png`}
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          border: "0.5px solid rgba(255, 255, 255, 0.08)",
        }}
      />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span
            style={{
              fontSize: "18px",
              lineHeight: "20px",
              color: "rgb(134, 143, 151)",
            }}
          >
            {label}
          </span>
          <span
            style={{ fontWeight: "600", fontSize: "36px", lineHeight: "40px" }}
          >
            {transfer.asset.symbol}
          </span>
        </div>
      </div>
      <strong>{NumberFormatter.format(Number(transfer.amount))}</strong>
    </div>
  )
}

const TX_TYPE_TO_ICON: Record<string, JSX.Element> = {
  'swap': (<svg
    width="200"
    height="200"
    viewBox="0 0 277 277"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M164.469 25.9688L225.063 86.5625L164.469 147.156M215.795 86.5625H51.9375M112.531 251.031L51.9375 190.438L112.531 129.844M61.6758 190.438H225.063"
      stroke="rgb(134, 143, 151)"
      stroke-width="35"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>),
  'other': (<svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M143.75 162.445V28.125C143.743 25.6408 142.753 23.2604 140.996 21.5038C139.24 19.7473 136.859 18.7572 134.375 18.75H28.125C25.6408 18.7572 23.2604 19.7473 21.5038 21.5038C19.7473 23.2604 18.7572 25.6408 18.75 28.125V165.625C18.7624 169.765 20.4125 173.732 23.3401 176.66C26.2677 179.587 30.2348 181.238 34.375 181.25H162.5" stroke="rgb(134, 143, 151)" stroke-width="12" stroke-linejoin="round" />
    <path d="M162.5 181.25C157.527 181.25 152.758 179.275 149.242 175.758C145.725 172.242 143.75 167.473 143.75 162.5V50H171.875C174.361 50 176.746 50.9877 178.504 52.7459C180.262 54.504 181.25 56.8886 181.25 59.375V162.5C181.25 167.473 179.275 172.242 175.758 175.758C172.242 179.275 167.473 181.25 162.5 181.25Z" stroke="rgb(134, 143, 151)" stroke-width="12" stroke-linejoin="round" />
    <path d="M93.75 50H118.75M93.75 75H118.75M43.75 100H118.75M43.75 125H118.75M43.75 150H118.75" stroke="rgb(134, 143, 151)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M68.75 81.25H43.75C42.0924 81.25 40.5027 80.5915 39.3306 79.4194C38.1585 78.2473 37.5 76.6576 37.5 75V50C37.5 48.3424 38.1585 46.7527 39.3306 45.5806C40.5027 44.4085 42.0924 43.75 43.75 43.75H68.75C70.4076 43.75 71.9973 44.4085 73.1694 45.5806C74.3415 46.7527 75 48.3424 75 50V75C75 76.6576 74.3415 78.2473 73.1694 79.4194C71.9973 80.5915 70.4076 81.25 68.75 81.25Z" fill="black" />
  </svg>
  )
}

function getIconForTxType(txType: string) {
  return TX_TYPE_TO_ICON[txType] || TX_TYPE_TO_ICON['other']
}

function getNameForTxType(txType: string) {
  return txType
}

const Background: React.FC<{ tx: InterpretedTransaction }> = ({ tx }) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        position: "absolute",
        top: 24,
        left: 24,
        right: 24,
        opacity: 0.1,
      }}
    >
      {getIconForTxType(tx.type)}
      <span
        style={{
          textTransform: "uppercase",
          fontSize: "155px",
          fontWeight: 800,
          color: "rgb(134, 143, 151)",
        }}
      >
        {getNameForTxType(tx.type)}
      </span>
    </div>
  )
}

const TokenColumn: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        flex: 1,
      }}
    >
      {children}
    </div>
  )
}

const Separator: React.FC<{ vertical?: boolean }> = ({ vertical }) => {
  return (
    <div
      style={{
        width: vertical ? 1 : "100%",
        height: vertical ? "100%" : 1,
        backgroundColor: "rgba(255, 255, 255, 0.08)",
      }}
    />
  )
}

const Content: React.FC<
  React.PropsWithChildren<{ tx: InterpretedTransaction }>
> = ({ tx }) => {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        flexDirection: "row",
        borderRadius: "32px",
        padding: "24px 32px",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "inset 3px 3px 15px 3px rgba(11, 11, 15, 0.08)",
        background: "rgb(0,0,0)",
      }}
    >
      {match(tx.type).otherwise(() => (
        <div
          style={{
            display: "flex",
            flex: 1,
            gap: "24px",
          }}
        >
          <TokenColumn>
            {tx.assetsSent.map((asset) => (
              <Asset key={asset.asset.address} transfer={asset} label="Sent:" />
            ))}
          </TokenColumn>
          <Separator vertical />
          <TokenColumn>
            {tx.assetsReceived.map((asset) => (
              <Asset
                key={asset.asset.address}
                transfer={asset}
                label="Received:"
              />
            ))}
          </TokenColumn>
        </div>
      ))}
    </div>
  )
}

const MainComponent = ({ tx }: { tx: InterpretedTransaction }) => {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "rgb(11, 11, 15)",
        color: "rgb(255, 255, 255)",
        fontSize: 32,
        padding: "24px",
        fontFamily: "NotoSans",
        fontWeight: 400,
      }}
    >
      <Background tx={tx} />
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          fontSize: "48px",
          fontWeight: 600,
          textShadow: "0px 4px 4px rgba(255, 255, 255, 0.08)",
        }}
      >
        {tx.action}
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <Content tx={tx} />
      </div>
      <div style={{ display: "flex", gap: "48px", paddingTop: "16x" }}>
        <FooterColumn title="Chain:" description={chainIdToName[tx.chain]} />
        <FooterColumn
          title="Transaction Hash:"
          description={shortenHash(tx.txHash)}
        />
      </div>
    </div>
  )
}

export const drawFrame = (tx: InterpretedTransaction) =>
  Effect.gen(function* () {
    const svg = yield* Effect.tryPromise({
      try: () => {
        return satori(<MainComponent tx={tx} />, {
          width: 1200,
          height: 600,
          fonts: fonts,
          embedFont: true,
        })
      },
      catch: (error) => {
        console.error(error)
      },
    })

    const resvg = new Resvg(svg, {
      fitTo: { mode: "width", value: 2400 },
    })
    const pngData = resvg.render()

    return pngData.asPng().buffer as ArrayBuffer
  }).pipe(Effect.withSpan("drawFrame"))
