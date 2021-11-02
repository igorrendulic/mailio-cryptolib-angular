import { Inject, Injectable } from '@angular/core';
import { MAILIO_CONFIG } from './config';
import { CryptoService } from './crypto.service';
import { MailioConfig } from './models/MailioConfig';
import { EncryptedWallet, Wallet } from './models/Wallet';
import { StorageService } from './storage.service';
import { UtilsService } from './utils.service';
import { WalletService } from './wallet.service';
import * as nacl from 'tweetnacl';
import * as naclutil from 'tweetnacl-util';
import { MailioSecretBox, MailioSecretBoxOpened } from './models/MailioSecretbox';

@Injectable({
  providedIn: 'root'
})
export class MailioService {

  chunkSize = 1024 * 1024 * 5; // 5 Mb maximum file chunk size to be encrypted
  walletPrefix = 'mailiosk:';
  config:MailioConfig;

  constructor( @Inject(MAILIO_CONFIG) config: MailioConfig, private walletService:WalletService) {
    this.config = config;
    const isValid = this._validateConfig(config);
    if (!isValid) {
      throw new Error('Invalid mailio config');
    }
  }

  getAllWallets() {
    return StorageService.findAllByPrefix(this.walletPrefix);
  }

  /**
   * Sha512 hashing
   * @param phrase string phrase to hash
   * @returns hex string
   */
  hashSha512(phrase:string):string {
    return CryptoService.sha512(phrase);
  }

  /**
   *
   * @param email full email (e.g. test@mail.io)
   * @param password custom password. Recommended strong passwoprd
   * @returns sha256 hex string
   */
  getWalletPhrase(email: string, password: string): string {
    return this.walletService.phrase(email,password);
  }

  /**
   *  Checks at the given local storage key if wallet exists and decrypts the wallet
   *
   * @param walletStorageKey local storage key for the wallet
   * @param walletPhrase wallet phrase (see: getWalletPhrase)
   * @returns Wallet - decrypted wallet object
   */
  getWallet(walletStorageKey:string, walletPhrase:string): Wallet {
    var mailiowallet = StorageService.getKey(walletStorageKey);
    if (UtilsService.isNull(mailiowallet)) {
      throw new Error('wallet doesnt exist');
    }
    var wallet = this.walletService.decryptWallet(walletPhrase, mailiowallet!);
    if (wallet === null) {
        throw new Error('Wallet doesnt exist');
    }
    return wallet;
  }

  /**
   * In memory wallet decryption (from base64)
   * @param walletPhrase wallet phrase (see: getWalletPhrase)
   * @param base64Wallet encrypted wallet in base64 format
   * @returns Wallet - decrypted wallet object
   */
  decryptWallet(walletPhrase:string, base64Wallet:string): Wallet {
    var wallet = this.walletService.decryptWallet(walletPhrase, base64Wallet);
    if (wallet === null) {
        throw "Wallet doesn't exist";
    }
    return wallet;
  }

  /**
   * Creates a new wallet, stores encrypted wallet locally and returns encrypted wallet
   * Encrypted wallet is stored in local browser storage under key: mailiosk:email
   *
   * @param email full email (e.g. test@mail.io)
   * @param password custom password. Recommended strong passwoprd
   * @returns EncryptedWallet - encrypted wallet object (not secure since it holds the wallet phrase!)
   */
  createWallet(email: string, password: string): EncryptedWallet {
    var w = this.walletService.create(email,password);
    var encW = w.encryptedWallet;
    var walletKey = this.walletPrefix + w.email;
    StorageService.setKey(walletKey, encW);
    return w;
  }

  /**
   * Restores mailio wallet from backup mnemonics and stores it into local storage
   *
   * @param backupMnemonic exactly 24 words separated by spaces
   * @param email full email (e.g. test@mail.io)
   * @param newPassword custom password. Recommended strong password
   * @returns base64 encrypted wallet
   */
  restoreWallet(backupMnemonic: string, email: string, newPassword: string): string {
    var w = this.walletService.restore(backupMnemonic, email, newPassword);
    var encW = w.encryptedWallet;
    var walletKey = this.walletPrefix + email;
    StorageService.setKey(walletKey, encW);
    return encW;
  }


   /**
    * Encrypt AES GCM 128 bit plaintext with custom password
    *
    * @param password Custom password. Recommended strong password
    * @param plaintext custom text to encrypt
    * @returns base64 encrypted text
    */
  encrypt(password: string, plaintext: string): string {
    var encrypted = CryptoService.encryptAES(password, plaintext);
    return encrypted;
  }

  /**
   * Decrypt AES GCM 128 bit ciphertext with custom password
   *
   * @param password Custom password.
   * @param ciphertext Encrypted text
   * @returns string plaintext
   */
  decrypt(password: string, ciphertext: string): string {
    var plaintext = CryptoService.decryptAES(password, ciphertext);
    return plaintext;
  }

  /**
   * NACL Secret box encryption (recommended for small plaintexts, up to 16KB)
   *
   * @param privateKey base64 encoded private key (box keys from Mailio Wallet)
   * @param plaintext plaintext to encrypt
   * @returns MailioSecretBox
   */
  encryptSecretBox(privateKey: string, plaintext: string): MailioSecretBox {
    const nonce = nacl.randomBytes(24);
    const key = naclutil.decodeBase64(privateKey);
    var m = naclutil.decodeUTF8(plaintext);
    var cipher = CryptoService.secretBox(m, nonce, key);
    const sb:MailioSecretBox = {
      cipher: naclutil.encodeBase64(cipher),
      nonce: naclutil.encodeBase64(nonce)
    };
    return sb;
  }

  /**
   * NACL Secret box decryption
   * @param privateKey base64 encoded private key (box keys from Mailio Wallet)
   * @param ciphertext base64 encoded ciphertext
   * @param nonce base64 encoded nonce
   * @returns MailioSecretBoxOpened
   */
  decryptSecretBox(privateKey: string, ciphertext: string, nonce: string): MailioSecretBoxOpened {
    const n = naclutil.decodeBase64(nonce);
    const key = naclutil.decodeBase64(privateKey);
    var msg = naclutil.decodeBase64(ciphertext);
    var plaintext = CryptoService.secretUnbox(msg, n, key);
    if (UtilsService.isNull(plaintext)) {
      throw new Error('Decryption failed');
    }
    var out = naclutil.encodeUTF8(plaintext!);
    return {'text':out}
  }

  /**
   * Creating digital signature using NACL EdDSA
   *
   * @param message base64 message to sign
   * @param signatureKey base64 EdDSA private key for signing (mailio wallet signKeys secret key)
   * @returns base64 encoded signature
   */
  signMessage(message: string, signatureKey: string): string {
    return CryptoService.sign(message, signatureKey);
  }

  /**
   * Validating message signature using public NACL EdDSA key
   *
   * @param signature base64 encoded signature
   * @param publicSignKey base64 encoded public key for signature verification
   * @param message base64 encoede message
   * @returns boolean true/false
   */
  validateMessageSignature(signature: string, publicSignKey: string, message: string): boolean {
    return CryptoService.validateSign(signature, publicSignKey, message);
  }

  /**
   * Validate mailio configuration
   * @param config
   * @returns
   */
  _validateConfig(config:MailioConfig): boolean {
    if (!config.aws_key || !config.bucket || !config.awsRegion || !config.signerUrl) {
      return false;
    }
    return true;
  }
}
