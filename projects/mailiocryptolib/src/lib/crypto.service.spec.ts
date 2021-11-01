import { TestBed } from '@angular/core/testing';

import { CryptoService } from './crypto.service';
import { PhrasesService } from './phrases.service';

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
    const mnemonics = service.getMnemonics(3, ["apache", "mail", "io", "test"]);
    expect(mnemonics.split(' ').length).toBe(3);
  });

  it('create keyparis from mnemonics and email', () => {
    const allWords = PhrasesService.loadEnglishWords();
    const menomonicArray:string[] = [];
    for (let i=0; i<24; i++) {
      const word = allWords[Math.floor(Math.random() * allWords.length)];
      menomonicArray.push(word);
    }
    const mnemonic = menomonicArray.join(' ');
    const pairs = service.createKeyPairs(mnemonic, 'test@mail.io');
    expect(pairs.boxKeyPair.publicKey.length).toEqual(32);
    expect(pairs.boxKeyPair.secretKey.length).toEqual(32);
    expect(pairs.signKeyPair.publicKey.length).toEqual(32);
    expect(pairs.signKeyPair.secretKey.length).toEqual(64);
  });

  it('calculate sha256', () => {
     expect(service.sha256('test')).toEqual('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
  });

  it('calculate sha512', () => {
    expect(service.sha512('test')).toEqual('ee26b0dd4af7e749aa1a8ee3c10ae9923f618980772e473f8819a5d4940e0db27ac185f8a0e1d5f84f88bc887fd67b143732c304cc5fa9ad8e6f57f50028a8ff');
  });

  it('aes256 encrypt decrypt', () => {
    const encryptedbase64 = service.encryptAes256('test', 'test');
    const decrypted = service.decryptAes256('test', encryptedbase64);
    expect(decrypted).toEqual('test');
  });

  it('is valid address', () => {
    const isValid = service.isValidAddress('test');
    expect(isValid).toBeFalsy();
    expect(service.isValidAddress('0x51e21f9a472c05a602e7f18edf76159e6c0dc8c5')).toBeTruthy();
  });

});
