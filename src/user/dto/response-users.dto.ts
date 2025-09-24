import { ApiProperty } from "@nestjs/swagger";

export class ResponseUsersDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userName: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  totalPoints: number;
}
