import { TestBed } from '@angular/core/testing';

import { PhrasesService } from './phrases.service';

describe('PhrasesService', () => {
  let service: PhrasesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PhrasesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('loads phrases', () => {
    expect(PhrasesService.loadEnglishWords().length).toBeGreaterThan(50000);
  });
});
