import {
  QueryBuilder,
  FindManyOptions,
  OptimisticLockVersionMismatchError,
  FindOptionsWhere,
  EntityMetadata,
  InstanceChecker,
  EntityPropertyNotFoundError,
  QueryRunner,
} from 'typeorm';
import { SelectQueryBuilder } from 'typeorm/query-builder/SelectQueryBuilder';
import {
  getVirtualFieldsMetadata,
  ObjectUtil,
  VirtualColumnUtil,
  VirtualColumnMetadataInterface,
  VIRTUAL_COLUMN_KEY,
} from './virtual';
import { DriverUtils } from 'typeorm/driver/DriverUtils';
import { ApplyValueTransformers } from 'typeorm/util/ApplyValueTransformers';

declare module 'typeorm' {
  interface SelectQueryBuilder<Entity> {
    setFindOptions<Entity>(findOptions: FindManyOptions<Entity>): this;
  }
}

SelectQueryBuilder.prototype.setFindOptions = function <Entity>(
  this: SelectQueryBuilder<unknown>,
  findOptions: FindManyOptions<Entity>,
) {
  const virtualColumnsMetadata = getVirtualFieldsMetadata(
    this.expressionMap.mainAlias.target,
  );

  if (
    typeof findOptions.order === 'object' &&
    !ObjectUtil.isEmpty(findOptions.order)
  ) {
    const orders = {};

    //removes virtual columns from findOptions.order and write them to order variable
    VirtualColumnUtil.removeVirtualMetadataKeys(
      new Set<string>(
        virtualColumnsMetadata.reduce(
          (previousValue, currentValue) => [
            ...previousValue,
            currentValue.name,
          ],
          [],
        ),
      ),
      findOptions.order,
      orders,
    );

    for (const order of Object.keys(orders)) {
      this.addOrderBy(order, orders[order]);
    }
  }

  this.findOptions = findOptions;
  this.applyFindOptions();
  return this;
};

