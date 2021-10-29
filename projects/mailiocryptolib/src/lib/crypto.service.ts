import { Injectable } from '@angular/core';
import * as sjcl from 'sjcl';
import * as nacl from 'tweetnacl';
import * as naclutil from 'tweetnacl-util';
import { MailioKeyPairs } from './models/MailioKeyPairs';


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
}
