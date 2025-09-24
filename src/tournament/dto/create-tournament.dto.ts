import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";
import { IsRequired } from "utils/decorators/general";

export class CreateTournamentDto {
  @ApiProperty({
    description: "Name of the tournament.",
  })
  @IsString()
  @IsRequired()
  name: string;
}
