import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';

export interface VirtualColumnMetadataInterface extends ObjectLiteral {
  apply: <T>(queryBuilder: SelectQueryBuilder<T>) => void;
  name?: string;
  defaultValue?: any;
  target?: object;
}
