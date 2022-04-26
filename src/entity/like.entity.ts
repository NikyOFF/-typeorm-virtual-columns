import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import { PostEntity } from './post.entity';

@Entity('sample_like')
export class LikeEntity {
  @PrimaryColumn({ name: 'user_id' })
  public readonly userId: string;

  @PrimaryColumn({ name: 'post_id' })
  public readonly postId: string;

  @ManyToOne(() => UserEntity, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  public user: UserEntity;

  @ManyToOne(() => PostEntity, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'post_id' })
  public post: PostEntity;
}
