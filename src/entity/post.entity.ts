import { VirtualColumn } from '../virtual';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { LikeEntity } from './like.entity';

@Entity('sample_post')
export class PostEntity {
  @PrimaryGeneratedColumn()
  public readonly id: number;

  @Column()
  public title: string;

  @Column()
  public text: string;

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

      return queryBuilder;
    },
  })
  public likes: number;
}
