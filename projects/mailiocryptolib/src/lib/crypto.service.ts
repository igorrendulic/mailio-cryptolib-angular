import { Injectable } from '@angular/core';
import * as sjcl from 'sjcl';
import * as nacl from 'tweetnacl';
import * as naclutil from 'tweetnacl-util';
import * as naclstream from 'nacl-stream';
import { MailioKeyPairs } from './models/MailioKeyPairs';
import { UtilsService } from './utils.service';
import { FileChunk } from './models/FileChunk';


const BITS_PER_WORD = 32;
const ALGORITHM_NONCE_SIZE = 3; // 32-bit words.
const ALGORITHM_KEY_SIZE = 4; // 32-bit words.
const PBKDF2_SALT_SIZE = 4; // 32-bit words.
const PBKDF2_ITERATIONS = 32767; // 100 ms?

@Injectable({
  providedIn: 'root',
})
export class CryptoService {
  constructor() {}

  /**
   *
   * @param count number of bits to generate
   * @returns
   */
  secureRandom(count:number):number {
    var rand = new Uint32Array(1);
    var skip = 0x7fffffff - (0x7fffffff % count);
    var result;

    if (((count - 1) & count) === 0) {
      window.crypto.getRandomValues(rand);
      return rand[0] & (count - 1);
    }
    do {
      window.crypto.getRandomValues(rand);
      result = rand[0] & 0x7fffffff;
    } while (result >= skip);
    return result % count;
  }

  /**
   *
   * @param n number of words to generate
   * @param listOfWords list of all possible words
   * @returns space separated string of words
   */
  getMnemonics(n:number, listOfWords:string[]):string {
    var phrase = '';
    var word;
    for (var i = 0; i < n; i++) {
      word = listOfWords[this.secureRandom(listOfWords.length)];
      phrase += word;
      if (i !== n - 1) {
        phrase += ' ';
      }
    }
    return phrase.toLowerCase();
  }

  /**
   * re-create keys pairs from mnemonics and email
   * @param mnemonic menominc string - words separated by space (must have 24 words)
   * @param email mailio email address
   * @returns MailioKeyPairs
   */
  createKeyPairs(mnemonic:string,email:string):MailioKeyPairs {

    var words = mnemonic.split(" ");
    if (words.length < 24 || words.length > 24) {
        throw "Number of words must be 24";
    }
    var slice1 = words.slice(0,12);
    var slice2 = words.slice(12,24);
    var curve25519SecretWords = slice1.join(" ");
    var ed25519SecretWords = slice2.join(" ");

    curve25519SecretWords = curve25519SecretWords + email;
    var bitArray = sjcl.hash.sha256.hash(curve25519SecretWords);
    var bits = sjcl.codec.hex.fromBits(bitArray);
    var utf8 = naclutil.decodeUTF8(bits);
    var pubPrivKeyPair = nacl.box.keyPair.fromSecretKey(utf8.subarray(64-32,64));

    ed25519SecretWords = ed25519SecretWords + email;
    var edBitArray = sjcl.hash.sha256.hash(ed25519SecretWords);
    var edHex = sjcl.codec.hex.fromBits(edBitArray);
    var edutf8 = naclutil.decodeUTF8(edHex);

    var signingKeys = nacl.sign.keyPair.fromSeed(edutf8.subarray(64-32,64));
    const output:MailioKeyPairs = {
      boxKeyPair:pubPrivKeyPair,
      signKeyPair:signingKeys
    };
    return output;
  }

  /**
   * Sha 256
   * @param phrase phrase to hash
   * @returns hex string
   */
  sha256(phrase:string):string {
    var bitArray = sjcl.hash.sha256.hash(phrase);
    var hex = sjcl.codec.hex.fromBits(bitArray);
    return hex;
  }

  /**
   * Sha 512
   * @param phrase phrase to hash
   * @returns hex string
   */
  sha512(phrase:string):string {
    var bitArray = sjcl.hash.sha512.hash(phrase);
    var hex = sjcl.codec.hex.fromBits(bitArray);
    return hex;
  }

  /**
   * AES 256, gcm mode encryption
   *
   * @param plaintext plaintext to encrypt (in sjcl.BitArray format)
   * @param key password derived from password using PBKDF2.
   * @returns encrypted sjcl.BitArray
   */
  encrypt(plaintext: sjcl.BitArray, key: sjcl.BitArray): sjcl.BitArray {
    // Generate a 96-bit nonce using a CSPRNG.
    var nonce = sjcl.random.randomWords(ALGORITHM_NONCE_SIZE);

    // Encrypt and prepend nonce.
    var ciphertext = sjcl.mode.gcm.encrypt(new sjcl.cipher.aes(key), plaintext, nonce);

    return sjcl.bitArray.concat(nonce, ciphertext);
  }

