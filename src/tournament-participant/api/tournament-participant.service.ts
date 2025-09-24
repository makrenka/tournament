import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";

import { TournamentParticipant } from "../entities/tournament-participant.entity";
import { CreateTournamentParticipantDto } from "../dto/create-tournament-participant.dto";
import { TournamentService } from "src/tournament/api/tournament.service";
import { TournamentStatus } from "utils/enums/tournament.enum";
import { UserService } from "src/user/api/user.service";

@Injectable()
export class TournamentParticipantService {
  constructor(
    @InjectRepository(TournamentParticipant)
    private readonly tournamentParticipantRepository: Repository<TournamentParticipant>,
    private readonly tournamentService: TournamentService,
    private readonly userService: UserService
  ) {}

  create = async (
    createTournamentParticipantDto: CreateTournamentParticipantDto
  ): Promise<TournamentParticipant> => {
    const tournament = await this.tournamentService.getById(
      createTournamentParticipantDto.userId
    );
    if (!tournament) throw new Error("Турнир не найден");
    if (tournament.status !== TournamentStatus.DRAFT) {
      throw new Error("Можно присоединиться только к турнирам DRAFT");
    }

    const user = await this.userService.getById(
      createTournamentParticipantDto.userId
    );
    if (!user) throw new Error("Пользователь не найден");

    return this.tournamentParticipantRepository.create({
      tournament,
      user,
    });
  };
}