SelectQueryBuilder.prototype['buildWhere'] = function <Entity>(
  this: SelectQueryBuilder<Entity>,
  where: FindOptionsWhere<any>,
  metadata: EntityMetadata,
  alias: string,
  embedPrefix?: string,
): string {
  let condition: string = '';

  if (Array.isArray(where)) {
    condition =
      '(' +
      where
        .map((whereItem) => {
          return this.buildWhere(whereItem, metadata, alias, embedPrefix);
        })
        .filter((condition) => !!condition)
        .map((condition) => '(' + condition + ')')
        .join(' OR ') +
      ')';
  } else {
    //#region INJECTED_CODE
    const virtualFields = {};

    const virtualFieldsMetadata = getVirtualFieldsMetadata(
      this.expressionMap.mainAlias.target,
    );

    const virtualFieldsMap = new Map<string, VirtualColumnMetadataInterface>(
      virtualFieldsMetadata.reduce(
        (previousValue, currentValue) => [
          ...previousValue,
          [currentValue.name, currentValue],
        ],
        [],
      ),
    );

    VirtualColumnUtil.removeVirtualMetadataKeys(
      new Set(
        virtualFieldsMetadata.reduce(
          (previousValue, currentValue) => [
            ...previousValue,
            currentValue.name,
          ],
          [],
        ),
      ),
      where,
      virtualFields,
    );
    //#endregion

    let andConditions: string[] = [];

    for (let key in where) {
      if (where[key] === undefined || where[key] === null) continue;

      const propertyPath = embedPrefix ? embedPrefix + '.' + key : key;
      const column = metadata.findColumnWithPropertyPathStrict(propertyPath);
      const embed = metadata.findEmbeddedWithPropertyPath(propertyPath);
      const relation = metadata.findRelationWithPropertyPath(propertyPath);

      if (!embed && !column && !relation)
        throw new EntityPropertyNotFoundError(propertyPath, metadata);

      if (column) {
        const aliasPath = `${alias}.${propertyPath}`;
        // const parameterName = alias + "_" + propertyPath.split(".").join("_") + "_" + parameterIndex;

        // todo: we need to handle other operators as well?
        let parameterValue = where[key];
        if (InstanceChecker.isEqualOperator(where[key])) {
          parameterValue = where[key].value;
        }
        if (column.transformer) {
          parameterValue = ApplyValueTransformers.transformTo(
            column.transformer,
            parameterValue,
          );
        }

        andConditions.push(
          this.createWhereConditionExpression(
            this.getWherePredicateCondition(aliasPath, parameterValue),
          ),
        );
      } else if (embed) {
        const condition = this.buildWhere(
          where[key],
          metadata,
          alias,
          propertyPath,
        );
        if (condition) andConditions.push(condition);
      } else if (relation) {
        // if all properties of where are undefined we don't need to join anything
        // this can happen when user defines map with conditional queries inside
        if (typeof where[key] === 'object') {
          const allAllUndefined = Object.keys(where[key]).every(
            (k) => where[key][k] === undefined,
          );
          if (allAllUndefined) {
            continue;
          }
        }

        if (InstanceChecker.isFindOperator(where[key])) {
          if (
            where[key].type === 'moreThan' ||
            where[key].type === 'lessThan'
          ) {
            const sqlOperator = where[key].type === 'moreThan' ? '>' : '<';
            // basically relation count functionality
            const qb: QueryBuilder<any> = this.subQuery();
            if (relation.isManyToManyOwner) {
              qb.select('COUNT(*)')
                .from(relation.joinTableName, relation.joinTableName)
                .where(
                  relation.joinColumns
                    .map((column) => {
                      return `${relation.joinTableName}.${
                        column.propertyName
                      } = ${alias}.${column.referencedColumn!.propertyName}`;
                    })
                    .join(' AND '),
                );
            } else if (relation.isManyToManyNotOwner) {
              qb.select('COUNT(*)')
                .from(
                  relation.inverseRelation!.joinTableName,
                  relation.inverseRelation!.joinTableName,
                )
                .where(
                  relation
                    .inverseRelation!.inverseJoinColumns.map((column) => {
                      return `${relation.inverseRelation!.joinTableName}.${
                        column.propertyName
                      } = ${alias}.${column.referencedColumn!.propertyName}`;
                    })
                    .join(' AND '),
                );
            } else if (relation.isOneToMany) {
              qb.select('COUNT(*)')
                .from(
                  relation.inverseEntityMetadata.target,
                  relation.inverseEntityMetadata.tableName,
                )
                .where(
                  relation
                    .inverseRelation!.joinColumns.map((column) => {
                      return `${relation.inverseEntityMetadata.tableName}.${
                        column.propertyName
                      } = ${alias}.${column.referencedColumn!.propertyName}`;
                    })
                    .join(' AND '),
                );
            } else {
              throw new Error(
                `This relation isn't supported by given find operator`,
              );
            }
            // this
            //     .addSelect(qb.getSql(), relation.propertyAliasName + "_cnt")
            //     .andWhere(this.escape(relation.propertyAliasName + "_cnt") + " " + sqlOperator + " " + parseInt(where[key].value));
            this.andWhere(
              qb.getSql() +
                ' ' +
                sqlOperator +
                ' ' +
                parseInt(where[key].value),
            );
          }
        } else {
          // const joinAlias = alias + "_" + relation.propertyName;
          let joinAlias = alias + '_' + relation.propertyPath.replace('.', '_');
          joinAlias = DriverUtils.buildAlias(
            this.connection.driver,
            { joiner: '__' },
            alias,
            joinAlias,
          );

          const existJoin = this.joins.find((join) => join.alias === joinAlias);
          if (!existJoin) {
            this.joins.push({
              type: 'inner',
              select: false,
              selection: undefined,
              alias: joinAlias,
              parentAlias: alias,
              relationMetadata: relation,
            });
          } else {
            if (existJoin.type === 'left') existJoin.type = 'inner';
          }

          const condition = this.buildWhere(
            where[key],
            relation.inverseEntityMetadata,
            joinAlias,
          );
          if (condition) {
            andConditions.push(condition);
            // parameterIndex = Object.keys(this.expressionMap.nativeParameters).length;
          }
        }
      }
    }

    //#region INJECTED_CODE
    for (const key of Object.keys(virtualFields)) {
      // let parameterValue = virtualFields[key];
      //
      // if (InstanceChecker.isEqualOperator(virtualFields[key])) {
      //   parameterValue = virtualFields[key].value;
      // }

      //TODO: work with operators;

      andConditions.push(
        this.createWhereConditionExpression(
          this.getWherePredicateCondition(
            `coalesce(${key}, ${virtualFieldsMap.get(key).defaultValue})`,
              virtualFields[key],
          ),
        ),
      );
    }
    //#endregion

    condition = andConditions.join(' AND ');
  }

  return condition;
};