  /**
   * AES 256, gcm mode decryption
   *
   * @param ciphertextAndNonce ciphertext and nonce (in sjcl.BitArray format)
   * @param key derived from password using PBKDF2.
   * @returns decrypted sjcl.BitArray
   */
  decrypt(ciphertextAndNonce: sjcl.BitArray, key: sjcl.BitArray) {
    // Create buffers of nonce and ciphertext.
    var nonce = sjcl.bitArray.bitSlice(ciphertextAndNonce, 0, ALGORITHM_NONCE_SIZE * BITS_PER_WORD);
    var ciphertext = sjcl.bitArray.bitSlice(ciphertextAndNonce, ALGORITHM_NONCE_SIZE * BITS_PER_WORD, sjcl.bitArray.bitLength(ciphertextAndNonce));

    // Decrypt and return result.
    return sjcl.mode.gcm.decrypt(new sjcl.cipher.aes(key), ciphertext, nonce);
}

  /**
   * Derives a key from PBKDF2, encrypts plainttext and prepends salt
   * Internally calls encrypt function
   *
   * @param password encryption password
   * @param plaintext plaintext to encrypt
   * @returns base64 encrypted text
   */
  encryptAes256(password:string, plaintext:string):string {
    // Generate a 128-bit salt using a CSPRNG.
    var salt = sjcl.random.randomWords(PBKDF2_SALT_SIZE);

    // Derive a key using PBKDF2.
    var key = sjcl.misc.pbkdf2(password, salt, PBKDF2_ITERATIONS, ALGORITHM_KEY_SIZE * BITS_PER_WORD);

    // Encrypt and prepend salt.
    var plaintextRaw = sjcl.codec.utf8String.toBits(plaintext);
    var ciphertextAndNonceAndSalt = sjcl.bitArray.concat(salt, this.encrypt(plaintextRaw, key));

    return sjcl.codec.base64.fromBits(ciphertextAndNonceAndSalt);
  }

  /**
   * AES256 decryption
   * @param password password used to encrypt
   * @param base64CiphertextAndNonceAndSalt  base64 encoded ciphertext and nonce and salt
   * @returns
   */
  decryptAes256(password: string | sjcl.BitArray, base64CiphertextAndNonceAndSalt: string) {
    // Decode the base64.
    var ciphertextAndNonceAndSalt = sjcl.codec.base64.toBits(base64CiphertextAndNonceAndSalt);

    // Create buffers of salt and ciphertextAndNonce.
    var salt = sjcl.bitArray.bitSlice(ciphertextAndNonceAndSalt, 0, PBKDF2_SALT_SIZE * BITS_PER_WORD);
    var ciphertextAndNonce = sjcl.bitArray.bitSlice(ciphertextAndNonceAndSalt, PBKDF2_SALT_SIZE * BITS_PER_WORD, sjcl.bitArray.bitLength(ciphertextAndNonceAndSalt));

    // Derive the key using PBKDF2.
    var key = sjcl.misc.pbkdf2(password, salt, PBKDF2_ITERATIONS, ALGORITHM_KEY_SIZE * BITS_PER_WORD);

    // Decrypt and return result.
    return sjcl.codec.utf8String.fromBits(this.decrypt(ciphertextAndNonce, key));
  }

  /**
   * Decrypt a file chunk by chunk
   * @param message
   * @param encKeyBytes
   * @param chunkSize
   * @returns
   */
  decryptFile(message: string | any[], encKeyBytes: any, chunkSize: number) {

    var nonce = message.slice(0,16);
    var blob = message.slice(16,message.length);

    var decryptor = naclstream.createDecryptor(encKeyBytes,nonce, chunkSize);
    // decrypt chunks
    var totalLength:number = 0;
    var allchunks:any[] = [];
    var position:number = 0;
    var nextChunkSize:number = -1;
    let chunk:FileChunk | null = UtilsService.nextChunk(blob, position, nextChunkSize);

    if (UtilsService.isNotNull(chunk)) {

      position = chunk!.position;
      nextChunkSize = chunk!.nextChunkSize;
      totalLength += nextChunkSize;
      var justInCaseCount = 0;
      while (chunk!.isLast === false) {
          if (justInCaseCount > 100) { // (100 * 5 * 1024*1024 == 500 Mb file)
              // exit if something went wrong
              break;
          }
          chunk = UtilsService.nextChunk(blob,position,nextChunkSize);
          position = chunk!.position;
          nextChunkSize = chunk!.nextChunkSize;
          if (chunk!.chunk) {
              var decMsg = decryptor.decryptChunk(chunk!.chunk, chunk!.isLast);
              allchunks.push(decMsg);
          }
          totalLength += nextChunkSize;
          justInCaseCount ++;
      }
    }

    var completeMessage = new Uint8Array(totalLength);
    var offset = 0;
    for (var i=0; i<allchunks.length; i++) {
        completeMessage.set(allchunks[i],offset);
        offset += chunkSize;
    }
    decryptor.clean();
    decryptor = null;

    return completeMessage;
  }

