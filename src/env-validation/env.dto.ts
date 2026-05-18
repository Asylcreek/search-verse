import {
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

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

  @IsNumberString()
  @IsNotEmpty()
  PORT: string;

  @IsString()
  @IsNotEmpty()
  API_BIBLE_KEY: string;

  @IsString()
  @IsNotEmpty()
  REDIS_HOST: string;

  @IsNumberString()
  @IsNotEmpty()
  REDIS_PORT: string;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @IsString()
  @IsOptional()
  REDIS_USE_TLS?: string;
}
