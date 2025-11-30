import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  FaTachometerAlt, FaChartBar, FaSearch, FaFileAlt, 
  FaCog, FaUsers, FaGlobe, FaList, FaDollarSign, FaLayerGroup 
} from 'react-icons/fa';
import { clsx } from 'clsx';

interface SidebarItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: string;
}

export const Sidebar: React.FC = () => {
  const menuItems: SidebarItem[] = [
    { label: 'Dashboard', icon: <FaTachometerAlt />, path: '/' },
    { label: 'Analytics', icon: <FaChartBar />, path: '/analytics' },
    { label: 'Search Console', icon: <FaSearch />, path: '/search-console' },
    { label: 'Reports', icon: <FaFileAlt />, path: '/reports' },
    { label: 'Listings', icon: <FaList />, path: '/listings' },
    { label: 'Unified Listings', icon: <FaLayerGroup />, path: '/unified-listings' },
    { label: 'Revenue', icon: <FaDollarSign />, path: '/revenue' },
    { label: 'Geographic', icon: <FaGlobe />, path: '/geographic' },
    { label: 'Users', icon: <FaUsers />, path: '/users', badge: 'Admin' },
    { label: 'Settings', icon: <FaCog />, path: '/settings' },
  ];

  return (
    <aside className="w-64 bg-gray-900 min-h-screen">
      <div className="p-4">
        <h2 className="text-2xl font-bold text-white mb-8">
          Travel Admin
        </h2>
        
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  'flex items-center justify-between px-4 py-3 rounded-lg transition-colors',
                  isActive
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                )
              }
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
      
      <div className="absolute bottom-0 w-full p-4 border-t border-gray-800">
        <div className="text-xs text-gray-500">
          <p>Travel Platform v1.0.0</p>
          <p className="mt-1">© 2024 TravelSphere</p>
        </div>
      </div>
    </aside>
  );
};