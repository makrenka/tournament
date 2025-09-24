import { Tournament } from "src/tournament/entities/tournament.entity";
import { User } from "src/user/entities/user.entity";
import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  Unique,
  CreateDateColumn,
} from "typeorm";

@Entity()
@Unique(["tournament", "user"])
export class TournamentParticipant {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Tournament, { onDelete: "CASCADE" })
  tournament: Tournament;

  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" })
  user: User;

  @Column({ type: "int", nullable: true })
  place?: number;

  @CreateDateColumn()
  createdAt: Date;
}
