import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  constructor() { }

  getKey(key:string) {
    return window.localStorage.getItem(key);
  }

  setKey(key:string, value:string) {
    window.localStorage.setItem(key, value);
  }

  findAllByPrefix(prefix:string) {
    var all = {};
    for (var i=0; i<window.localStorage.length; i++) {
        var key = window.localStorage.key(i);
        if (key && key.startsWith(prefix)) {
            var item = window.localStorage.getItem(key);
            var itemKey = key.replace(prefix,"");
            all[itemKey] = item;
        }
    }
    return all;
  }

  setCookie(cookieName:string, cookieValue:string, nDays:number) {
      var d = new Date();
      d.setTime(d.getTime() + (nDays*24*60*60*1000));
      var expires = "expires="+ d.toUTCString();
      document.cookie = cookieName + "=" + cookieValue + ";" + expires + ";path=/";
  }

  getCookie(cookieName:string) {
    var name = cookieName + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return null;
  }

  deleteCookie(cookieName) {
    this.setCookie(cookieName,'',-730);
  }

}
