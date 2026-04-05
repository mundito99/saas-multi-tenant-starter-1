import { IsOptional, IsString } from 'class-validator';

export class CreateBranchDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  code?: string;
}
