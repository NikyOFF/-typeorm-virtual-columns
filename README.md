<div align="center">
  <a href="http://typeorm.io/">
    <img src="https://github.com/typeorm/typeorm/raw/master/resources/logo_big.png" width="492" height="228">
  </a>
  <br>
  <br>
	<a href="https://app.circleci.com/pipelines/github/typeorm/typeorm">
		<img src="https://circleci.com/gh/typeorm/typeorm/tree/master.svg?style=shield">
	</a>
	<a href="https://badge.fury.io/js/typeorm">
		<img src="https://badge.fury.io/js/typeorm.svg">
	</a>
    <a href="https://codecov.io/gh/typeorm/typeorm">
        <img alt="Codecov" src="https://img.shields.io/codecov/c/github/typeorm/typeorm.svg">
    </a>
	<a href="https://join.slack.com/t/typeorm/shared_invite/zt-uu12ljeb-OH_0086I379fUDApYJHNuw">
		<img src="https://img.shields.io/badge/chat-on%20slack-blue.svg">
	</a>
  <br>
  <br>
</div>

## Description
[Virtual column](https://en.wikipedia.org/wiki/Virtual_column) solution for [TypeORM](https://typeorm.io/)

## Example usage
We can access to out column when have **VirtualColumn** decorator.

This solution applies sides effect for queryBuilder in runtime

For example we have PostEntity with virtual likes column

```ts
@Entity()
export class PostEntity {
    @VirtualColumn({
        name: 'likes',
        defaultValue: 0,
        apply: (queryBuilder) => {
            queryBuilder.addSelect('coalesce(virtual_likes.likes, 0)::int', `likes`);

            queryBuilder.leftJoin(
                (queryBuilder) => {
                    return queryBuilder
                        .addSelect('post_id', 'id')
                        .addSelect('count(*)', 'likes')
                        .from(LikeEntity, 'like')
                        .groupBy('id');
                },
                'virtual_likes',
                `${queryBuilder.alias}.id = virtual_likes.id`,
            );
        },
    })
    public likes: number;
}
```

Or something easier

```ts
@Entity()
export class PersonEntity {
    @Column()
    public firstname: string;

    @Column()
    public lastname: string;

    @VirtualColumn({
        name: 'fullname',
        defaultValue: '',
        apply: (queryBuilder) => {
            queryBuilder.mainAlias.
            
            queryBuilder.addSelect(`CONCAT(${queryBuilder.alias}.firstname, ' ', ${queryBuilder.alias}.lastname)`, 'fullname');
        },
    })
    public fullname: string;
}
```
