export interface WalletContext {
  address?: string
  profileName?: string
  profileImage?: string
}

export interface TxContext {
  from: WalletContext | null
  to: WalletContext | null
}
