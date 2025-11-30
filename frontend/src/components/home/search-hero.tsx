'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function SearchHero() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('19:00')
  const [partySize, setPartySize] = useState('2')

  const handleSearch = () => {
    const params = new URLSearchParams({
      q: searchQuery,
      date,
      time,
      partySize,
    })
    router.push(`/restaurants?${params.toString()}`)
  }

  // Generate time slots
  const timeSlots = []
  for (let hour = 11; hour <= 22; hour++) {
    for (const minute of ['00', '30']) {
      if (hour === 22 && minute === '30') continue
      timeSlots.push(`${hour.toString().padStart(2, '0')}:${minute}`)
    }
  }

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0]

  return (
    <section className="relative bg-gradient-to-br from-red-50 to-orange-50 py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Find your table for any occasion
          </h1>
          <p className="text-xl text-gray-600">
            Book from thousands of restaurants across the city
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Date Picker */}
              <div className="md:col-span-1">
                <label className="text-xs text-gray-600 mb-1 block">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={today}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              {/* Time Picker */}
              <div className="md:col-span-1">
                <label className="text-xs text-gray-600 mb-1 block">Time</label>
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600"
                >
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>

              {/* Party Size */}
              <div className="md:col-span-1">
                <label className="text-xs text-gray-600 mb-1 block">Party Size</label>
                <select
                  value={partySize}
                  onChange={(e) => setPartySize(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((size) => (
                    <option key={size} value={size.toString()}>
                      {size} {size === 1 ? 'Guest' : 'Guests'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Input */}
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600 mb-1 block">
                  Location, Restaurant, or Cuisine
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="San Francisco, Italian, Joe's Pizza..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                  <button
                    onClick={handleSearch}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600"
                  >
                    🔍
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Popular Searches */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 mb-2">Popular searches:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {['Italian', 'Sushi', 'Steakhouse', 'Mexican', 'Brunch'].map((term) => (
              <button
                key={term}
                onClick={() => {
                  setSearchQuery(term)
                  handleSearch()
                }}
                className="px-3 py-1 text-sm border border-gray-300 rounded-full hover:border-red-600 hover:text-red-600 transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}