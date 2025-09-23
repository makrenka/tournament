import { Injectable } from "@nestjs/common";
import { Repository, DataSource } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { Tournament } from "../entities/tournament.entity";
import { TournamentParticipant } from "src/tournament-participant/entities/tournament-participant.entity";
import { Match } from "src/match/entities/match.entity";
import { User } from "src/user/entities/user.entity";
import { TournamentStatus } from "utils/enums/tournament.enum";

@Injectable()
export class TournamentService {
  constructor(
    @InjectRepository(Tournament)
    private tournamentRepository: Repository<Tournament>,
    @InjectRepository(TournamentParticipant)
    private tournamentParticipantRepository: Repository<TournamentParticipant>,
    @InjectRepository(Match) private matchRepository: Repository<Match>,
    @InjectRepository(User) private userRepository: Repository<User>,
    private dataSource: DataSource
  ) {}

  async createTournament(name: string) {
    const tournament = this.tournamentRepository.create({ name });
    return this.tournamentRepository.save(tournament);
  }

  async joinTournament(tournamentId: string, userId: string) {
    const tournament = await this.tournamentRepository.findOneByOrFail({
      id: tournamentId,
    });
    if (tournament.status !== TournamentStatus.DRAFT) {
      throw new Error("Можно присоединиться только к турнирам DRAFT");
    }
    const user = await this.userRepository.findOneByOrFail({ id: userId });
    const participant = this.tournamentParticipantRepository.create({
      tournament: tournament,
      user,
    });
    return this.tournamentParticipantRepository.save(participant);
  }

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

  async runTournament(tournamentId: string) {
    return this.dataSource.transaction(async (manager) => {
      const tournament = await manager.findOne(Tournament, {
        where: { id: tournamentId },
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

      const finalPlaces = new Map<string, number>();
      let round = 1;
      let currentTournament = participants.slice();

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

        // Определяем места по мере выбывания игроков, финальные места распределяются по раунду на выбывание.
        // Места будем рассчитывать следующим образом:
        // - Победитель получает 1-е место после окончания турнира.
        // - Финальный соперник получает 2-е место.
        // - Проигравшие в полуфинале занимают 3-4-е места и т. д.

        // Выбывшие участники в этом раунде:
        const dropout: TournamentParticipant[] = [];
        for (const match of matchesToSave) {
          const loser =
            match.winner?.id === match.participantA.id
              ? match.participantB
              : match.participantA;
          dropout.push(loser);
        }

        // назначить предварительный раунд на выбывание выбывшим игрокам (мы переведем его в финальное место)
        // сохранить раунд, в котором выбывшие игроки участвуют, в виде метаданных в их записях об участниках (непостоянное поле).
        // Мы будем собирать информацию об выбывших игроках в виде списка.
        dropout.forEach((p) => {
          (p as any)._eliminatedAtRound = round;
        });

        // participants for next round:
        currentTournament = winners;
        round++;
      }

      // now currentTournament.length === 1 -> winner
      const champion = currentTournament[0];

      // Collect all participants again to compute places:
      const allParticipants = await manager.find(TournamentParticipant, {
        where: { tournament: { id: tournament.id } },
        relations: ["user"],
      });

      // We'll compute place by elimination round; players eliminated later have better place.
      // Build map participantId -> eliminatedRound. Winner has eliminatedRound = Infinity
      const eliminatedRoundMap = new Map<string, number>();
      // read matches from DB for this tournament to determine elimination rounds:
      const matches = await manager.find(Match, {
        where: { tournament: { id: tournament.id } },
        relations: ["participantA", "participantB", "winner"],
      });
      // For each participant, find the max round they played; the round they lost is the one where they appeared and != winner
      for (const p of allParticipants) {
        eliminatedRoundMap.set(p.id, 0); // default
      }
      for (const m of matches) {
        // participants who are not winner in this match are eliminated at this round (if not already eliminated earlier)
        const loser =
          m.winner?.id === m.participantA.id ? m.participantB : m.participantA;
        const prev = eliminatedRoundMap.get(loser.id) ?? 0;
        eliminatedRoundMap.set(loser.id, Math.max(prev, m.round));
      }
      // champion never lost -> set to very large
      eliminatedRoundMap.set(champion.id, Number.MAX_SAFE_INTEGER);

      // Now order participants by eliminatedRound descending (larger = lasted longer)
      const sorted = allParticipants.slice().sort((a, b) => {
        const ra = eliminatedRoundMap.get(a.id) ?? 0;
        const rb = eliminatedRoundMap.get(b.id) ?? 0;
        if (ra === rb) return a.createdAt.getTime() - b.createdAt.getTime(); // deterministic
        return rb - ra; // descending
      });

      // assign places 1..N
      for (let i = 0; i < sorted.length; i++) {
        const p = sorted[i];
        p.place = i + 1;
        // award points to user
        const pts = this.pointsForPlace(i + 1);
        // increment user's totalPoints
        const user = await manager.findOne(User, { where: { id: p.user.id } });

        if (!user) throw new Error(`User not found: ${p.user.id}`);

        user.totalPoints += pts;
        await manager.save(user);
        await manager.save(p);
      }

      // finalize tournament
      tournament.status = TournamentStatus.FINISHED;
      await manager.save(tournament);

      return {
        tournamentId: tournament.id,
        championId: champion.user.id,
        places: sorted.map((s) => ({
          participantId: s.id,
          userId: s.user.id,
          place: s.place,
        })),
      };
    });
  }

  async getGlobalLeaderboard(limit = 50) {
    return this.userRepository
      .createQueryBuilder("user")
      .orderBy("user.totalPoints", "DESC")
      .limit(limit)
      .getMany();
  }
}
