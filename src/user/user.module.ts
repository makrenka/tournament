import { Module } from "@nestjs/common";
import { UserController } from "./api/user.controller";
import { UserService } from "./api/user.service";

@Module({
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
