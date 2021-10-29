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

});
