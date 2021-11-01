import { Injectable } from '@angular/core'
import { StorageService } from './storage.service';
import { UtilsService } from './utils.service';

@Injectable({
  providedIn: 'root'
})
export class PhrasesService {

  static phrasesUrl = 'https://raw.githubusercontent.com/igorrendulic/mailio-cryptolib-angular/master/assets/english_phrases.txt';
  static phrasesKey = 'mailio_eng_phrases';

  constructor() {}

  static loadEnglishWords(): string[] {
    let ret:string[] = [];

    const hasPhrases = StorageService.getKey(PhrasesService.phrasesKey);
    if (UtilsService.isNotNull(hasPhrases)) {
      const ret:string[] = hasPhrases!.split(',');
      return ret;
    }

    var request = new XMLHttpRequest();
    request.open('GET', PhrasesService.phrasesUrl, false); // synchronous call
    request.send(null);

    if (request.status === 200) {
      console.log('did it go here?');
      ret = request.responseText.split(',');
      StorageService.setKey(PhrasesService.phrasesKey, request.responseText);
      return ret;
    }
    else {
      console.error('Error loading phrases: ' + request.statusText);
    }
    return ret;
  }
}
