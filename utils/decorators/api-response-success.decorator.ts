import { applyDecorators, Type } from "@nestjs/common";
import { ApiExtraModels, ApiResponse, getSchemaPath } from "@nestjs/swagger";
import { BaseResponseSuccess } from "utils/interceptors/transform-response.interceptor";

export const ApiResponseSuccess = <DataDto extends Type<object>>(
  dataDto?: DataDto,
  statusCode: number = 200
) =>
  dataDto
    ? applyDecorators(
        ApiExtraModels(BaseResponseSuccess, dataDto),
        ApiResponse({
          status: statusCode,
          schema: {
            allOf: [
              { $ref: getSchemaPath(BaseResponseSuccess) },
              {
                properties: {
                  data: { $ref: getSchemaPath(dataDto) },
                },
              },
            ],
          },
        })
      )
    : ApiResponse({
        status: statusCode,
        schema: {
          allOf: [
            { $ref: getSchemaPath(BaseResponseSuccess) },
            {
              properties: {
                data: {
                  type: "object",
                },
              },
            },
          ],
        },
      });
