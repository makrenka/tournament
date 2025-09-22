import { Module } from "@nestjs/common";
import { TournamentController } from "./api/tournament.controller";
import { TournamentService } from "./api/tournament.service";

@Module({
  controllers: [TournamentController],
  providers: [TournamentService],
})
export class TournamentModule {}
