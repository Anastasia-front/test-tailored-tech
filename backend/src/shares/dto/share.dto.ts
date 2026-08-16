import { ResourceType, ShareType } from '@prisma/client';
import { ArrayNotEmpty, IsArray, IsEmail, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class CreateShareDto {
  @IsEnum(ResourceType)
  resourceType!: ResourceType;

  @IsUUID()
  resourceId!: string;

  @IsEnum(ShareType)
  shareType!: ShareType;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEmail({}, { each: true })
  emails?: string[];
}
