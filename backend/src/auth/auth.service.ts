import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthProvider, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, SignupDto } from './dto/auth.dto';

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  toPublicUser(user: User): PublicUser {
    return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl };
  }

  async signup(dto: SignupDto): Promise<{ user: PublicUser; token: string }> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        provider: AuthProvider.LOCAL,
      },
    });
    await this.linkPendingShares(user.id, user.email);
    return { user: this.toPublicUser(user), token: this.signToken(user) };
  }

  async login(dto: LoginDto): Promise<{ user: PublicUser; token: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return { user: this.toPublicUser(user), token: this.signToken(user) };
  }

  async findOrCreateGoogleUser(profile: {
    googleId: string;
    email: string;
    name?: string;
    avatarUrl?: string;
  }): Promise<User> {
    let user = await this.prisma.user.findUnique({ where: { googleId: profile.googleId } });
    if (user) return user;

    user = await this.prisma.user.findUnique({ where: { email: profile.email } });
    if (user) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.googleId, provider: AuthProvider.GOOGLE },
      });
      return user;
    }

    user = await this.prisma.user.create({
      data: {
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
        googleId: profile.googleId,
        provider: AuthProvider.GOOGLE,
      },
    });
    await this.linkPendingShares(user.id, user.email);
    return user;
  }

  signToken(user: User): string {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return this.jwt.sign(payload);
  }

  // When a user is shared-with by email before they have an account, the
  // ShareGrantee row is created with userId = null. Link it up on signup.
  private async linkPendingShares(userId: string, email: string) {
    await this.prisma.shareGrantee.updateMany({
      where: { email, userId: null },
      data: { userId },
    });
  }
}
