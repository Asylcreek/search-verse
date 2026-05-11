import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvDTO {
  @IsEnum(Environment)
  @IsNotEmpty()
  NODE_ENV: Environment;

  @IsString()
  @IsNotEmpty()
  DB_URI: string;

  @IsString()
  @IsNotEmpty()
  DB_PASSWORD: string;
}