function injectSolution(queryBuilder: SelectQueryBuilder<unknown>) {
  const virtualColumnsMetadata = getVirtualFieldsMetadata(
    queryBuilder.expressionMap.mainAlias.target,
  );

  for (const metadata of virtualColumnsMetadata) {
    metadata.apply(queryBuilder);
  }
}

SelectQueryBuilder.prototype['executeCountQuery'] = async function (
  this: SelectQueryBuilder<unknown>,
  queryRunner: QueryRunner,
): Promise<number> {
  injectSolution(this);

  const countSql = (this as any).computeCountExpression();

  const results = await this.clone()
    .orderBy()
    .groupBy()
    .offset(undefined)
    .limit(undefined)
    .skip(undefined)
    .take(undefined)
    .select(countSql, 'cnt')
    .setOption('disable-global-order')
    .loadRawResults(queryRunner);

  if (!results || !results[0] || !results[0]['cnt']) {
    return 0;
  }

  return parseInt(results[0]['cnt']);
};

SelectQueryBuilder.prototype.getMany = async function () {
  injectSolution(this);

  const { entities, raw } = await this.getRawAndEntities();

  const items = entities.map((entity, index) => {
    const metaInfo = Reflect.getMetadata(VIRTUAL_COLUMN_KEY, entity) ?? {};
    const item = raw[index];

    for (const [
      propertyKey,
      options,
    ] of Object.entries<VirtualColumnMetadataInterface>(metaInfo)) {
      entity[propertyKey] = item[options.name];
    }

    return entity;
  });

  return [...items];
};

SelectQueryBuilder.prototype.getOne = async function () {
  injectSolution(this);

  const results = await this.getRawAndEntities();
  const result = results.entities[0] as any;

  if (
    result &&
    this.expressionMap.lockMode === 'optimistic' &&
    this.expressionMap.lockVersion
  ) {
    const metadata = this.expressionMap.mainAlias!.metadata;

    if (this.expressionMap.lockVersion instanceof Date) {
      const actualVersion = metadata.updateDateColumn!.getEntityValue(result); // what if columns arent set?
      if (actualVersion.getTime() !== this.expressionMap.lockVersion.getTime())
        throw new OptimisticLockVersionMismatchError(
          metadata.name,
          this.expressionMap.lockVersion,
          actualVersion,
        );
    } else {
      const actualVersion = metadata.versionColumn!.getEntityValue(result); // what if columns arent set?
      if (actualVersion !== this.expressionMap.lockVersion)
        throw new OptimisticLockVersionMismatchError(
          metadata.name,
          this.expressionMap.lockVersion,
          actualVersion,
        );
    }
  }

  if (result === undefined) {
    return null;
  }

  const metaInfo = Reflect.getMetadata(VIRTUAL_COLUMN_KEY, result) ?? {};

  for (const [
    propertyKey,
    options,
  ] of Object.entries<VirtualColumnMetadataInterface>(metaInfo)) {
    result[propertyKey] = results.raw[0][options.name];
  }

  return result;
};
