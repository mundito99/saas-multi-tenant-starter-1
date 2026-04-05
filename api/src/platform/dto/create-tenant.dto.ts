import { IsEmail, IsString } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  tenantName: string;

  @IsString()
  tenantSlug: string;

  @IsEmail()
  adminEmail: string;
}
