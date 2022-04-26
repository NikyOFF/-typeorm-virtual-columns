import { ObjectUtil } from './object.util';

export class VirtualColumnUtil {
  public static removeVirtualMetadataKeys(
    metadataKeys: Set<string>,
    read: object,
    write: object,
  ) {
    for (const key of Object.keys(read)) {
      if (!metadataKeys.has(key)) {
        continue;
      }

      ObjectUtil.setObjectPropertyByPath(write, key, read[key]);
      delete read[key];
    }
  }
}
