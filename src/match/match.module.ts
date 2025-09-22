import { Module } from "@nestjs/common";
import { MatchController } from "./api/match.controller";
import { MatchService } from "./api/match.service";

@Module({
  controllers: [MatchController],
  providers: [MatchService],
})
export class MatchModule {}
