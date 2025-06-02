import { IsEmail, IsString, Length } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Invalid email address' })
  public readonly email: string;

  @IsString()
  @Length(6, 50, { message: 'Password must be between 8 and 50 characters' })
  public readonly password: string;
}
