import * as nacl from "tweetnacl";

export interface MailioKeyPairs {
  boxKeyPair: nacl.BoxKeyPair,
  signKeyPair:nacl.SignKeyPair,
}
