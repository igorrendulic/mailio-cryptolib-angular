import { TestBed } from '@angular/core/testing';

import { CryptoService } from './crypto.service';
import { MailioKeyPairs } from './models/MailioKeyPairs';
import { PhrasesService } from './phrases.service';
import * as nacl from 'tweetnacl';
import * as naclutil from 'tweetnacl-util';
import { UtilsService } from './utils.service';

function createTestEncryptionKeys():MailioKeyPairs {
  const allWords = PhrasesService.loadEnglishWords();
  const menomonicArray:string[] = [];
  for (let i=0; i<24; i++) {
    const word = allWords[Math.floor(Math.random() * allWords.length)];
    menomonicArray.push(word);
  }
  const mnemonic = menomonicArray.join(' ');
  const pairs = CryptoService.createKeyPairs(mnemonic, 'test@mail.io');
  return pairs;
}

describe('CryptoService', () => {
  let service: CryptoService;
  let phrases: PhrasesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CryptoService);
    phrases = TestBed.inject(PhrasesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(phrases).toBeTruthy();
  });

  it('get mnemonics', () => {
    const mnemonics = CryptoService.getMnemonics(3, ["apache", "mail", "io", "test"]);
    expect(mnemonics.split(' ').length).toBe(3);
  });

  it('create keyparis from mnemonics and email', () => {
    const pairs = createTestEncryptionKeys();
    expect(pairs.boxKeyPair.publicKey.length).toEqual(32);
    expect(pairs.boxKeyPair.secretKey.length).toEqual(32);
    expect(pairs.signKeyPair.publicKey.length).toEqual(32);
    expect(pairs.signKeyPair.secretKey.length).toEqual(64);
  });

  it('calculate sha256', () => {
     expect(CryptoService.sha256('test')).toEqual('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
  });

  it('calculate sha512', () => {
    expect(CryptoService.sha512('test')).toEqual('ee26b0dd4af7e749aa1a8ee3c10ae9923f618980772e473f8819a5d4940e0db27ac185f8a0e1d5f84f88bc887fd67b143732c304cc5fa9ad8e6f57f50028a8ff');
  });

  it('aes256 encrypt decrypt', () => {
    const encryptedbase64 = CryptoService.encryptAes256('test', 'test');
    const decrypted = CryptoService.decryptAes256('test', encryptedbase64);
    expect(decrypted).toEqual('test');
  });

  it('is valid address', () => {
    const isValid = CryptoService.isValidAddress('test');
    expect(isValid).toBeFalsy();
    expect(CryptoService.isValidAddress('0x51e21f9a472c05a602e7f18edf76159e6c0dc8c5')).toBeTruthy();
  });

  it('nacl secret box', () => {
    const keyPairs = createTestEncryptionKeys();
    const nonce = nacl.randomBytes(24);
    const key = keyPairs.boxKeyPair.secretKey;
    var m = naclutil.decodeUTF8('test');
    var cipher = CryptoService.secretBox(m, nonce, key);
    const unboxed = CryptoService.secretUnbox(cipher, nonce, key);
    expect(UtilsService.Utf8ArrayToStr(unboxed)).toEqual('test');
  });

  it('es25519 signature and validation', () => {
    const keyPairs = createTestEncryptionKeys();
    const signatureKey = keyPairs.signKeyPair.secretKey;
    const b64SignatureKey = naclutil.encodeBase64(signatureKey);
    const signature = CryptoService.sign('test', b64SignatureKey);
    const isValid = CryptoService.validateSign(signature, naclutil.encodeBase64(keyPairs.signKeyPair.publicKey), 'test');
    expect(isValid).toBeTruthy();
  });

  it('nacl public box', () => {
    /**
     * The Box uses the given public and private (secret) keys to derive a shared key,
     * which is used with the nonce given to encrypt the given messages and to decrypt the given ciphertexts.
     * The same shared key will be generated from both pairing of keys, so given two keypairs belonging to
     * Alice (pkalice, skalice) and Bob (pkbob, skbob), the key derived from (pkalice, skbob) will equal that from (pkbob, skalice).
     *
     * Simple explanation: The box can be prepared so it can be sent over network to a specific user (in this case alices public key).
     */
    const bob = createTestEncryptionKeys();
    const alice = createTestEncryptionKeys();
    const nonce = nacl.randomBytes(24);
    const message = naclutil.decodeUTF8('test');
    const bobBoxWithEncryptedMessage = CryptoService.boxEncrypt(bob.boxKeyPair.secretKey, alice.boxKeyPair.publicKey, message, nonce);
    const aliceBox = CryptoService.boxDecrypt(bobBoxWithEncryptedMessage, nonce, bob.boxKeyPair.publicKey, alice.boxKeyPair.secretKey);
    expect(UtilsService.Utf8ArrayToStr(aliceBox)).toEqual('test');
  });

});
