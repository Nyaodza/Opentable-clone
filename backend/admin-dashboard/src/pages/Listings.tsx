import React, { useState } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { 
  FaHotel, FaPlane, FaHome, FaCar, FaShip, FaHiking,
  FaUtensils, FaGlassCheers, FaCalendarAlt, FaMapMarkerAlt,
  FaStar, FaEye, FaEdit, FaTrash, FaCheck, FaClock
} from 'react-icons/fa';
import { ServiceCategory } from '../types/travel.types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

interface Listing {
  id: string;
  name: string;
  category: ServiceCategory;
  location: string;
  price: number;
  rating: number;
  reviews: number;
  status: 'active' | 'pending' | 'flagged' | 'inactive';
  views: number;
  bookings: number;
  revenue: number;
  lastUpdated: string;
  provider: {
    id: string;
    name: string;
  };
}

const categoryIcons: Record<ServiceCategory, React.ReactNode> = {
  [ServiceCategory.HOTELS]: <FaHotel />,
  [ServiceCategory.FLIGHTS]: <FaPlane />,
  [ServiceCategory.VACATION_RENTALS]: <FaHome />,
  [ServiceCategory.TOURS]: <FaMapMarkerAlt />,
  [ServiceCategory.RESTAURANTS]: <FaUtensils />,
  [ServiceCategory.ACTIVITIES]: <FaHiking />,
  [ServiceCategory.CAR_RENTALS]: <FaCar />,
  [ServiceCategory.NIGHTLIFE]: <FaGlassCheers />,
  [ServiceCategory.CRUISES]: <FaShip />,
  [ServiceCategory.EVENTS]: <FaCalendarAlt />,
  [ServiceCategory.GUIDES]: <FaMapMarkerAlt />,
  [ServiceCategory.BLOGS]: <FaEdit />,
};

export const Listings: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('bookings');

  const { data: listings, isLoading } = useQuery<Listing[]>(
    ['listings', selectedCategory, statusFilter, searchTerm, sortBy],
    async () => {
      const response = await axios.get(`${API_URL}/admin/travel/listings`, {
        params: {
          category: selectedCategory,
          status: statusFilter,
          search: searchTerm,
          sort: sortBy,
        },
      });
      return response.data;
    },
    {
      placeholderData: getPlaceholderListings(),
    }
  );

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      flagged: 'bg-red-100 text-red-800',
      inactive: 'bg-gray-100 text-gray-800',
    };

    const statusIcons = {
      active: <FaCheck className="inline mr-1" />,
      pending: <FaClock className="inline mr-1" />,
      flagged: <FaTrash className="inline mr-1" />,
      inactive: <FaEye className="inline mr-1" />,
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center ${statusStyles[status as keyof typeof statusStyles]}`}>
        {statusIcons[status as keyof typeof statusIcons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading listings...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Listings Management</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          Add New Listing
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as ServiceCategory | 'all')}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="all">All Categories</option>
              {Object.values(ServiceCategory).map((category) => (
                <option key={category} value={category}>
                  {category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="flagged">Flagged</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search listings..."
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="bookings">Most Bookings</option>
              <option value="revenue">Highest Revenue</option>
              <option value="rating">Best Rating</option>
              <option value="views">Most Views</option>
              <option value="recent">Recently Updated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Listings Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Listing
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {listings?.map((listing) => (
                <tr key={listing.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-gray-100 rounded-full">
                        <span className="text-gray-600">
                          {categoryIcons[listing.category]}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {listing.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          by {listing.provider.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {listing.category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <FaMapMarkerAlt className="mr-1 text-gray-400" />
                      {listing.location}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      ${listing.price}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FaStar className="text-yellow-400 mr-1" />
                      <span className="text-sm text-gray-900">{listing.rating}</span>
                      <span className="text-sm text-gray-500 ml-1">({listing.reviews})</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-gray-500">Views:</span>
                          <span className="ml-1 font-medium">{listing.views.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Bookings:</span>
                          <span className="ml-1 font-medium">{listing.bookings}</span>
                        </div>
                      </div>
                      <div className="text-green-600 font-medium">
                        ${listing.revenue.toLocaleString()} revenue
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(listing.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <FaEye />
                      </button>
                      <button className="text-indigo-600 hover:text-indigo-900">
                        <FaEdit />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

function getPlaceholderListings(): Listing[] {
  const categories = Object.values(ServiceCategory);
  const locations = ['New York', 'London', 'Paris', 'Tokyo', 'Sydney', 'Dubai', 'Singapore', 'Los Angeles'];
  const statuses = ['active', 'pending', 'flagged', 'inactive'] as const;
  const providers = ['Premium Travel Co.', 'Global Hotels Group', 'Adventure Tours Ltd.', 'City Experience Tours'];

  return Array.from({ length: 20 }, (_, i) => ({
    id: `listing-${i + 1}`,
    name: `Amazing ${categories[i % categories.length]} Experience ${i + 1}`,
    category: categories[i % categories.length],
    location: locations[i % locations.length],
    price: Math.floor(Math.random() * 1000) + 50,
    rating: Number((3.5 + Math.random() * 1.5).toFixed(1)),
    reviews: Math.floor(Math.random() * 500) + 10,
    status: statuses[i % statuses.length],
    views: Math.floor(Math.random() * 10000) + 100,
    bookings: Math.floor(Math.random() * 100) + 5,
    revenue: Math.floor(Math.random() * 50000) + 1000,
    lastUpdated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    provider: {
      id: `provider-${i % providers.length}`,
      name: providers[i % providers.length],
    },
  }));
}