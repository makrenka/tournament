import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { UserModule } from "./user/user.module";
import { TournamentModule } from "./tournament/tournament.module";
import { TournamentParticipantModule } from "./tournament-participant/tournament-participant.module";
import { MatchModule } from "./match/match.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ".env",
    }),
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.POSTGRES_HOST,
      port: Number(process.env.POSTGRES_HOST),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      entities: [__dirname + "/**/*.entity{.ts,.js}"],
      synchronize: true,
      logging: true,
    }),
    UserModule,
    TournamentModule,
    TournamentParticipantModule,
    MatchModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
