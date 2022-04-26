import 'reflect-metadata';
import { VirtualColumnMetadataInterface } from '../interfaces';
import { getVirtualFieldsMetadataArgsStorage } from '../utils/virtual-fields-metadata-args-storage.utils';

export const VIRTUAL_COLUMN_KEY = Symbol('VIRTUAL_COLUMN_KEY');

export function VirtualColumn(
  options: VirtualColumnMetadataInterface,
): PropertyDecorator {
  return (target, propertyKey) => {
    const metadata = Reflect.getMetadata(VIRTUAL_COLUMN_KEY, target) || {};

    options.target = target.constructor;
    options.name = options.name || propertyKey.toString();

    metadata[propertyKey] = options;

    Reflect.defineMetadata(VIRTUAL_COLUMN_KEY, metadata, target);
    getVirtualFieldsMetadataArgsStorage().tables.push(options);
  };
}
