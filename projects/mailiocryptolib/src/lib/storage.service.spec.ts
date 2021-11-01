import { TestBed } from '@angular/core/testing';

import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('setting the key', () => {
    StorageService.setKey('test_1', 'test');
    StorageService.setKey('test_2', 'test');
    expect(StorageService.getKey('test_1')).toBe('test');
    expect(StorageService.getKey('test_2')).toBe('test');
  });

  it('find all keys by prefix', () => {
    StorageService.setKey('test_1', 'test_1');
    StorageService.setKey('test_2', 'test_2');
    expect(StorageService.findAllByPrefix('test_')).toEqual({1: 'test_1', 2: 'test_2'});
  });

  it('set the cookie', () => {
    StorageService.setCookie('test_1', 'test_1', 1);
    expect(StorageService.getCookie('test_1')).toBe('test_1');
  });

  it('delete cookie', () => {
    StorageService.setCookie('test_1', 'test_1', 1);
    StorageService.deleteCookie('test_1');
    expect(StorageService.getCookie('test_1')).toBeNull();
  });
});
