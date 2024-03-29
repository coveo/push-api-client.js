export type Recordable<T> = {
  [K in keyof T]: T[K];
};

export class CaseInsensitiveDocument<T> {
  private _originalDocument: Record<string, T> = {};
  private _remainingRecord: Record<string, T> = {};

  public constructor(doc: Record<string, T>) {
    this._originalDocument = this.shallowCopy(doc);

    Object.entries(doc).forEach(([k, v]) => {
      this._remainingRecord[k.toLowerCase()] = v;
    });
  }

  public remove(...keys: string[]) {
    keys.forEach((key) => {
      delete this._remainingRecord[key.toLowerCase()];
    });
  }

  public getRecordValue(key: string) {
    return this._remainingRecord[key.toLowerCase()];
  }

  public get remainingRecord(): Readonly<Record<string, T>> {
    return this._remainingRecord;
  }

  public get originalDocument(): Readonly<Record<string, T>> {
    return this._originalDocument;
  }

  private shallowCopy(sourceRecord: Record<string, T>) {
    return Object.assign({}, sourceRecord);
  }
}
