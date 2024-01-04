import {BatchUpdateDocuments} from '../interfaces';
import {UploadStrategy} from './strategy';
import {uploadContentToFileContainer} from '../help/fileContainer';
import {URLBuilder} from '../help/urlUtils';
import {APICore} from '../APICore';
export interface FileContainerResponse {
  uploadUri: string;
  fileId: string;
  requiredHeaders: Record<string, string>;
}

/**
 * Upload documents using the [File container](https://docs.coveo.com/en/43/index-content/creating-a-file-container)
 *
 * @class FileContainerStrategy
 * @implements {UploadStrategy}
 */
export class FileContainerStrategy implements UploadStrategy {
  public constructor(
    private urlBuilder: URLBuilder,
    private api: APICore
  ) {}

  public async upload(batch: BatchUpdateDocuments) {
    const fileContainer = await this.createFileContainer();
    await uploadContentToFileContainer(fileContainer, batch);
    return this.pushFileContainerContent(fileContainer);
  }

  private async createFileContainer() {
    const fileContainerURL = this.urlBuilder.fileContainerUrl.toString();
    const res = await this.api.post<FileContainerResponse>(fileContainerURL);
    return res;
  }

  private pushFileContainerContent(fileContainer: FileContainerResponse) {
    const pushURL = this.urlBuilder.baseAPIURLForUpdate;
    pushURL.searchParams.append('fileId', fileContainer.fileId);
    return this.api.put(pushURL.toString(), undefined, false);
  }
}
