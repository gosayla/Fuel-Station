import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}

export class PinLoginDto {
  @IsNotEmpty()
  @IsString()
  employeeId: string;

  @IsNotEmpty()
  @Length(4, 4)
  pin: string;
}

export class RefreshDto {
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}
