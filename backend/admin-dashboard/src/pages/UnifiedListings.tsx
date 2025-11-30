import React, { useState } from 'react';
import { UnifiedListingsGrid } from '../components/listings/UnifiedListingsGrid';
import { SearchParams, ServiceType } from '../types/unified-listings.types';
import { DateRangePicker } from '../components/filters/DateRangePicker';
import { 
  FaHotel, FaPlane, FaHome, FaCar, FaShip, FaHiking,
  FaUtensils, FaGlassCheers, FaCalendarAlt, FaMapMarkerAlt,
  FaSearch, FaFilter
} from 'react-icons/fa';

const serviceTypeIcons: Record<ServiceType, React.ReactNode> = {
  [ServiceType.HOTELS]: <FaHotel />,
  [ServiceType.FLIGHTS]: <FaPlane />,
  [ServiceType.VACATION_RENTALS]: <FaHome />,
  [ServiceType.TOURS]: <FaMapMarkerAlt />,
  [ServiceType.RESTAURANTS]: <FaUtensils />,
  [ServiceType.ACTIVITIES]: <FaHiking />,
  [ServiceType.CAR_RENTALS]: <FaCar />,
  [ServiceType.NIGHTLIFE]: <FaGlassCheers />,
  [ServiceType.CRUISES]: <FaShip />,
  [ServiceType.EVENTS]: <FaCalendarAlt />,
};

export const UnifiedListings: React.FC = () => {
  const [selectedServiceType, setSelectedServiceType] = useState<ServiceType>(ServiceType.HOTELS);
  const [searchLocation, setSearchLocation] = useState({
    city: 'New York',
    country: 'United States',
  });
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    preset: 'custom' as const,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minPrice: undefined,
    maxPrice: undefined,
    minRating: undefined,
  });

  const searchParams: SearchParams = {
    serviceType: selectedServiceType,
    location: searchLocation,
    dateRange: {
      startDate: new Date(dateRange.startDate),
      endDate: new Date(dateRange.endDate),
    },
    filters,
    pageSize: 20,
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // The grid will automatically update with new searchParams
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Unified Travel Marketplace
        </h1>
        <p className="text-gray-600">
          Search and discover travel services from our platform and partner APIs
        </p>
      </div>

      {/* Service Type Selector */}
      <div className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.values(ServiceType).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedServiceType(type)}
              className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                selectedServiceType === type
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <span className="text-xl">{serviceTypeIcons[type]}</span>
              <span className="font-medium capitalize">
                {type.replace('_', ' ')}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchLocation.city}
                onChange={(e) => setSearchLocation({ ...searchLocation, city: e.target.value })}
                placeholder="City"
                className="flex-1 border rounded-lg px-3 py-2"
              />
              <input
                type="text"
                value={searchLocation.country}
                onChange={(e) => setSearchLocation({ ...searchLocation, country: e.target.value })}
                placeholder="Country"
                className="flex-1 border rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dates
            </label>
            <DateRangePicker
              dateRange={dateRange}
              onChange={setDateRange}
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <FaSearch />
              Search
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 border rounded-lg hover:bg-gray-50 ${
                showFilters ? 'border-blue-600 text-blue-600' : 'border-gray-300'
              }`}
            >
              <FaFilter />
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price Range
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  value={filters.minPrice || ''}
                  onChange={(e) => setFilters({ ...filters, minPrice: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="Min"
                  className="w-24 border rounded px-2 py-1"
                />
                <span>-</span>
                <input
                  type="number"
                  value={filters.maxPrice || ''}
                  onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="Max"
                  className="w-24 border rounded px-2 py-1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Rating
              </label>
              <select
                value={filters.minRating || ''}
                onChange={(e) => setFilters({ ...filters, minRating: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full border rounded px-3 py-1"
              >
                <option value="">Any</option>
                <option value="3">3+ Stars</option>
                <option value="3.5">3.5+ Stars</option>
                <option value="4">4+ Stars</option>
                <option value="4.5">4.5+ Stars</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setFilters({ minPrice: undefined, maxPrice: undefined, minRating: undefined })}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Results Grid */}
      <UnifiedListingsGrid
        searchParams={searchParams}
        layout="grid"
        showFilters={true}
      />
    </div>
  );
};