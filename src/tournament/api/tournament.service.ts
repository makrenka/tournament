import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { Repository, DataSource } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { Tournament } from "../entities/tournament.entity";
import { TournamentParticipant } from "src/tournament-participant/entities/tournament-participant.entity";
import { Match } from "src/match/entities/match.entity";
import { User } from "src/user/entities/user.entity";
import { TournamentStatus } from "utils/enums/tournament.enum";
import { JoinTournamentDto } from "../dto/join-tournament.dto";
import { RunTournamentDto } from "../dto/run-tournament.dto";
import { TournamentParticipantService } from "src/tournament-participant/api/tournament-participant.service";
import { CreateTournamentDto } from "../dto/create-tournament.dto";

@Injectable()
export class TournamentService {
  constructor(
    @InjectRepository(Tournament)
    private readonly tournamentRepository: Repository<Tournament>,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => TournamentParticipantService))
    private readonly tournamentParticipantService: TournamentParticipantService
  ) {}

  createTournament = async (createTournamentDto: CreateTournamentDto) => {
    const tournament = this.tournamentRepository.create(createTournamentDto);
    return this.tournamentRepository.save(tournament);
  };

  getById = async (id: string): Promise<Tournament | null> =>
    this.tournamentRepository.findOneBy({ id });

  joinTournament = async (joinTournamentDto: JoinTournamentDto) =>
    await this.tournamentParticipantService.create(joinTournamentDto);

  runTournament = async (runTournamentDto: RunTournamentDto) =>
    this.dataSource.transaction(async (manager) => {
      const tournament = await manager.findOne(Tournament, {
        where: { id: runTournamentDto.tournamentId },
      });
      if (!tournament) throw new Error("Турнир не найден");
      if (tournament.status !== TournamentStatus.DRAFT)
        throw new Error("Турнир должен быть DRAFT, чтобы начаться");

      tournament.status = TournamentStatus.RUNNING;
      await manager.save(tournament);

      let participants = await manager.find(TournamentParticipant, {
        where: { tournament: { id: tournament.id } },
        relations: ["user"],
      });

      if (participants.length < 2) {
        throw new Error("Необходимо как минимум 2 участника");
      }

      let round = 1;
      let currentTournament = participants.slice();

      // Коллекция выбывших участников
      const eliminatedRoundMap = new Map<string, number>();

      // Места определяем по мере выбывания игроков, финальные места распределяются по раунду на выбывание.
      // Места рассчитываются следующим образом:
      // - Победитель получает 1-е место после окончания турнира.
      // - Финальный соперник получает 2-е место.
      // - Проигравшие в полуфинале занимают 3-4-е места и т. д.

      while (currentTournament.length > 1) {
        this.shuffle(currentTournament);
        const winners: TournamentParticipant[] = [];
        const matchesToSave: Match[] = [];

        for (let i = 0; i < currentTournament.length; i += 2) {
          const a = currentTournament[i];
          const b = currentTournament[i + 1];

          // если нет пары, первый участник проходит автоматически в следующий раунд
          if (!b) {
            winners.push(a);
            continue;
          }

          // создание матча
          const match = manager.create(Match, {
            tournament: tournament,
            participantA: a,
            participantB: b,
            round,
          });

          // выбор победителя
          const chooseA = Math.random() < 0.5;
          match.winner = chooseA ? a : b;

          matchesToSave.push(match);
          winners.push(match.winner);
        }

        await manager.save(matchesToSave);

        // Выбывшие участники в этом раунде:
        for (const match of matchesToSave) {
          const loser =
            match.winner?.id === match.participantA.id
              ? match.participantB
              : match.participantA;
          eliminatedRoundMap.set(loser.id, round);
        }

        // участники для следующего раунда:
        currentTournament = winners;
        round++;
      }

      // если currentTournament.length === 1, определился победитель
      const champion = currentTournament[0];

      // Все участники, чтобы определить места:
      const allParticipants = await manager.find(TournamentParticipant, {
        where: { tournament: { id: tournament.id } },
        relations: ["user"],
      });

      // Матчи для этого турнира, чтобы определить раунды на выбывание:
      const matches = await manager.find(Match, {
        where: { tournament: { id: tournament.id } },
        relations: ["participantA", "participantB", "winner"],
      });

      // Для каждого участника находим максимальный раунд, в котором он принял участие;
      // проигранный раунд — это тот, в котором он появился и не победитель.
      for (const participant of allParticipants) {
        eliminatedRoundMap.set(participant.id, 0);
      }

      for (const match of matches) {
        // Участники, не ставшие победителями в этом матче, выбывают на этом этапе
        const loser =
          match.winner?.id === match.participantA.id
            ? match.participantB
            : match.participantA;

        // проверяем есть ли уже запись с этим участником
        const previousEntry = eliminatedRoundMap.get(loser.id) ?? 0;

        // если есть - перезаписываем
        eliminatedRoundMap.set(loser.id, Math.max(previousEntry, match.round));
      }

      // для победителя ставим максимальное число
      eliminatedRoundMap.set(champion.id, Number.MAX_SAFE_INTEGER);

      // сортируем участников по выбыванию
      const sortedParticipants = allParticipants.slice().sort((a, b) => {
        const roundParticipantA = eliminatedRoundMap.get(a.id) ?? 0;
        const roundParticipantB = eliminatedRoundMap.get(b.id) ?? 0;

        // если участники выбыли в одном и том же раунде, сортируем по времени создания
        if (roundParticipantA === roundParticipantB)
          return a.createdAt.getTime() - b.createdAt.getTime();

        // если нет - по раунду, когда выбыли
        return roundParticipantB - roundParticipantA;
      });

      // назначаем места
      for (let i = 0; i < sortedParticipants.length; i++) {
        const participant = sortedParticipants[i];
        participant.place = i + 1;

        // начисляем баллы
        const points = this.pointsForPlace(i + 1);

        const user = await manager.findOne(User, {
          where: { id: participant.user.id },
        });

        if (!user)
          throw new Error(`Пользователь не найден: ${participant.user.id}`);

        user.totalPoints += points;
        await manager.save(user);
        await manager.save(participant);
      }

      // завершаем турнир
      tournament.status = TournamentStatus.FINISHED;
      await manager.save(tournament);

      return {
        tournamentId: tournament.id,
        championId: champion.user.id,
        places: sortedParticipants.map((participant) => ({
          participantId: participant.id,
          userId: participant.user.id,
          place: participant.place,
        })),
      };
    });

  private shuffle<T>(arr: T[]) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // система баллов — первое место: 100, второе место: 60, третье место: 40, остальные меньше
  private pointsForPlace(place: number) {
    if (place === 1) return 100;
    if (place === 2) return 60;
    if (place <= 4) return 40;
    if (place <= 8) return 20;
    return 5;
  }
}
