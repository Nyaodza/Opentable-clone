declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_API_URL: string;
    NEXT_PUBLIC_WS_URL: string;
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: string;
    NEXT_PUBLIC_GOOGLE_API_KEY: string;
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: string;
    NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: string;
    
    // NextAuth
    NEXTAUTH_URL: string;
    NEXTAUTH_SECRET: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    FACEBOOK_CLIENT_ID: string;
    FACEBOOK_CLIENT_SECRET: string;
    
    // Database
    DATABASE_URL: string;
    
    // Redis
    REDIS_URL: string;
    
    // Email
    SMTP_HOST: string;
    SMTP_PORT: string;
    SMTP_USER: string;
    SMTP_PASS: string;
    
    // File storage
    AWS_ACCESS_KEY_ID: string;
    AWS_SECRET_ACCESS_KEY: string;
    AWS_S3_BUCKET: string;
    AWS_REGION: string;
    
    // Monitoring
    SENTRY_DSN: string;
    
    NODE_ENV: 'development' | 'production' | 'test';
  }
}

declare global {
  interface Window {
    gapi: any;
    google: any;
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

export {};