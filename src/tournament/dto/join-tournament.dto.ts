import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";
import { IsRequired } from "utils/decorators/general";

export class JoinTournamentDto {
  @ApiProperty({
    description: "Tournament ID",
    example: "8e89c3ec-938d-4b6c-9138-3ced55d1d0d7",
  })
  @IsUUID()
  @IsRequired()
  tournamentId: string;

  @ApiProperty({
    description: "User ID",
    example: "8e89c3ec-938d-4b6c-9138-3ced55d1d0d7",
  })
  @IsUUID()
  @IsRequired()
  userId: string;
}
