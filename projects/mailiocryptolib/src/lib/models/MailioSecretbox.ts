export interface MailioSecretBox {
    nonce: string;
    cipher: string;
}

export interface MailioSecretBoxOpened {
  text?: string
}
