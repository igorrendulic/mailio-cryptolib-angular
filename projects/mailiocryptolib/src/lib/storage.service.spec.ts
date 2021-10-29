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
    service.setKey('test_1', 'test');
    service.setKey('test_2', 'test');
    expect(service.getKey('test_1')).toBe('test');
    expect(service.getKey('test_2')).toBe('test');
  });

  it('find all keys by prefix', () => {
    service.setKey('test_1', 'test_1');
    service.setKey('test_2', 'test_2');
    expect(service.findAllByPrefix('test_')).toEqual({1: 'test_1', 2: 'test_2'});
  });

  it('set the cookie', () => {
    service.setCookie('test_1', 'test_1', 1);
    expect(service.getCookie('test_1')).toBe('test_1');
  });

  it('delete cookie', () => {
    service.setCookie('test_1', 'test_1', 1);
    service.deleteCookie('test_1');
    expect(service.getCookie('test_1')).toBeNull();
  });
});
