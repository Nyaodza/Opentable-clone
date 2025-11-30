import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService } from '../../src/services/auth.service';
import User from '../../src/models/user.model';
import RefreshToken from '../../src/models/refresh-token.model';
import { createTestUser } from '../setup';

describe('AuthService', () => {
  beforeEach(async () => {
    await User.destroy({ where: {} });
    await RefreshToken.destroy({ where: {} });
  });

  describe('register', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'diner' as const,
      };

      const result = await AuthService.register(userData);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(userData.email);
      expect(result.user.firstName).toBe(userData.firstName);
      expect(result.user.password).not.toBe(userData.password); // Should be hashed
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw error if email already exists', async () => {
      await createTestUser({ email: 'existing@example.com' });

      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'existing@example.com',
        password: 'password123',
        role: 'diner' as const,
      };

      await expect(AuthService.register(userData)).rejects.toThrow('Email already registered');
    });

    it('should hash the password correctly', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'diner' as const,
      };

      const result = await AuthService.register(userData);
      const user = await User.findByPk(result.user.id);
      
      const isPasswordValid = await bcrypt.compare(userData.password, user!.password);
      expect(isPasswordValid).toBe(true);
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const password = 'password123';
      const user = await createTestUser({
        email: 'john@example.com',
        password: await bcrypt.hash(password, 10),
      });

      const result = await AuthService.login('john@example.com', password);

      expect(result.user.id).toBe(user.id);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw error with invalid email', async () => {
      await expect(
        AuthService.login('nonexistent@example.com', 'password123')
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw error with invalid password', async () => {
      await createTestUser({
        email: 'john@example.com',
        password: await bcrypt.hash('correctpassword', 10),
      });

      await expect(
        AuthService.login('john@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw error if user is inactive', async () => {
      const password = 'password123';
      await createTestUser({
        email: 'john@example.com',
        password: await bcrypt.hash(password, 10),
        isActive: false,
      });

      await expect(
        AuthService.login('john@example.com', password)
      ).rejects.toThrow('Account is deactivated');
    });

    it('should update lastLogin timestamp', async () => {
      const password = 'password123';
      const user = await createTestUser({
        email: 'john@example.com',
        password: await bcrypt.hash(password, 10),
      });

      const beforeLogin = user.lastLogin;
      await AuthService.login('john@example.com', password);
      
      const updatedUser = await User.findByPk(user.id);
      expect(updatedUser!.lastLogin).not.toBe(beforeLogin);
      expect(updatedUser!.lastLogin).toBeValidDate();
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens successfully', async () => {
      const user = await createTestUser();
      const { refreshToken } = await AuthService.login('test@example.com', 'password123');

      const result = await AuthService.refreshToken(refreshToken);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken).not.toBe(refreshToken); // Should be new token
    });

    it('should throw error with invalid refresh token', async () => {
      await expect(
        AuthService.refreshToken('invalid-token')
      ).rejects.toThrow('Invalid refresh token');
    });

    it('should throw error with expired refresh token', async () => {
      const user = await createTestUser();
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET || 'test-refresh-secret',
        { expiresIn: '-1h' } // Already expired
      );

      await RefreshToken.create({
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
      });

      await expect(AuthService.refreshToken(token)).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const user = await createTestUser();
      const { refreshToken } = await AuthService.login('test@example.com', 'password123');

      await AuthService.logout(user.id, refreshToken);

      const tokenExists = await RefreshToken.findOne({
        where: { token: refreshToken },
      });
      expect(tokenExists).toBeNull();
    });

    it('should not throw error if token does not exist', async () => {
      const user = await createTestUser();
      
      await expect(
        AuthService.logout(user.id, 'non-existent-token')
      ).resolves.not.toThrow();
    });
  });

  describe('resetPassword', () => {
    it('should create password reset token', async () => {
      const user = await createTestUser({ email: 'john@example.com' });

      const token = await AuthService.forgotPassword('john@example.com');

      expect(token).toBeDefined();
      
      const updatedUser = await User.findByPk(user.id);
      expect(updatedUser!.resetPasswordToken).toBeDefined();
      expect(updatedUser!.resetPasswordExpires).toBeValidDate();
      expect(updatedUser!.resetPasswordExpires!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should reset password with valid token', async () => {
      const user = await createTestUser();
      const token = await AuthService.forgotPassword('test@example.com');

      await AuthService.resetPassword(token, 'newpassword123');

      const updatedUser = await User.findByPk(user.id);
      const isPasswordValid = await bcrypt.compare('newpassword123', updatedUser!.password);
      expect(isPasswordValid).toBe(true);
      expect(updatedUser!.resetPasswordToken).toBeNull();
      expect(updatedUser!.resetPasswordExpires).toBeNull();
    });

    it('should throw error with invalid reset token', async () => {
      await expect(
        AuthService.resetPassword('invalid-token', 'newpassword123')
      ).rejects.toThrow('Invalid or expired reset token');
    });

    it('should throw error with expired reset token', async () => {
      const user = await createTestUser();
      const token = 'expired-token';
      
      await user.update({
        resetPasswordToken: token,
        resetPasswordExpires: new Date(Date.now() - 3600000), // 1 hour ago
      });

      await expect(
        AuthService.resetPassword(token, 'newpassword123')
      ).rejects.toThrow('Invalid or expired reset token');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const oldPassword = 'oldpassword123';
      const newPassword = 'newpassword123';
      const user = await createTestUser({
        password: await bcrypt.hash(oldPassword, 10),
      });

      await AuthService.changePassword(user.id, oldPassword, newPassword);

      const updatedUser = await User.findByPk(user.id);
      const isPasswordValid = await bcrypt.compare(newPassword, updatedUser!.password);
      expect(isPasswordValid).toBe(true);
    });

    it('should throw error with incorrect current password', async () => {
      const user = await createTestUser({
        password: await bcrypt.hash('correctpassword', 10),
      });

      await expect(
        AuthService.changePassword(user.id, 'wrongpassword', 'newpassword123')
      ).rejects.toThrow('Current password is incorrect');
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const user = await createTestUser({ emailVerified: false });
      const token = jwt.sign(
        { userId: user.id, type: 'email-verification' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '24h' }
      );

      await AuthService.verifyEmail(token);

      const updatedUser = await User.findByPk(user.id);
      expect(updatedUser!.emailVerified).toBe(true);
    });

    it('should throw error with invalid token', async () => {
      await expect(
        AuthService.verifyEmail('invalid-token')
      ).rejects.toThrow();
    });
  });
});