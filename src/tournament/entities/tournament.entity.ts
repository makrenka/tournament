import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";
import { TournamentStatus } from "utils/enums/tournament.enum";

@Entity()
export class Tournament {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column({
    type: "enum",
    enum: TournamentStatus,
    default: TournamentStatus.DRAFT,
  })
  status: TournamentStatus;

  @CreateDateColumn()
  createdAt: Date;

  // optional metadata
  @Column({ type: "json", nullable: true })
  meta?: any;
}
