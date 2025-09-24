import { Controller, Post, Body, Get } from "@nestjs/common";
import { TournamentService } from "./tournament.service";
import { CreateTournamentDto } from "../dto/create-tournament.dto";
import { JoinTournamentDto } from "../dto/join-tournament.dto";
import { RunTournamentDto } from "../dto/run-tournament.dto";
import { ApiOperation } from "@nestjs/swagger";

@Controller("tournaments")
export class TournamentController {
  constructor(private readonly tournamentService: TournamentService) {}

  @Post()
  @ApiOperation({ summary: "Create tournament" })
  async create(@Body() createTournamentDto: CreateTournamentDto) {
    return this.tournamentService.createTournament(createTournamentDto);
  }

  @Post("join")
  @ApiOperation({ summary: "Join participants to the tournament" })
  async join(@Body() joinTournamentDto: JoinTournamentDto) {
    return this.tournamentService.joinTournament(joinTournamentDto);
  }

  @Post("run")
  @ApiOperation({ summary: "Run tournament" })
  async run(@Body() runTournamentDto: RunTournamentDto) {
    return this.tournamentService.runTournament(runTournamentDto);
  }
}
