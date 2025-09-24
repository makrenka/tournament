import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "../entities/user.entity";
import { Repository } from "typeorm";
import { ResponseUsersDto } from "../dto/response-users.dto";
import { CreateUserDto } from "../dto/create-user.dto";

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>
  ) {}

  create = async (createUserDto: CreateUserDto): Promise<User> => {
    const user = this.userRepository.create(createUserDto);
    return this.userRepository.save(user);
  };

  getById = async (id: string): Promise<User | null> =>
    this.userRepository.findOneBy({ id });

  getGlobalLeaderboard = async (limit = 50): Promise<ResponseUsersDto[]> =>
    this.userRepository
      .createQueryBuilder("user")
      .orderBy("user.totalPoints", "DESC")
      .limit(limit)
      .getMany();
}
