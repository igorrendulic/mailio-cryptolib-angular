import { Injectable } from '@angular/core';
import * as naclstream from 'nacl-stream';

@Injectable({
  providedIn: 'root'
})
export class UtilsService {

  constructor() { }

  static isFilenameSuspicious(filename:string) {
    var suspicious = [
        'exe', 'scr', 'url', 'com', 'pif', 'bat',
        'xht', 'htm', 'html', 'xml', 'xhtml', 'js',
        'sh', 'svg', 'gadget', 'msi', 'msp', 'hta',
        'cpl', 'msc', 'jar', 'cmd', 'vb', 'vbs',
        'jse', 'ws', 'wsf', 'wsc', 'wsh', 'ps1',
        'ps2', 'ps1xml', 'ps2xml', 'psc1', 'scf', 'lnk',
        'inf', 'reg', 'doc', 'xls', 'ppt', 'pdf',
        'swf', 'fla', 'docm', 'dotm', 'xlsm', 'xltm',
        'xlam', 'pptm', 'potm', 'ppam', 'ppsm', 'sldm',
        'dll', 'dllx', 'rar', 'zip', '7z', 'gzip',
        'gzip2', 'tar', 'fon', 'svgz', 'jnlp'
    ]
    var extension = filename.toLowerCase().match(/\.\w+$/)
    if (!extension) {
        return true
    }
    const out = extension[0].substring(1)
    return (suspicious.indexOf(out) >= 0)
}

static isLocalStorageSupported() {
    var mod = "mailiolstest";
    try {
        window.localStorage.setItem(mod, mod);
        window.localStorage.removeItem(mod);
        return true;
    } catch(e) {
        return false;
    }
}

static isNull(v:any) {
    if (typeof v === 'undefined' || v === null) {
        return true;
    }
    return false;
}

static isNotNull(v:any) {
    return !this.isNull(v);
}

static isAnyNull(...list:any[]) {
    for (let val of list) {
        if (this.isNull(val)) {
            return true;
        }
    }
    return false;
}

static httpGet(url:string) {
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        // xhr.responseType = 'arraybuffer';
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    resolve(xhr.response);
                } else {
                reject("Fetch failed: " + xhr.status);
                }
            }
        };

        xhr.onerror = function (xhr) {
            reject('Transport error: ' + this.responseText);
        };

        xhr.open('GET', url);
        xhr.send();
    });
}

static httpDownload(url:string) {
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.responseType = 'blob';
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    resolve(xhr.response);
                } else {
                reject("Fetch failed: " + xhr.status);
                }
            }
        };

        xhr.onerror = function (xhr) {
            reject('Transport error: ' + this.responseText);
        };

        xhr.open('GET', url);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
        xhr.send();
    });
}

static getFileBuffer(fileData:Blob) {
    const temporaryFileReader = new FileReader();
    return new Promise( (resolve, reject) => {
        temporaryFileReader.onerror = () => {
            temporaryFileReader.abort();
            reject(new DOMException("Problem parsing input file."));
            };

        temporaryFileReader.onload = function() {
            var arrayBuffer:any = temporaryFileReader.result;
            var bytes = new Uint8Array(arrayBuffer);
            resolve(bytes);
        }
        temporaryFileReader.readAsArrayBuffer(fileData);
    });
}

static getFileText(fileData:any) {
    const temporaryFileReader = new FileReader();
    return new Promise( (resolve, reject) => {
        temporaryFileReader.onerror = () => {
            temporaryFileReader.abort();
            reject(new DOMException("Problem parsing input file."));
            };

        temporaryFileReader.onload = function() {
            var res = temporaryFileReader.result;
            resolve(res);
        }
        temporaryFileReader.readAsText(fileData);
    });
}

static nextChunk(blob:any, position:number, nextChunkSize:any) {
    var isLast = false;
    var chunk;
    if (nextChunkSize === -1) {
        if (position+2 >= blob.size) {
            Error('blob is too short');
            return;
        }
        var data = blob.slice(position,position+4);
        var nextChunkSize = naclstream.readChunkLength(data);
        position = 4;
        return {'chunk':null, 'position':position, 'nextChunkSize':nextChunkSize, 'isLast':isLast};
    } else {
        var end = position + nextChunkSize + 16 /* tag */ + 4 /* length */;
        if (end >= blob.byteLength) {
            end = blob.byteLength;
            isLast = true;
        }
        var chunk = blob.slice(position-4,end);
        if (!isLast) {
            nextChunkSize = naclstream.readChunkLength(chunk);
                // Slice the length off.
            chunk = chunk.subarray(0, chunk.length-4);
        } else {
            nextChunkSize = 0;
        }
        position = end;
    }
    return {'chunk':chunk, 'position':position, 'nextChunkSize':nextChunkSize, 'isLast':isLast};
}

static isEqualUint8Array(buf1:Uint8Array,buf2:Uint8Array) {
    if (buf1 === buf2) {
        return true;
    }
    if (buf1.byteLength !== buf2.byteLength) {
        return false;
    }
    var i = buf1.byteLength;
    while (i--) {
        if (buf1[i] !== buf2[i]) {
            return false;
        }
    }

    return true;
}

static appendBuffer(buffer1:Uint8Array,buffer2:Uint8Array) {
    var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp;
}

static Utf8ArrayToStr(array:any) {
    var out, i, len, c;
    var char2, char3;

    out = "";
    len = array.length;
    i = 0;
    while(i < len) {
    c = array[i++];
    switch(c >> 4)
    {
      case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
        // 0xxxxxxx
        out += String.fromCharCode(c);
        break;
      case 12: case 13:
        // 110x xxxx   10xx xxxx
        char2 = array[i++];
        out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
        break;
      case 14:
        // 1110 xxxx  10xx xxxx  10xx xxxx
        char2 = array[i++];
        char3 = array[i++];
        out += String.fromCharCode(((c & 0x0F) << 12) |
                       ((char2 & 0x3F) << 6) |
                       ((char3 & 0x3F) << 0));
        break;
    }
    }

    return out;
}

// static strToUtf8Array(str) {
//     const result = new Uint8Array(str.length);
//     for (let i = 0; i < str.length; i++) {
//         result[i] = str.charCodeAt(i);
//     }
//     return result;
// }
}
