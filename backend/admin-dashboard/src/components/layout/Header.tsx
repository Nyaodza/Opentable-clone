import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FaUserCircle, FaSignOutAlt, FaCog } from 'react-icons/fa';
import { MdDashboard } from 'react-icons/md';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex items-center gap-3">
              <MdDashboard className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">
                TravelSphere Admin
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <Menu as="div" className="relative">
                <Menu.Button className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 focus:outline-none">
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <FaUserCircle className="w-8 h-8 text-gray-400" />
                  )}
                  <span className="hidden md:block">{user.name}</span>
                </Menu.Button>

                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">
                          {user.name}
                        </p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                          {user.role}
                        </span>
                      </div>

                      <Menu.Item>
                        {({ active }) => (
                          <a
                            href="/settings"
                            className={`${
                              active ? 'bg-gray-100' : ''
                            } flex items-center gap-2 px-4 py-2 text-sm text-gray-700`}
                          >
                            <FaCog className="w-4 h-4" />
                            Settings
                          </a>
                        )}
                      </Menu.Item>

                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className={`${
                              active ? 'bg-gray-100' : ''
                            } flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 text-left disabled:opacity-50`}
                          >
                            <FaSignOutAlt className="w-4 h-4" />
                            {isLoggingOut ? 'Logging out...' : 'Logout'}
                          </button>
                        )}
                      </Menu.Item>
                    </div>
                  </Menu.Items>
                </Transition>
              </Menu>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};