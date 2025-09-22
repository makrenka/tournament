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
    @InjectRepository(Tournament) private tourRepo: Repository<Tournament>,
    @InjectRepository(TournamentParticipant)
    private partRepo: Repository<TournamentParticipant>,
    @InjectRepository(Match) private matchRepo: Repository<Match>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private dataSource: DataSource
  ) {}

  async createTournament(name: string) {
    const t = this.tourRepo.create({ name });
    return this.tourRepo.save(t);
  }

  async joinTournament(tournamentId: string, userId: string) {
    const tour = await this.tourRepo.findOneByOrFail({ id: tournamentId });
    if (tour.status !== TournamentStatus.DRAFT) {
      throw new Error("Can only join draft tournaments");
    }
    const user = await this.userRepo.findOneByOrFail({ id: userId });
    const participant = this.partRepo.create({ tournament: tour, user });
    return this.partRepo.save(participant);
  }

  // helper: shuffle array
  private shuffle<T>(arr: T[]) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // points system (example) — first:100, second:60, third:40, others smaller
  private pointsForPlace(place: number) {
    if (place === 1) return 100;
    if (place === 2) return 60;
    if (place <= 4) return 40;
    if (place <= 8) return 20;
    return 5;
  }

  // main runner — synchronous simulation; wrapped in transaction for consistency
  async runTournament(tournamentId: string) {
    return this.dataSource.transaction(async (manager) => {
      const tour = await manager.findOne(Tournament, {
        where: { id: tournamentId },
      });
      if (!tour) throw new Error("Tournament not found");
      if (tour.status !== TournamentStatus.DRAFT)
        throw new Error("Tournament must be DRAFT to start");

      tour.status = TournamentStatus.RUNNING;
      await manager.save(tour);

      let participants = await manager.find(TournamentParticipant, {
        where: { tournament: { id: tour.id } },
        relations: ["user"],
      });

      // if not enough participants:
      if (participants.length < 2) {
        throw new Error("Need at least 2 participants");
      }

      // map of participantId -> place (to fill later)
      const finalPlaces = new Map<string, number>();
      let round = 1;
      let current = participants.slice(); // array of TournamentParticipant

      while (current.length > 1) {
        this.shuffle(current);
        const winners: TournamentParticipant[] = [];
        const matchesToSave: Match[] = [];

        for (let i = 0; i < current.length; i += 2) {
          const a = current[i];
          const b = current[i + 1];

          if (!b) {
            // bye -> automatic advance
            winners.push(a);
            continue;
          }

          // create match
          const match = manager.create(Match, {
            tournament: tour,
            participantA: a,
            participantB: b,
            round,
          });

          // choose random winner
          const chooseA = Math.random() < 0.5;
          match.winner = chooseA ? a : b;

          matchesToSave.push(match);
          winners.push(match.winner);
        }

        // save matches
        await manager.save(matchesToSave);

        // If this round produced losers that are eliminated, we can assign provisional places.
        // We'll determine places when players get eliminated; simpler approach: when tournament reduces to 1 winner,
        // assign final places by elimination round. For clarity, we will compute places as follows:
        // - Winner gets place 1 after tournament ends.
        // - Final opponent gets place 2.
        // - Semi-final losers get places 3-4, etc.
        // To compute this cleanly, we will keep track of eliminated participants per round.

        // Determine eliminated participants this round:
        const eliminated = [];
        for (const m of matchesToSave) {
          const loser =
            m.winner?.id === m.participantA.id
              ? m.participantB
              : m.participantA;
          eliminated.push(loser);
        }

        // assign provisional elimination round to eliminated players (we will translate to place at the end)
        // store round eliminated as metadata in their participant record (non-persistent field). We'll collect elimination info in a list.
        eliminated.forEach((p) => {
          (p as any)._eliminatedAtRound = round;
        });

        // participants for next round:
        current = winners;
        round++;
      }

      // now current.length === 1 -> winner
      const champion = current[0];

      // Collect all participants again to compute places:
      const allParticipants = await manager.find(TournamentParticipant, {
        where: { tournament: { id: tour.id } },
        relations: ["user"],
      });

      // We'll compute place by elimination round; players eliminated later have better place.
      // Build map participantId -> eliminatedRound. Winner has eliminatedRound = Infinity
      const eliminatedRoundMap = new Map<string, number>();
      // read matches from DB for this tournament to determine elimination rounds:
      const matches = await manager.find(Match, {
        where: { tournament: { id: tour.id } },
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
        user.totalPoints += pts;
        await manager.save(user);
        await manager.save(p);
      }

      // finalize tournament
      tour.status = TournamentStatus.FINISHED;
      await manager.save(tour);

      return {
        tournamentId: tour.id,
        championId: champion.user.id,
        places: sorted.map((s) => ({
          participantId: s.id,
          userId: s.user.id,
          place: s.place,
        })),
      };
    });
  }
}
