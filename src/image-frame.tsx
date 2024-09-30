import { Effect } from "effect"
import satori from "satori"
import { Resvg } from "@resvg/resvg-js"
import { fonts } from "./fonts"
import {
  AssetTransfer,
  InterpretedTransaction,
} from "@3loop/transaction-interpreter"
import { match, P } from "ts-pattern"
import { IMG_HEIGHT, IMG_WIDTH, providerConfigs } from "./constants"
import { resolveToJpeg, resolveTokenIcon } from "./utils/image"
import { TxContext } from "./types"
import {
  APPROVE_ICON,
  BURN_ICON,
  OTHER_ICON,
  SWAP_ICON,
  TRANSFER_ICON,
} from "./satori-components/icons"

function shortenHash(hash: string) {
  return hash.slice(0, 10) + "..." + hash.slice(-10)
}

let NumberFormatter = new Intl.NumberFormat("en-US", {})

const WalletProfile: React.FC<{
  description: string
  image?: string
}> = ({ description, image }) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "8px",
        fontSize: 32, // Match the font size of the description text
        border: "1px solid rgb(221, 221, 221)",
        padding: "8px",
        borderRadius: "32px",
        lineHeight: "36px",
      }}
    >
      {image && (
        <img
          src={image}
          style={{
            width: "36px", // Set width to match text height
            height: "36px", // Set height to match text height
            borderRadius: "50%",
            objectFit: "cover",
            verticalAlign: "middle", // Align the image with the text baseline
          }}
        />
      )}
      <span>{description}</span>
    </div>
  )
}

const FooterColumn: React.FC<
  React.PropsWithChildren<{
    title: string
  }>
> = ({ title, children }) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "4px",
      }}
    >
      <span
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: "rgb(98, 114, 84)",
        }}
      >
        {title}
      </span>
      {children}
    </div>
  )
}

const Asset: React.FC<{
  transfer: AssetTransfer
  label: string
  url: string | null
}> = ({ transfer, label, url }) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-end",
        gap: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: "16px",
          flex: 1,
        }}
      >
        {url ? (
          <img
            src={url}
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              border: "0.5px solid rgba(255, 255, 255, 0.08)",
            }}
          />
        ) : undefined}
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
                color: "rgb(98, 114, 84)",
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontWeight: "600",
                fontSize: "36px",
                lineHeight: "40px",
              }}
            >
              {transfer.asset.symbol}
            </span>
          </div>
        </div>
      </div>
      <span
        style={{
          fontWeight: "600",
          fontSize: "36px",
          lineHeight: "40px",
        }}
      >
        {NumberFormatter.format(Number(transfer.amount))}
      </span>
    </div>
  )
}

type InterpretedTransactionType = InterpretedTransaction["type"]

const TX_TYPE_TO_ICON: Record<InterpretedTransactionType, JSX.Element> = {
  swap: SWAP_ICON,
  "transfer-token": TRANSFER_ICON,
  "transfer-nft": TRANSFER_ICON,
  "approve-token": APPROVE_ICON,
  "approve-nft": APPROVE_ICON,
  burn: BURN_ICON,

  borrow: OTHER_ICON,
  "deposit-collateral": OTHER_ICON,
  "repay-loan": OTHER_ICON,
  "send-to-bridge": OTHER_ICON,
  "receive-from-bridge": OTHER_ICON,
  "stake-token": OTHER_ICON,
  "unstake-token": OTHER_ICON,
  "withdraw-collateral": OTHER_ICON,
  wrap: OTHER_ICON,
  unwrap: OTHER_ICON,
  "account-abstraction": OTHER_ICON,
  unknown: OTHER_ICON,
}

function getIconForTxType(txType: InterpretedTransactionType) {
  return TX_TYPE_TO_ICON[txType] || TX_TYPE_TO_ICON["unknown"]
}

function getNameForTxType(txType: InterpretedTransactionType) {
  const txTypeToName: Record<InterpretedTransactionType, string> = {
    "repay-loan": "Repay",
    "deposit-collateral": "Collateral",
    borrow: "Borrow",
    "withdraw-collateral": "Collateral",
    swap: "Swap",
    wrap: "Wrap",
    unwrap: "Unwrap",
    "approve-token": "Approve",
    "transfer-token": "Transfer",
    "approve-nft": "Approve",
    "transfer-nft": "Transfer",
    "send-to-bridge": "Bridge",
    "receive-from-bridge": "Bridge",
    "account-abstraction": "AA",
    "stake-token": "Stake",
    "unstake-token": "Unstake",
    burn: "Burn",
    unknown: "Unknown",
  }

  return txTypeToName[txType] || "Other"
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
        opacity: 0.15,
      }}
    >
      {getIconForTxType(tx.type)}
      <span
        style={{
          textTransform: "uppercase",
          fontSize: "155px",
          fontWeight: 800,
          color: "rgb(98, 114, 84)",
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
        backgroundColor: "rgba(0, 0, 0, 0.08)",
      }}
    />
  )
}

