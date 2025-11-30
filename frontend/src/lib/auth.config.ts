import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID || '',
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        // For now, implement basic validation
        // In production, integrate with your backend API
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Mock user authentication - replace with actual API call
        if (credentials.email === 'admin@opentable.com' && credentials.password === 'password') {
          return {
            id: '1',
            email: credentials.email,
            name: 'Admin User',
            role: 'admin',
          };
        }

        if (credentials.email && credentials.password.length >= 6) {
          return {
            id: '2', 
            email: credentials.email,
            name: credentials.email.split('@')[0],
            role: 'user',
          };
        }

        return null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user) {
        return {
          ...token,
          id: user.id,
          role: user.role,
          provider: account.provider,
        };
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id,
          role: token.role,
          provider: token.provider,
        },
      };
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
    newUser: '/onboarding',
  },
  events: {
    async createUser({ user }) {
      // Send welcome email
      console.log(`New user created: ${user.email}`);
    },
    async signIn({ user, account, profile }) {
      // Track sign-in events
      console.log(`User signed in: ${user.email} via ${account?.provider}`);
    },
  },
  debug: process.env.NODE_ENV === 'development',
};
