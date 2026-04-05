import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  tenantName: string;

  @IsString()
  tenantSlug: string;

  @IsEmail()
  adminEmail: string;

  @IsString()
  branchName: string;

  @IsOptional()
  @IsString()
  branchSlug?: string;

  @IsOptional()
  @IsString()
  branchCode?: string;
}
