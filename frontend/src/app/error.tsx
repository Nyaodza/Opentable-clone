'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="text-6xl mb-4">😵</div>
          <h1 className="text-4xl font-bold text-gray-900">Something went wrong!</h1>
        </div>
        
        <p className="text-gray-600 mb-8">
          We encountered an unexpected error. Our team has been notified and is working on a fix.
        </p>
        
        <div className="space-y-3">
          <button
            onClick={reset}
            className="block w-full bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Try Again
          </button>
          
          <Link
            href="/"
            className="block w-full border border-red-600 text-red-600 py-3 px-6 rounded-lg hover:bg-red-50 transition-colors font-medium"
          >
            Go to Homepage
          </Link>
        </div>
        
        {error.digest && (
          <p className="mt-8 text-xs text-gray-500">
            Error ID: {error.digest}
          </p>
        )}
        
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            If this problem persists, please{' '}
            <Link href="/contact" className="text-red-600 hover:text-red-700">
              contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}