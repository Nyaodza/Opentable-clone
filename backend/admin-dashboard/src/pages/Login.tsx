import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FaGoogle } from 'react-icons/fa';
import { MdDashboard } from 'react-icons/md';

export const Login: React.FC = () => {
  const { login } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-full mb-4">
              <MdDashboard className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              TravelSphere Admin
            </h1>
            <p className="mt-2 text-gray-600">
              Sign in to access the admin dashboard
            </p>
          </div>

          <div className="space-y-6">
            <div className="border-t border-gray-200 pt-6">
              <button
                onClick={login}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <FaGoogle className="w-5 h-5" />
                Sign in with Google
              </button>
            </div>

            <div className="text-center text-sm text-gray-600">
              <p>Access is restricted to authorized administrators only.</p>
              <p className="mt-2">
                Contact your system administrator if you need access.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>&copy; 2024 TravelSphere. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};