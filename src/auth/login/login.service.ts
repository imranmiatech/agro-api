import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class LoginService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Authenticates user and checks role-specific access permissions
   */
  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { vendorProfile: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Role-specific moderation checks for vendors
    if (user.role === 'VENDOR') {
      const vendorStatus = user.vendorProfile?.status;

      if (vendorStatus === 'PENDING') {
        throw new ForbiddenException(
          'Your vendor account is pending administrator approval. You will receive an email once your account has been reviewed.',
        );
      }

      if (vendorStatus === 'REJECTED') {
        const reason = user.vendorProfile?.rejectionReason
          ? ` Reason: ${user.vendorProfile.rejectionReason}`
          : '';
        throw new ForbiddenException(`Your vendor partnership application was rejected.${reason}`);
      }

      if (vendorStatus === 'SUSPENDED') {
        const reason = user.vendorProfile?.suspendedReason
          ? ` Reason: ${user.vendorProfile.suspendedReason}`
          : '';
        throw new ForbiddenException(`Your vendor account is currently suspended.${reason} Please contact support.`);
      }
    }

    if (user.status === 'SUSPENDED') {
      throw new ForbiddenException('Your account has been suspended by administration.');
    }

    const { accessToken, refreshToken } = await this.generateTokens(
      user.id,
      user.email,
      user.role,
    );

    return {
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        vendorProfile: user.vendorProfile
          ? {
              id: user.vendorProfile.id,
              businessName: user.vendorProfile.businessName,
              slug: user.vendorProfile.slug,
              logo: user.vendorProfile.logo,
              status: user.vendorProfile.status,
            }
          : undefined,
      },
    };
  }

  /**
   * Verifies an active refresh token and returns a fresh pair of tokens
   */
  async refreshTokens(dto: RefreshTokenDto) {
    try {
      const refreshSecret =
        process.env.JWT_REFRESH_SECRET ||
        (process.env.JWT_SECRET || 'multi_vendor_jwt_super_secret_key_2026') + '_refresh';

      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
        role: string;
      }>(dto.refreshToken, {
        secret: refreshSecret,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.status === 'SUSPENDED') {
        throw new UnauthorizedException('User account is invalid or suspended');
      }

      const tokens = await this.generateTokens(user.id, user.email, user.role);

      return {
        message: 'Tokens refreshed successfully',
        ...tokens,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Generates JWT Access Token (1d) and Refresh Token (7d)
   */
  async generateTokens(
    userId: string,
    email: string,
    role: string,
  ): Promise<TokenPair> {
    const payload = { sub: userId, email, role };
    const secret = process.env.JWT_SECRET || 'multi_vendor_jwt_super_secret_key_2026';
    const refreshSecret =
      process.env.JWT_REFRESH_SECRET || secret + '_refresh';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret,
        expiresIn: '1d',
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
