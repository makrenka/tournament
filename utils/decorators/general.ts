import { IsDefined, ValidationOptions } from "class-validator";

export const IsRequired = () =>
  IsDefined({
    message: "Field is required",
  });
