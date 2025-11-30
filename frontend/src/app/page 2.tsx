export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl font-bold text-center mb-8">
          OpenTable Clone
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-semibold mb-4">Find Your Perfect Table</h2>
          <p className="text-gray-600 mb-6">Reserve at the best restaurants near you</p>
          
          <form className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="📍 Location"
              className="px-4 py-3 border rounded-lg"
            />
            <input
              type="date"
              className="px-4 py-3 border rounded-lg"
            />
            <select className="px-4 py-3 border rounded-lg">
              <option>7:00 PM</option>
              <option>7:30 PM</option>
              <option>8:00 PM</option>
            </select>
            <button
              type="submit"
              className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700"
            >
              Find Restaurants
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400"
              alt="Restaurant"
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <h3 className="text-xl font-semibold">The French Laundry</h3>
              <p className="text-gray-600">French • Yountville, CA</p>
              <div className="flex items-center mt-2">
                <span className="text-yellow-500">⭐ 4.9</span>
                <span className="text-gray-500 ml-2">(2,341 reviews)</span>
              </div>
              <button className="w-full bg-red-600 text-white py-2 rounded-lg mt-4 hover:bg-red-700">
                Reserve Now
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400"
              alt="Restaurant"
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <h3 className="text-xl font-semibold">Le Bernardin</h3>
              <p className="text-gray-600">Seafood • New York, NY</p>
              <div className="flex items-center mt-2">
                <span className="text-yellow-500">⭐ 4.8</span>
                <span className="text-gray-500 ml-2">(1,892 reviews)</span>
              </div>
              <button className="w-full bg-red-600 text-white py-2 rounded-lg mt-4 hover:bg-red-700">
                Reserve Now
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400"
              alt="Restaurant"
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <h3 className="text-xl font-semibold">Eleven Madison Park</h3>
              <p className="text-gray-600">Contemporary • New York, NY</p>
              <div className="flex items-center mt-2">
                <span className="text-yellow-500">⭐ 4.8</span>
                <span className="text-gray-500 ml-2">(2,156 reviews)</span>
              </div>
              <button className="w-full bg-red-600 text-white py-2 rounded-lg mt-4 hover:bg-red-700">
                Reserve Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}