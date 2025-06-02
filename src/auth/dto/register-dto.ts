import { IsEmail, IsString, Length } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Invalid email address' })
  public readonly email: string;

  @IsString()
  @Length(2, 50, { message: 'name must be between 2 and 50 characters' })
  public readonly name: string;

  @IsString()
  @Length(6, 50, { message: 'Password must be between 6 and 50 characters' })
  public readonly password: string;
}
