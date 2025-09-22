import { TournamentParticipant } from "src/tournament-participant/entities/tournament-participant.entity";
import { Tournament } from "src/tournament/entities/tournament.entity";
import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity()
export class Match {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Tournament, { onDelete: "CASCADE" })
  tournament: Tournament;

  @ManyToOne(() => TournamentParticipant, { nullable: false, eager: true })
  participantA: TournamentParticipant;

  @ManyToOne(() => TournamentParticipant, { nullable: false, eager: true })
  participantB: TournamentParticipant;

  @ManyToOne(() => TournamentParticipant, { nullable: true, eager: true })
  winner?: TournamentParticipant;

  @Column({ type: "int" })
  round: number; // 1,2,...

  @CreateDateColumn()
  createdAt: Date;
}
