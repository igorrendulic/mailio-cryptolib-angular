export interface EncryptedWallet {
  address: string,
  encryptedWallet: string,
  walletPhrase: string, // sha256 encoded email phrase from email+password concatenated string
  email: string, // full email address (e.g. test@mail.io)
  backupMnemonic?: string, // 24 words as backup phrase
}

export interface Wallet {
  address: string,
  priv: string,
  pub: string,
  signPriv: string,
  signPub: string,
  email: string,
}
