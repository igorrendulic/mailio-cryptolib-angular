import { TestBed } from '@angular/core/testing';
import { CryptoService } from './crypto.service';

import { WalletService } from './wallet.service';

describe('WalletService', () => {
  let service: WalletService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WalletService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('create wallet', () => {
    const encryptedWallet = service.create('test@mail.io', 'test');
    expect(encryptedWallet.backupMnemonic?.split(' ').length).toEqual(24);
    expect(encryptedWallet.email).toEqual('test@mail.io');
    expect(CryptoService.isValidAddress(encryptedWallet.address)).toBeTruthy();
  });

  it('recover wallet', () => {
    const encryptedWallet = service.create('test@mail.io', 'test');
    const restoredWallet = service.restore(encryptedWallet.backupMnemonic, 'test@mail.io', 'test');
    expect(encryptedWallet.address).toEqual(restoredWallet.address);
    expect(encryptedWallet.email).toEqual(restoredWallet.email);
    expect(encryptedWallet.walletPhrase).toEqual(restoredWallet.walletPhrase);
  });

  it('recover, decrypt and compare wallets', () => {
    const encryptedWallet = service.create('test@mail.io', 'test');
    const restoredWallet = service.restore(encryptedWallet.backupMnemonic, 'test@mail.io', 'test');

    // decrypt and compare wallet keys
    const decPhrase = service.phrase('test@mail.io', 'test');
    const decryptedWallet = service.decryptWallet(decPhrase,encryptedWallet.encryptedWallet);
    const decryptedRestoredWallet = service.decryptWallet(decPhrase, restoredWallet.encryptedWallet);
    expect(decryptedWallet.address).toEqual(decryptedRestoredWallet.address);
    expect(decryptedWallet.email).toEqual(decryptedRestoredWallet.email);
    expect(decryptedWallet.priv).toEqual(decryptedRestoredWallet.priv);
    expect(decryptedWallet.pub).toEqual(decryptedRestoredWallet.pub);
    expect(decryptedWallet.signPriv).toEqual(decryptedRestoredWallet.signPriv);
    expect(decryptedWallet.signPub).toEqual(decryptedRestoredWallet.signPub);
  });
});
