import { TestBed } from '@angular/core/testing';
import { MAILIO_CONFIG } from './config';

import { MailioService } from './mailio.service';

describe('MailioService', () => {
  let service: MailioService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{provide: MAILIO_CONFIG, useValue: {
        aws_key: 'abc',
        bucket: '/bucket',
        awsRegion: 'us-somewhere-1',
        signerUrl: 'https://example.com',
      }}]
    });
    service = TestBed.inject(MailioService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('list all mailio wallets', () => {
    const wallets = service.getAllWallets();
    expect(wallets).toBeTruthy();
  });
});
