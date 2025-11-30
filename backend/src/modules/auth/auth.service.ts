import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
  ) {}

  async signUp(signUpDto: SignUpDto) {
    const { name, email, password, phone, role } = signUpDto;

    // Check if user already exists
    // const existingUser = await this.userRepository.findOne({ where: { email } });
    // if (existingUser) {
    //   throw new BadRequestException('User already exists');
    // }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user (mock)
    const user = {
      id: 'new-user-id',
      name,
      email,
      password: hashedPassword,
      phone,
      role: role || 'user',
      emailVerified: false,
      createdAt: new Date(),
    };

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      ...tokens,
    };
  }

  async signIn(signInDto: SignInDto) {
    const { email, password } = signInDto;

    // Mock user lookup
    const user = {
      id: 'user-id',
      name: 'John Doe',
      email,
      password: await bcrypt.hash('password123', 12),
      role: 'user',
      emailVerified: true,
    };

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const decoded = this.jwtService.verify(refreshToken);
      
      // Mock user lookup
      const user = {
        id: decoded.sub,
        email: decoded.email,
        role: 'user',
      };

      const tokens = await this.generateTokens(user);
      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async signOut(token: string) {
    // Add token to blacklist (implementation needed)
    return { message: 'Successfully signed out' };
  }

  async forgotPassword(email: string) {
    // Mock implementation
    return { message: 'Password reset email sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    // Mock implementation
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    return { message: 'Password reset successfully' };
  }

  async verifyEmail(token: string) {
    // Mock implementation
    return { message: 'Email verified successfully' };
  }

  async resendVerificationEmail(userId: string) {
    // Mock implementation
    return { message: 'Verification email sent' };
  }

  async oAuthLogin(user: any) {
    const tokens = await this.generateTokens(user);
    return tokens;
  }

  async enable2FA(userId: string, type: 'totp' | 'sms') {
    // Mock implementation
    if (type === 'totp') {
      const secret = 'MOCK_SECRET_KEY';
      const qrCode = 'data:image/png;base64,mockqrcode';
      return {
        secret,
        qrCode,
        backupCodes: ['123456', '789012'],
      };
    }
    return { message: 'SMS 2FA enabled' };
  }

  async verify2FA(userId: string, code: string) {
    // Mock verification
    if (code === '123456') {
      return { verified: true, message: '2FA verified successfully' };
    }
    throw new BadRequestException('Invalid 2FA code');
  }

  async disable2FA(userId: string, code: string) {
    // Mock implementation
    return { message: '2FA disabled successfully' };
  }

  async generate2FAQRCode(userId: string) {
    // Mock implementation
    return {
      qrCode: 'data:image/png;base64,mockqrcode',
      secret: 'MOCK_SECRET_KEY',
    };
  }

  async generateBackupCodes(userId: string) {
    // Mock implementation
    const codes = Array.from({ length: 10 }, () => 
      Math.random().toString(36).substring(2, 8).toUpperCase()
    );
    return { backupCodes: codes };
  }

  async getProfile(userId: string) {
    // Mock user profile
    return {
      id: userId,
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      role: 'user',
      emailVerified: true,
      loyaltyPoints: 1250,
      loyaltyTier: 'gold',
      preferences: {
        cuisines: ['Italian', 'Japanese'],
        dietary: ['Vegetarian'],
      },
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    // Mock implementation
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    return { message: 'Password changed successfully' };
  }

  private async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }
}
