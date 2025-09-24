import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";
import { IsRequired } from "utils/decorators/general";

export class CreateUserDto {
  @ApiProperty({
    description: "Name of the user.",
  })
  @IsString()
  @IsRequired()
  userName: string;
}
