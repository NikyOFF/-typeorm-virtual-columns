import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sample_user')
export class UserEntity {
  @PrimaryGeneratedColumn()
  public readonly id: number;

  @Column({ unique: true })
  public login: string;

  @Column()
  public password: string;
}
