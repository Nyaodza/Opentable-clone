import React from 'react';
import Link from 'next/link';

const popularCities = [
  { name: 'New York', count: 1247, state: 'NY', featured: true },
  { name: 'Los Angeles', count: 892, state: 'CA', featured: true },
  { name: 'Chicago', count: 634, state: 'IL', featured: true },
  { name: 'Houston', count: 423, state: 'TX', featured: true },
  { name: 'Philadelphia', count: 387, state: 'PA', featured: true },
  { name: 'Phoenix', count: 312, state: 'AZ', featured: true },
  { name: 'San Antonio', count: 298, state: 'TX' },
  { name: 'San Diego', count: 456, state: 'CA' },
  { name: 'Dallas', count: 389, state: 'TX' },
  { name: 'San Jose', count: 234, state: 'CA' },
  { name: 'Austin', count: 412, state: 'TX' },
  { name: 'Jacksonville', count: 189, state: 'FL' },
  { name: 'Fort Worth', count: 167, state: 'TX' },
  { name: 'Columbus', count: 223, state: 'OH' },
  { name: 'Charlotte', count: 298, state: 'NC' },
  { name: 'San Francisco', count: 678, state: 'CA', featured: true },
  { name: 'Indianapolis', count: 187, state: 'IN' },
  { name: 'Seattle', count: 534, state: 'WA', featured: true },
  { name: 'Denver', count: 423, state: 'CO' },
  { name: 'Washington', count: 567, state: 'DC', featured: true },
  { name: 'Boston', count: 489, state: 'MA', featured: true },
  { name: 'El Paso', count: 134, state: 'TX' },
  { name: 'Nashville', count: 378, state: 'TN' },
  { name: 'Detroit', count: 267, state: 'MI' },
  { name: 'Oklahoma City', count: 178, state: 'OK' },
  { name: 'Portland', count: 445, state: 'OR' },
  { name: 'Las Vegas', count: 523, state: 'NV', featured: true },
  { name: 'Memphis', count: 198, state: 'TN' },
  { name: 'Baltimore', count: 312, state: 'MD' },
  { name: 'Milwaukee', count: 234, state: 'WI' },
  { name: 'Miami', count: 478, state: 'FL', featured: true },
  { name: 'Atlanta', count: 445, state: 'GA', featured: true },
  { name: 'New Orleans', count: 367, state: 'LA' },
  { name: 'Orlando', count: 289, state: 'FL' },
  { name: 'Tampa', count: 267, state: 'FL' },
  { name: 'Minneapolis', count: 312, state: 'MN' },
  { name: 'St. Louis', count: 234, state: 'MO' },
  { name: 'Pittsburgh', count: 198, state: 'PA' },
  { name: 'Cincinnati', count: 167, state: 'OH' },
  { name: 'Sacramento', count: 223, state: 'CA' },
];

// Group cities by state
const citiesByState = popularCities.reduce((acc, city) => {
  if (!acc[city.state]) {
    acc[city.state] = [];
  }
  acc[city.state].push(city);
  return acc;
}, {} as Record<string, typeof popularCities>);

export default function CitiesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Popular Cities</h1>
          <p className="text-lg text-gray-600">
            Discover great restaurants in cities across the country
          </p>
        </div>

        {/* Featured Cities */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Featured Cities</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularCities
              .filter(city => city.featured)
              .map((city) => (
                <Link
                  key={city.name}
                  href={`/restaurants?city=${encodeURIComponent(city.name.toLowerCase())}`}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 block"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{city.name}</h3>
                      <p className="text-sm text-gray-600">{city.state}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-red-600">{city.count}</p>
                      <p className="text-sm text-gray-600">restaurants</p>
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </section>

        {/* All Cities by State */}
        <section>
          <h2 className="text-2xl font-semibold mb-6">All Cities by State</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Object.entries(citiesByState)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([state, cities]) => (
                <div key={state} className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                    {state}
                  </h3>
                  <ul className="space-y-2">
                    {cities
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((city) => (
                        <li key={city.name}>
                          <Link
                            href={`/restaurants?city=${encodeURIComponent(city.name.toLowerCase())}`}
                            className="flex justify-between items-center text-gray-700 hover:text-red-600 transition-colors"
                          >
                            <span>{city.name}</span>
                            <span className="text-sm text-gray-500">({city.count})</span>
                          </Link>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
          </div>
        </section>

        {/* Search by Location */}
        <section className="mt-12 bg-white rounded-lg shadow-sm p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">Can't find your city?</h2>
          <p className="text-gray-600 mb-6">
            Use our search to find restaurants near you or in any location
          </p>
          <Link
            href="/restaurants"
            className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
          >
            Search All Restaurants
          </Link>
        </section>

        {/* Stats Section */}
        <section className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-3xl font-bold text-red-600 mb-2">40+</div>
            <p className="text-gray-600">Cities Available</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-3xl font-bold text-red-600 mb-2">10,000+</div>
            <p className="text-gray-600">Restaurants</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-3xl font-bold text-red-600 mb-2">50+</div>
            <p className="text-gray-600">New Cities Coming Soon</p>
          </div>
        </section>
      </div>
    </div>
  );
}