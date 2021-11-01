import { Injectable } from '@angular/core';
import { CryptoService } from './crypto.service';
import { EncryptedWallet, Wallet } from './models/Wallet';
import * as naclutil from 'tweetnacl-util';
import { MailioKeyPairs } from './models/MailioKeyPairs';
import { PhrasesService } from './phrases.service';

@Injectable({
  providedIn: 'root'
})
export class WalletService {

  constructor() { }

  /**
   * Generating simple sha256 in hex format which is used as aes encryption/decryption key for a wallet
   * @param email full email, e.g.: test@test.com
   * @param password custom password. The stronger the better
   * @returns sha256 hex string
   */
  phrase(email: string, password: string): string {
    return CryptoService.sha256(email + password);
  }

  /**
   * Decrypt a wallet
   * @param encPhrase check `phrase` function for encPhrase key generation
   * @param mailiowallet wallet stored as base64 encrypted wallet
   * @returns string
   * @throws Error if decryption fails
   */
  decryptWallet(encPhrase:string, mailiowallet:string): Wallet {
    if (!encPhrase) {
        throw "Encryption phrase required";
    }
    if (!mailiowallet) {
        throw "No wallet";
    }
    try {
        var decr = CryptoService.decryptAes256(encPhrase,mailiowallet);
        let parsed:Wallet = JSON.parse(decr);
        return parsed;
    } catch (err) {
        throw "Invalid password";
    }
  }

  /**
   * Creates a fresh new mailio wallet
   *
   * @param email full email address (e.g. test@mail.io)
   * @param password custom password. The stronger the better
   * @returns EncryptedWallet (not sucure, since it also stores a wallet phrase)
   * @throws Error if wallet creation fails
   */
  create(email:string ,password:string): EncryptedWallet {

    // generate backup mnemonic
    var backupMnemonic = CryptoService.getMnemonics(24, PhrasesService.loadEnglishWords());

    var encPhrase = this.phrase(email, password);

    var keyPairs = CryptoService.createKeyPairs(backupMnemonic,email);
    var address = this._createAddress(keyPairs.boxKeyPair.publicKey);

    if (!CryptoService.isValidAddress(address)) {
        throw "Invalid address";
    }
    var wallet = this._walletResponse(keyPairs,email, address);

    var encryptedWallet = CryptoService.encryptAes256(encPhrase, JSON.stringify(wallet));
    const res:EncryptedWallet = {
        encryptedWallet: encryptedWallet,
        backupMnemonic: backupMnemonic,
        walletPhrase: encPhrase,
        email: email,
        address: address,
    }
    return res;
}

  /**
   * Restore a wallet from a mnemonic
   *
   * @param backupMnemonic exactly 24 words separated by space
   * @param email full email address (e.g. test@mail.io)
   * @param newPassword new encrpytion password for wallet
   * @returns EncryptedWallet (not sucure, since it also stores a wallet phrase)
   */
  restore(backupMnemonic, email: string, newPassword: string): EncryptedWallet {
    var keyPairs:MailioKeyPairs = CryptoService.createKeyPairs(backupMnemonic,email);
    var address = this._createAddress(keyPairs.boxKeyPair.publicKey);
    const wallet = this._walletResponse(keyPairs, email, address);
    const encPhrase = this.phrase(email, newPassword);
    const encryptedWallet = CryptoService.encryptAes256(encPhrase, JSON.stringify(wallet));
    const w:EncryptedWallet = {
      encryptedWallet:encryptedWallet,
      walletPhrase: encPhrase,
      email: wallet.email,
      address: wallet.address
    }
    backupMnemonic = null;
    return w;
  }

  /**
   * Construction of wallet response.
   *
   * @param keyPairs MailioKeyPairs
   * @param email full email
   * @param address mailio address
   * @returns Wallet(decrypted wallet object)
   */
  _walletResponse(keyPairs: MailioKeyPairs,email: string, address: string): Wallet {
    const boxKeyPair = keyPairs.boxKeyPair;
    const signKeyPair = keyPairs.signKeyPair;

    const wallet:Wallet = {
        priv: naclutil.encodeBase64(boxKeyPair.secretKey),
        pub: naclutil.encodeBase64(boxKeyPair.publicKey),
        signPriv: naclutil.encodeBase64(signKeyPair.secretKey),
        signPub: naclutil.encodeBase64(signKeyPair.publicKey),
        address: address,
        email:email
    }
    return wallet;
  }

  _createAddress(pubKey: Uint8Array):string {
    if (pubKey) {
        var eadd = naclutil.encodeBase64(pubKey);
        var sha256Key = CryptoService.sha256(eadd);
        return "0x" + sha256Key.substr(64-40,64);
    }
    return "";
  }

}
