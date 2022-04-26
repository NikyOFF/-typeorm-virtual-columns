import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import {VirtualColumn} from "../virtual";

@Entity('sample_user')
export class UserEntity {
  @PrimaryGeneratedColumn()
  public readonly id: number;

  @Column({ unique: true })
  public login: string;

  @Column()
  public password: string;

  @Column()
  public firstname: string;

  @Column()
  public lastname: string;

  @VirtualColumn({
    name: 'fullname',
    defaultValue: '',
    apply: (queryBuilder) => {
      queryBuilder.addSelect(`CONCAT(${queryBuilder.alias}.firstname, ' ', ${queryBuilder.alias}.lastname)`, 'fullname');
    },
  })
  public fullname: string;
}
