import {isNullOrUndefined, PrimitivesValues} from '@coveo/bueno';
import {CaseInsensitiveDocument} from './caseInsensitiveDocument';

export class KnownKeys<T extends PrimitivesValues> {
  private keys: string[];
  public constructor(
    k: string | string[],
    private doc: CaseInsensitiveDocument<PrimitivesValues>
  ) {
    if (Array.isArray(k)) {
      this.keys = k;
    } else {
      this.keys = [k];
    }
  }

  public get value() {
    const found = this.keys.find(
      (k) => !isNullOrUndefined(this.doc.remainingRecord[k.toLowerCase()])
    );
    if (found) {
      return this.doc.remainingRecord[found.toLowerCase()];
    }

    return null;
  }

  public whenExists<U = T>(cb: (v: U) => void) {
    const value = this.value;
    if (!isNullOrUndefined(value)) {
      cb(value as U);
    }
    return this;
  }

  public whenDoesNotExist<U = T>(cb: (v: U) => void) {
    const value = this.value;
    if (isNullOrUndefined(value)) {
      cb(this.doc.remainingRecord as U);
    }
    return this;
  }
}
