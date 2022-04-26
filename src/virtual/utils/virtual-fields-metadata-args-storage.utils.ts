import { EntitySchema, EntityTarget } from 'typeorm';
import { PlatformTools } from 'typeorm/platform/PlatformTools';
import { VirtualFieldsMetadataArgsStorage } from '../classes';
import { VirtualColumnMetadataInterface } from '../interfaces';

export function getVirtualFieldsMetadataArgsStorage(): VirtualFieldsMetadataArgsStorage {
  const globalScope = PlatformTools.getGlobalVariable();

  if (!globalScope.typeormVirtualFieldsMetadataArgsStorage) {
    globalScope.typeormVirtualFieldsMetadataArgsStorage =
      new VirtualFieldsMetadataArgsStorage();
  }

  return globalScope.typeormVirtualFieldsMetadataArgsStorage;
}

export function getVirtualFieldsMetadata<Entity>(
  entityClass: EntityTarget<Entity>,
): VirtualColumnMetadataInterface[] {
  return getVirtualFieldsMetadataArgsStorage().tables.filter((metadata) => {
    if (metadata.target === entityClass) {
      return true;
    }

    if (entityClass instanceof EntitySchema) {
      return (metadata.name = entityClass.options.name);
    }

    return false;
  });
}