  /**
   * Validates internal mailio address (inspired by ethereum address validation)
   * @param address string
   * @returns boolean
   */
  isValidAddress(address: string):boolean {
    return /^0x[0-9a-fA-F]{40}$/.test(address)
  }

  /**
   * Public Key Encryption (create public box)
   * The Box class uses the given public and private (secret) keys to derive a shared key, which is used with the nonce
   * given to encrypt the given messages and to decrypt the given ciphertexts. The same shared key will be generated from
   * both pairing of keys, so given two keypairs belonging to Alice (pkalice, skalice) and Bob (pkbob, skbob), the key
   * derived from (pkalice, skbob) will equal that from (pkbob, skalice)
   *
   * @param senderPrivateKey senders private key UInt8Array
   * @param receiverPublicKey receivers public key UInt8Array
   * @param aes256RandomEncryptionKey random encryption key
   * @param nonce nonce
   * @returns UInt8Array
   */
  boxEncrypt(senderPrivateKey: Uint8Array, receiverPublicKey: Uint8Array,aes256RandomEncryptionKey: Uint8Array, nonce: Uint8Array): Uint8Array {
     return nacl.box(aes256RandomEncryptionKey, nonce, receiverPublicKey, senderPrivateKey);
  }

   /**
   * Public Key Encryption (decrypt public box)
   *
   * The Box class uses the given public and private (secret) keys to derive a shared key, which is used with the nonce
   * given to encrypt the given messages and to decrypt the given ciphertexts. The same shared key will be generated from
   * both pairing of keys, so given two keypairs belonging to Alice (pkalice, skalice) and Bob (pkbob, skbob), the key
   * derived from (pkalice, skbob) will equal that from (pkbob, skalice)
   *
   * @param senderPrivateKey senders private key UInt8Array
   * @param receiverPublicKey receivers public key UInt8Array
   * @param aes256RandomEncryptionKey random encryption key
   * @param nonce nonce
   * @returns UInt8Array
   */
  boxDecrypt(message: Uint8Array,nonce: Uint8Array,senderPublicKey: Uint8Array, receiverSecretKey: Uint8Array): Uint8Array | null {
    return nacl.box.open(message,nonce,senderPublicKey, receiverSecretKey);
  }

  /**
   * Symmetric key encryption is analogous to a safe. You can store something secret
   * through it and anyone who has the key can open it and view the contents. SecretBox functions as just such a safe,
   * and like any good safe any attempts to tamper with the contents is easily detected.
   * Secret key encryption allows you to store or transmit data over insecure channels without leaking the contents of that
   * message, nor anything about it other than the length.
   *
   * Recommended max size for secretbox message is 16KB.
   *
   * @param message message to send
   * @param nonce 24 byte message nonce, must NEVER be reused for a particular key
   * @param key This must be kept secret, this is the combination to your safe
   * @returns encrypted message
   */
  secretBox(message: Uint8Array, nonce: Uint8Array, key: Uint8Array): Uint8Array {
    return nacl.secretbox(message, nonce, key);
  }

  /**
   * Secret box decryption
   *
   * Recommended max size for secretbox message is 16KB.
   *
   * @param box encrypted message
   * @param nonce  24 byte message nonce, must NEVER be reused for a particular key
   * @param key This must be kept secret, this is the combination to your safe
   * @returns decrypted message
   */
  secretUnbox(box: Uint8Array, nonce: Uint8Array, key: Uint8Array): Uint8Array | null {
    return nacl.secretbox.open(box, nonce, key);
  }

  /**
   * EC25519 Sign a message with a signature key
   *
   * @param message base64 encoded message
   * @param signatureKey base64 encodeded signature key
   * @returns
   */
  sign(message: string, signatureKey: string):string  {
    var sk = naclutil.decodeBase64(signatureKey);
    return naclutil.encodeBase64(nacl.sign.detached(naclutil.decodeUTF8(message), sk));
  }

  /**
   * EC25519 Validate a signature
   *
   * @param signature base64 encoded signature
   * @param publicSignKey base64 encoded public signature key
   * @param message base64 encoded signed message
   * @returns true/false boolean
   */
  validateSign(signature: string, publicSignKey: string, message: string):boolean {
    var pk = naclutil.decodeBase64(publicSignKey);
    var sign = naclutil.decodeBase64(signature);
    return nacl.sign.detached.verify(naclutil.decodeUTF8(message), sign, pk);
  }

  /**
   * Validate RSA key (must be 32 bytes)
   *
   * @param key base64 encoded key
   * @returns true/false boolean
   */
  validateRSAKey(key: string):boolean {
    var base64Match = new RegExp(
        '^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$'
    )
    if ( (key.length > 50) || (key.length < 40)) {
        return false
    }
    if (base64Match.test(key)) {
        var bytes = naclutil.decodeBase64(key)
        return bytes.length === 32;
    }
    return false;
  }

}
