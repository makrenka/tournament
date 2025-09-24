import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity()
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  userName: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: "int", default: 0 })
  totalPoints: number;
}
