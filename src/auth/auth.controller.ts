import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register-dto';
import { LoginDto } from './dto/login-dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('validate_email/:email')
  async validateEmail(@Param('email') email: string) {
    return this.authService.validateUserExistence(email);
  }

  @Get('user')
  get(@Req() req) {
    return this.authService.getUser(req.user.userId);
  }
}
