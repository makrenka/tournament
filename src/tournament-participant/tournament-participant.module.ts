import { forwardRef, Module } from "@nestjs/common";
import { TournamentParticipantController } from "./api/tournament-participant.controller";
import { TournamentParticipantService } from "./api/tournament-participant.service";
import { TournamentModule } from "src/tournament/tournament.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TournamentParticipant } from "./entities/tournament-participant.entity";
import { UserModule } from "src/user/user.module";

@Module({
  controllers: [TournamentParticipantController],
  providers: [TournamentParticipantService],
  imports: [
    TypeOrmModule.forFeature([TournamentParticipant]),
    forwardRef(() => TournamentModule),
    UserModule,
  ],
  exports: [TournamentParticipantService],
})
export class TournamentParticipantModule {}
