import { Module } from "@nestjs/common";
import { TournamentParticipantController } from "./api/tournament-participant.controller";
import { TournamentParticipantService } from "./api/tournament-participant.service";

@Module({
  controllers: [TournamentParticipantController],
  providers: [TournamentParticipantService],
})
export class TournamentParticipantModule {}
