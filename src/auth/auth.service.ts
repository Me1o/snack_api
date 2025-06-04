import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { env } from 'node:process';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { RegisterDto } from './dto/register-dto';
import { LoginDto } from './dto/login-dto';

@Injectable()
export class AuthService {
  private readonly jwtSecret = env.JWT_SECRET;
  constructor(private readonly prisma: PrismaService) {}

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(password, salt);
  }

  async generateToken(userId: number): Promise<string> {
    return jwt.sign({ userId }, this.jwtSecret, { expiresIn: '1y' });
  }

  async register(dto: RegisterDto): Promise<{ token: string }> {
    const plainPassword = dto.password;
    const hashedPassword = await this.hashPassword(plainPassword);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        preferencesId: undefined,
      },
    });
    const token = await this.generateToken(user.id);
    return { token };
  }

  async login(dto: LoginDto): Promise<{ token: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const token = await this.generateToken(user.id);
    return { token };
  }

  async validateToken(token: string): Promise<any> {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async validateUserExistence(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email: email },
    });
    return user != null;
  }

  async getUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    return { id: user.id, name: user.name, email: user.email };
  }
}
