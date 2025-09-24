import { forwardRef, Module } from "@nestjs/common";
import { TournamentController } from "./api/tournament.controller";
import { TournamentService } from "./api/tournament.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Tournament } from "./entities/tournament.entity";
import { TournamentParticipant } from "src/tournament-participant/entities/tournament-participant.entity";
import { Match } from "src/match/entities/match.entity";
import { User } from "src/user/entities/user.entity";
import { TournamentParticipantModule } from "src/tournament-participant/tournament-participant.module";

@Module({
  controllers: [TournamentController],
  providers: [TournamentService],
  imports: [
    TypeOrmModule.forFeature([Tournament]),
    forwardRef(() => TournamentParticipantModule),
  ],
  exports: [TournamentService],
})
export class TournamentModule {}
