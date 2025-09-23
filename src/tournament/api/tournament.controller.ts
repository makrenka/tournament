import { Controller, Post, Body, Param, Get } from "@nestjs/common";
import { TournamentService } from "./tournament.service";

@Controller("tournaments")
export class TournamentController {
  constructor(private tournamentService: TournamentService) {}

  @Post()
  async create(@Body("name") name: string) {
    return this.tournamentService.createTournament(name);
  }

  @Post(":id/join")
  async join(@Param("id") id: string, @Body("userId") userId: string) {
    return this.tournamentService.joinTournament(id, userId);
  }

  @Post(":id/run")
  async run(@Param("id") id: string) {
    return this.tournamentService.runTournament(id);
  }

  // simple leaderboard endpoint: top users by totalPoints
  @Get("leaderboard")
  async leaderboard() {
    return this.tournamentService.getGlobalLeaderboard(); // реализуйте в сервисе на основе User.totalPoints
  }
}
