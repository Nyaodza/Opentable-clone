import React, { useState } from 'react';

interface OAuthProvidersProps {
  onSuccess: (provider: string, data: any) => void;
  onError: (error: string) => void;
}

const OAuthProviders: React.FC<OAuthProvidersProps> = ({ onSuccess, onError }) => {
  const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({});

  const handleOAuthLogin = async (provider: 'google' | 'facebook' | 'apple') => {
    setIsLoading(prev => ({ ...prev, [provider]: true }));

    try {
      // Redirect to OAuth provider
      const authUrl = `/api/auth/oauth/${provider}`;
      const popup = window.open(
        authUrl,
        `${provider}_auth`,
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      // Listen for OAuth callback
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          setIsLoading(prev => ({ ...prev, [provider]: false }));
        }
      }, 1000);

      // Listen for OAuth success message
      const messageListener = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'OAUTH_SUCCESS') {
          clearInterval(checkClosed);
          popup?.close();
          window.removeEventListener('message', messageListener);
          setIsLoading(prev => ({ ...prev, [provider]: false }));
          onSuccess(provider, event.data.user);
        } else if (event.data.type === 'OAUTH_ERROR') {
          clearInterval(checkClosed);
          popup?.close();
          window.removeEventListener('message', messageListener);
          setIsLoading(prev => ({ ...prev, [provider]: false }));
          onError(event.data.error || `${provider} authentication failed`);
        }
      };

      window.addEventListener('message', messageListener);

    } catch (error) {
      setIsLoading(prev => ({ ...prev, [provider]: false }));
      onError(`Failed to initiate ${provider} authentication`);
    }
  };

  const providers = [
    {
      id: 'google',
      name: 'Google',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      ),
      bgColor: 'bg-white hover:bg-gray-50',
      textColor: 'text-gray-700',
      borderColor: 'border-gray-300'
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: (
        <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      bgColor: 'bg-blue-600 hover:bg-blue-700',
      textColor: 'text-white',
      borderColor: 'border-blue-600'
    },
    {
      id: 'apple',
      name: 'Apple',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.017 0C8.396 0 8.025.044 6.979.207 5.934.369 5.226.59 4.61.907c-.617.317-1.14.74-1.657 1.257S2.224 3.993 1.907 4.61C1.59 5.226 1.369 5.934 1.207 6.979.044 8.025 0 8.396 0 12.017s.044 3.992.207 5.037c.162 1.046.383 1.754.7 2.37.317.617.74 1.14 1.257 1.657s1.04.94 1.657 1.257c.616.317 1.324.538 2.37.7 1.045.163 1.416.207 5.037.207s3.992-.044 5.037-.207c1.046-.162 1.754-.383 2.37-.7.617-.317 1.14-.74 1.657-1.257s.94-1.04 1.257-1.657c.317-.616.538-1.324.7-2.37.163-1.045.207-1.416.207-5.037s-.044-3.992-.207-5.037c-.162-1.046-.383-1.754-.7-2.37-.317-.617-.74-1.14-1.257-1.657S18.007 2.224 17.39 1.907c-.616-.317-1.324-.538-2.37-.7C13.975.044 13.604 0 12.017 0zm0 2.162c3.204 0 3.584.012 4.849.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.849.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0 3.653c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      ),
      bgColor: 'bg-black hover:bg-gray-800',
      textColor: 'text-white',
      borderColor: 'border-black'
    }
  ];

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or continue with</span>
        </div>
      </div>

      <div className="space-y-2">
        {providers.map((provider) => (
          <button
            key={provider.id}
            onClick={() => handleOAuthLogin(provider.id as any)}
            disabled={isLoading[provider.id]}
            className={`
              w-full flex items-center justify-center px-4 py-2 border rounded-md text-sm font-medium
              ${provider.bgColor} ${provider.textColor} ${provider.borderColor}
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200
            `}
          >
            {isLoading[provider.id] ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
            ) : (
              <>
                {provider.icon}
                <span className="ml-2">Continue with {provider.name}</span>
              </>
            )}
          </button>
        ))}
      </div>

      <div className="text-xs text-gray-500 text-center">
        By continuing, you agree to our{' '}
        <a href="/terms" className="text-purple-600 hover:text-purple-500">
          Terms of Service
        </a>{' '}
        and{' '}
        <a href="/privacy" className="text-purple-600 hover:text-purple-500">
          Privacy Policy
        </a>
      </div>
    </div>
  );
};

export default OAuthProviders;
