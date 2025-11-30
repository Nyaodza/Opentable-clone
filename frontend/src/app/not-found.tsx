import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-gray-200">404</h1>
          <div className="text-6xl -mt-8">🍽️</div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Oops! This table doesn't exist
        </h2>
        
        <p className="text-gray-600 mb-8">
          The page you're looking for seems to have wandered off the menu. 
          Let's get you back to discovering great restaurants.
        </p>
        
        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Go to Homepage
          </Link>
          
          <Link
            href="/restaurants"
            className="block w-full border border-red-600 text-red-600 py-3 px-6 rounded-lg hover:bg-red-50 transition-colors font-medium"
          >
            Browse Restaurants
          </Link>
          
          <Link
            href="/help"
            className="block w-full text-gray-600 hover:text-gray-900 transition-colors"
          >
            Need help? Visit our support page
          </Link>
        </div>
        
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            If you believe this is a mistake, please{' '}
            <Link href="/contact" className="text-red-600 hover:text-red-700">
              contact us
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}