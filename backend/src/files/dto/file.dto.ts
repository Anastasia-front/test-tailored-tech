import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RequestUploadUrlDto {
  @IsUUID()
  folderId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName!: string;

  @IsString()
  contentType!: string;

  @IsInt()
  @IsPositive()
  sizeBytes!: number;
}

export class ConfirmUploadDto {
  @IsUUID()
  folderId!: string;

  @IsString()
  key!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsInt()
  @IsPositive()
  sizeBytes!: number;

  @IsString()
  mimeType!: string;
}

export class UpdateFileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsUUID()
  folderId?: string;
}
