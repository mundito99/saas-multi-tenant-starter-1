import { IsEmail } from 'class-validator';

export class BootstrapPlatformDto {
  @IsEmail()
  email: string;
}
