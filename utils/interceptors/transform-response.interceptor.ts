import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { IsNumber } from "class-validator";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, BaseResponseSuccess<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<BaseResponseSuccess<T>> {
    return next.handle().pipe(
      map((data) => ({
        statusCode: context.switchToHttp().getResponse().statusCode,
        data: data ? data : {},
      }))
    );
  }
}

export class BaseResponseSuccess<T> {
  @ApiProperty()
  @IsNumber()
  statusCode: number;

  data: T;
}