const Content: React.FC<
  React.PropsWithChildren<{
    tx: InterpretedTransaction
    tokenIconMap: Record<string, string | null>
  }>
> = ({ tx, tokenIconMap }) => {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        flexDirection: "row",
        borderRadius: "32px",
        padding: "24px 32px",
        border: "1px solid rgba(0, 0, 0, 0.08)",
        boxShadow: "inset 3px 3px 15px 3px rgba(11, 11, 15, 0.08)",
        background: "rgb(221, 221, 221)",
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
          {tx.assetsSent.length > 0 ? (
            <TokenColumn>
              {tx.assetsSent.map((asset) => (
                <Asset
                  key={asset.asset.address}
                  transfer={asset}
                  url={tokenIconMap[asset.asset.address]}
                  label="Sent:"
                />
              ))}
            </TokenColumn>
          ) : null}
          {tx.assetsReceived.length > 0 && tx.assetsSent.length > 0 ? (
            <Separator vertical />
          ) : null}
          {tx.assetsReceived.length > 0 ? (
            <TokenColumn>
              {tx.assetsReceived.map((asset) => (
                <Asset
                  key={asset.asset.address}
                  url={tokenIconMap[asset.asset.address]}
                  transfer={asset}
                  label="Received:"
                />
              ))}
            </TokenColumn>
          ) : null}
        </div>
      ))}
    </div>
  )
}

const MainComponent = ({
  tx,
  tokenIconMap,
  context,
}: {
  tx: InterpretedTransaction
  tokenIconMap: Record<string, string | null>
  context: TxContext
}) => {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "rgb(255, 255, 255)",
        color: "rgb(0, 0, 0)",
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
        <Content tx={tx} tokenIconMap={tokenIconMap} />
      </div>
      <div style={{ display: "flex", gap: "48px", paddingTop: "16x" }}>
        <FooterColumn title="Chain:">
          <span>{providerConfigs[tx.chain].name}</span>
        </FooterColumn>
        <FooterColumn title="Transaction Hash:">
          <span>{shortenHash(tx.txHash)}</span>
        </FooterColumn>
        {context.from?.profileName && (
          <FooterColumn title="From:">
            <WalletProfile
              description={context.from.profileName}
              image={context.from.profileImage}
            />
          </FooterColumn>
        )}
        {context.to?.profileName && (
          <FooterColumn title="To:">
            <WalletProfile
              description={context.to.profileName}
              image={context.to.profileImage}
            />
          </FooterColumn>
        )}
      </div>
    </div>
  )
}

export const drawFrame = (tx: InterpretedTransaction, context: TxContext) =>
  Effect.gen(function* () {
    const tokens = tx.assetsSent.concat(tx.assetsReceived).map((asset) => {
      return asset.asset.address
    })

    // NOTE: Satori will crash if the image is not found, thus we need to resolve the image first
    const tokenIcons = yield* Effect.all(tokens.map(resolveTokenIcon), {
      concurrency: "unbounded",
    })

    const tokenIconMap = tokens.reduce(
      (acc, address, index) => {
        acc[address] = tokenIcons[index]
        return acc
      },
      {} as Record<string, string | null>,
    )

    if (context.from?.profileImage) {
      const image = yield* resolveToJpeg(context.from.profileImage)
      if (image) context.from.profileImage = image
    }

    if (context.to?.profileImage) {
      const image = yield* resolveToJpeg(context.to.profileImage)
      if (image) context.to.profileImage = image
    }

    const svg = yield* Effect.tryPromise({
      try: () => {
        return satori(
          <MainComponent
            tx={tx}
            tokenIconMap={tokenIconMap}
            context={context}
          />,
          {
            width: IMG_WIDTH,
            height: IMG_HEIGHT,
            fonts: fonts,
            embedFont: true,
          },
        )
      },
      catch: (error) => {
        console.error(error)
      },
    })

    const resvg = new Resvg(svg, {
      fitTo: { mode: "width", value: 1200 * 1.5 },
    })
    const pngData = resvg.render()

    return pngData.asPng().buffer as ArrayBuffer
  }).pipe(Effect.withSpan("drawFrame"))
