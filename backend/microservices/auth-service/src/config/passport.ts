import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { config } from './environment';
import { UserService } from '../services/UserService';
import { RedisService } from '../services/RedisService';
import { User, GoogleProfile } from '../types';
import { logger } from '../utils/logger';

const redisService = new RedisService();
const userService = new UserService(redisService);

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: config.google.clientId,
      clientSecret: config.google.clientSecret,
      callbackURL: config.google.callbackUrl,
      scope: ['profile', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleProfile: GoogleProfile = {
          id: profile.id,
          displayName: profile.displayName,
          emails: profile.emails as any,
          photos: profile.photos as any,
        };

        const user = await userService.findOrCreateUser(googleProfile);
        done(null, user);
      } catch (error) {
        logger.error('Google OAuth error:', error);
        done(error as Error);
      }
    }
  )
);

// JWT Strategy
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.jwt.secret,
    },
    async (payload, done) => {
      try {
        const user = await userService.findUserById(payload.userId);
        if (user) {
          done(null, user);
        } else {
          done(null, false);
        }
      } catch (error) {
        logger.error('JWT strategy error:', error);
        done(error, false);
      }
    }
  )
);

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await userService.findUserById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export const initializePassport = async () => {
  await redisService.connect();
  return passport;
};