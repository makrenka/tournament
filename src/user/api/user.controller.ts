import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiOperation } from "@nestjs/swagger";
import { ApiResponseSuccess } from "utils/decorators/api-response-success.decorator";
import { UserService } from "./user.service";
import { ResponseUsersDto } from "../dto/response-users.dto";
import { CreateUserDto } from "../dto/create-user.dto";

@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: "Create user" })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get("leaderboard")
  @ApiResponseSuccess(ResponseUsersDto)
  @ApiOperation({ summary: "Get users in order of points scored" })
  async leaderboard() {
    return this.userService.getGlobalLeaderboard();
  }
}
