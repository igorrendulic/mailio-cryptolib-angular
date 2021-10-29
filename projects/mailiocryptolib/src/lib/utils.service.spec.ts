import { TestBed } from '@angular/core/testing';

import { UtilsService } from './utils.service';

describe('UtilsService', () => {
  let service: UtilsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UtilsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('filename test.txt should not be suspicious', () => {
    expect(UtilsService.isFilenameSuspicious('test.txt')).toBe(false);
  });

  it('filename test.zip should be suspicious', () => {
    expect(UtilsService.isFilenameSuspicious('test.zip')).toBe(true);
  });

  it('locastorage is supported', () => {
    expect(UtilsService.isLocalStorageSupported()).toBe(true);
  });

  it('isNull = true', () => {
    expect(UtilsService.isNull(null)).toBe(true);
  });

  it('isNotNull = false', () => {
    expect(UtilsService.isNotNull(null)).toBe(false);
  });

  it('IsEqualUint8Array = true', () => {
    expect(UtilsService.isEqualUint8Array(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true);
  });

  it('append Uint8 buffer', () => {
    expect(UtilsService.appendBuffer(new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6]))).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6]));
  });

  it('UInt8Array to string', () => {
    expect(UtilsService.Utf8ArrayToStr(new Uint8Array([77, 65, 73, 76]))).toEqual('MAIL');
  });
});
