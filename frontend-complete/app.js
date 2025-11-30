const { useState, useEffect } = React;

const App = () => {
    const [page, setPage] = useState('home');
    const [user, setUser] = useState(null);
    const [apiStatus, setApiStatus] = useState('checking');
    const [reservationData, setReservationData] = useState({});
    const [step, setStep] = useState(1);
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);
    const [currentRestaurant, setCurrentRestaurant] = useState(null);
    const [loyaltyData, setLoyaltyData] = useState({
        tokenBalance: 1250,
        totalEarned: 3500,
        totalRedeemed: 2250,
        loyaltyTier: 'gold',
        stakingBalance: 500,
        stakingRewards: 45,
        nftCollectibles: [
            { id: 1, name: 'Golden Fork NFT', rarity: 'rare', image: '🍴', value: 150 },
            { id: 2, name: 'Chef Hat Badge', rarity: 'common', image: '👨‍🍳', value: 50 }
        ],
        recentTransactions: [
            { type: 'earn', amount: 50, source: 'reservation', date: '2024-08-15' },
            { type: 'redeem', amount: 100, source: 'discount', date: '2024-08-14' },
            { type: 'stake', amount: 200, source: 'staking', date: '2024-08-13' }
        ]
    });
    const [vrExperiences, setVrExperiences] = useState([
        {
            id: 1,
            title: 'Virtual Wine Tasting at Château Margaux',
            restaurant: 'Virtual Vineyard',
            duration: 60,
            price: 85,
            difficulty: 'beginner',
            image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=400',
            description: 'Experience a guided tour through the famous Bordeaux vineyard with expert sommelier',
            features: ['VR Headset Required', 'Wine Kit Included', 'Live Sommelier']
        },
        {
            id: 2,
            title: 'Master Chef Cooking Class',
            restaurant: 'Smart Kitchen',
            duration: 90,
            price: 120,
            difficulty: 'intermediate',
            image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
            description: 'Learn professional cooking techniques from Michelin-starred chefs',
            features: ['Ingredient Kit Shipped', 'Interactive Recipe', 'Certificate']
        }
    ]);
    const [voiceDevices, setVoiceDevices] = useState([
        { id: 1, name: 'Kitchen Alexa', type: 'alexa', status: 'active', lastUsed: '2 hours ago' },
        { id: 2, name: 'Living Room Google', type: 'google_home', status: 'active', lastUsed: '1 day ago' },
        { id: 3, name: 'iPhone Siri', type: 'siri', status: 'inactive', lastUsed: '3 days ago' }
    ]);
    const [socialGroups, setSocialGroups] = useState([
        {
            id: 1,
            name: 'Tech Foodies',
            members: 8,
            maxMembers: 12,
            nextDining: '2024-08-25',
            restaurant: 'Blockchain Bistro',
            status: 'voting'
        },
        {
            id: 2,
            name: 'Wine Enthusiasts',
            members: 6,
            maxMembers: 8,
            nextDining: '2024-08-30',
            restaurant: 'Virtual Vineyard',
            status: 'confirmed'
        }
    ]);
    const [sustainabilityData, setSustainabilityData] = useState({
        carbonFootprint: 2.4,
        localSourcingScore: 85,
        wasteReduction: 92,
        ecoFriendlyVisits: 23,
        monthlyGoal: 30,
        achievements: ['Green Diner', 'Local Hero', 'Waste Warrior']
    });

    useEffect(() => {
        checkAPI();
        setTimeout(() => setUser({ name: 'John Doe', tokens: 1250, role: 'user' }), 1000);
        
        // Initialize WebSocket for real-time updates
        const ws = new WebSocket('ws://localhost:3001');
        
        ws.onopen = () => {
            console.log('🔗 WebSocket connected for real-time updates');
        };
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            switch(data.type) {
                case 'LOYALTY_UPDATE':
                    setLoyaltyData(prev => ({
                        ...prev,
                        tokenBalance: data.tokenBalance,
                        totalEarned: data.totalEarned
                    }));
                    break;
                case 'RESERVATION_UPDATE':
                    // Handle reservation updates
                    console.log('Reservation updated:', data);
                    break;
                case 'SOCIAL_GROUP_UPDATE':
                    setSocialGroups(prev => 
                        prev.map(group => 
                            group.id === data.groupId 
                                ? { ...group, ...data.updates }
                                : group
                        )
                    );
                    break;
                case 'VR_SESSION_STATUS':
                    console.log('VR session status:', data.status);
                    break;
            }
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        
        return () => {
            ws.close();
        };
    }, []);

    const checkAPI = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/health');
            setApiStatus(res.ok ? 'online' : 'error');
        } catch { setApiStatus('offline'); }
    };

    const features = [
        { icon: '🔗', title: 'Blockchain Loyalty', desc: 'Earn tokens & NFTs' },
        { icon: '🥽', title: 'VR Experiences', desc: 'Virtual restaurant tours' },
        { icon: '🎤', title: 'Voice Booking', desc: 'Alexa, Google, Siri' },
        { icon: '👥', title: 'Social Dining', desc: 'Group coordination' },
        { icon: '🤖', title: 'AI Concierge', desc: 'Smart recommendations' },
        { icon: '🌱', title: 'Sustainability', desc: 'Eco-friendly tracking' }
    ];

    const restaurants = [
        { 
            name: 'Blockchain Bistro', 
            cuisine: 'Modern American', 
            rating: 4.8, 
            price: '$$$', 
            img: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
            description: 'Pioneer in blockchain dining rewards with cutting-edge American cuisine',
            address: '123 Innovation Ave, Tech District',
            hours: '11:30 AM - 11:00 PM',
            phone: '(555) 001-2345',
            features: ['🔗', '🤖', '👥'],
            highlights: ['Farm-to-table ingredients', 'NFT art gallery', 'Smart contract payments'],
            menuSamples: [
                { dish: 'Crypto Caesar Salad', price: '$18', desc: 'Blockchain-verified organic greens' },
                { dish: 'Token Ribeye', price: '$65', desc: '28-day aged, earn 100 tokens' },
                { dish: 'Smart Contract Sushi', price: '$45', desc: 'AI-curated omakase selection' }
            ]
        },
        { 
            name: 'Virtual Vineyard', 
            cuisine: 'Wine & Tapas', 
            rating: 4.9, 
            price: '$$$$', 
            img: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400',
            description: 'Immersive VR wine experiences paired with exquisite Spanish tapas',
            address: '456 Digital Plaza, VR Quarter',
            hours: '5:00 PM - 2:00 AM',
            phone: '(555) 002-3456',
            features: ['🥽', '🎤', '🌱'],
            highlights: ['VR vineyard tours', 'Voice-controlled sommelier', 'Sustainable wines'],
            menuSamples: [
                { dish: 'VR Pairing Flight', price: '$85', desc: 'Virtual vineyard tour with 5 wines' },
                { dish: 'Metaverse Manchego', price: '$28', desc: 'AR-enhanced cheese experience' },
                { dish: 'Digital Paella', price: '$55', desc: 'Traditional recipe, modern presentation' }
            ]
        },
        { 
            name: 'Smart Kitchen', 
            cuisine: 'Tech Fusion', 
            rating: 4.7, 
            price: '$$$', 
            img: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400',
            description: 'AI-powered culinary innovation meets IoT-connected dining',
            address: '789 AI Boulevard, Smart City',
            hours: '7:00 AM - 12:00 AM',
            phone: '(555) 003-4567',
            features: ['🤖', '🎤', '🔗'],
            highlights: ['AI chef recommendations', 'IoT table controls', 'Robot servers'],
            menuSamples: [
                { dish: 'Algorithm Appetizer', price: '$22', desc: 'AI-selected based on your preferences' },
                { dish: 'Neural Network Noodles', price: '$32', desc: 'Machine-learning optimized flavors' },
                { dish: 'Quantum Quinoa Bowl', price: '$28', desc: 'Nutritionally computed superfood mix' }
            ]
        }
    ];

    const Nav = () => (
        <nav className="hero-gradient text-white shadow-lg sticky top-0 z-50">
            <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                <div className="flex items-center space-x-8">
                    <h1 className="text-2xl font-bold">🍽️ OpenTable Clone</h1>
                    <div className="hidden md:flex space-x-6">
                        {['home', 'restaurants', 'reservations', 'features', 'dashboard'].map(p => (
                            <button key={p} onClick={() => setPage(p)} 
                                className={`capitalize px-3 py-1 rounded ${page === p ? 'bg-white/20' : 'hover:bg-white/10'}`}>
                                {p === 'dashboard' ? 'My Dashboard' : p}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    <span className={`text-sm ${apiStatus === 'online' ? 'text-green-300' : 'text-red-300'}`}>
                        {apiStatus === 'online' ? '✅ API Connected' : '❌ API Offline'}
                    </span>
                    {user && (
                        <button onClick={() => setPage('dashboard')} className="bg-white/20 px-4 py-2 rounded">
                            {user.name} ({user.tokens} tokens)
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );

    const Home = () => (
        <div>
            <section className="hero-gradient text-white py-32 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-pink-600/20"></div>
                <div className="container mx-auto px-6 text-center relative z-10">
                    <div className="animate-pulse inline-block px-4 py-2 bg-white/20 rounded-full text-sm mb-6">
                        🚀 NOW LIVE: Blockchain Rewards & VR Experiences
                    </div>
                    <h1 className="text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-200">
                        The Future of Dining
                    </h1>
                    <p className="text-2xl mb-10 opacity-90 max-w-3xl mx-auto">
                        Experience revolutionary dining with blockchain rewards, virtual reality tours, 
                        AI-powered recommendations, and sustainable dining tracking
                    </p>
                    <div className="flex gap-4 justify-center mb-8">
                        <button onClick={() => setPage('reservations')} 
                            className="bg-white text-purple-600 px-10 py-5 rounded-xl font-bold hover:shadow-2xl transform hover:scale-105 transition-all">
                            Make Reservation →
                        </button>
                        <button onClick={() => setPage('features')}
                            className="border-2 border-white px-10 py-5 rounded-xl font-bold hover:bg-white/10 backdrop-blur">
                            Explore Features
                        </button>
                    </div>
                    <div className="flex justify-center gap-8 text-sm opacity-75">
                        <span>✓ 10,000+ Restaurants</span>
                        <span>✓ 1M+ Users</span>
                        <span>✓ $2M+ in Rewards</span>
                    </div>
                </div>
            </section>

            <section className="py-20 bg-gradient-to-b from-purple-50 to-white">
                <div className="container mx-auto px-6">
                    <h2 className="text-5xl font-bold text-center mb-4">Revolutionary Features</h2>
                    <p className="text-xl text-gray-600 text-center mb-12">Industry-first innovations that transform dining</p>
                    <div className="grid md:grid-cols-3 gap-8">
                        {features.map((f, i) => (
                            <div key={i} className="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-2 transition-all border border-purple-100">
                                <div className="text-5xl mb-4 animate-bounce">{f.icon}</div>
                                <h3 className="text-2xl font-bold mb-3 text-gray-800">{f.title}</h3>
                                <p className="text-gray-600 mb-4">{f.desc}</p>
                                <button className="text-purple-600 font-semibold hover:text-purple-800">
                                    Learn more →
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-20 bg-gray-50">
                <div className="container mx-auto px-6">
                    <h2 className="text-4xl font-bold text-center mb-12">Featured Restaurants</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {restaurants.map((r, i) => (
                            <div key={i} className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transform hover:scale-105 transition-all">
                                <div className="relative">
                                    <img src={r.img} alt={r.name} className="w-full h-56 object-cover" />
                                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full">
                                        <span className="text-yellow-500">⭐ {r.rating}</span>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <h3 className="text-2xl font-bold mb-2">{r.name}</h3>
                                    <p className="text-gray-600 mb-4">{r.cuisine} • {r.price}</p>
                                    <div className="flex gap-2 mb-4">
                                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">🔗 Blockchain</span>
                                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">🥽 VR Tour</span>
                                    </div>
                                    <button onClick={() => setPage('reservations')} 
                                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg">
                                        Reserve Now
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="text-center mt-8">
                        <button onClick={() => setPage('restaurants')} className="text-purple-600 font-semibold hover:text-purple-800">
                            View All Restaurants →
                        </button>
                    </div>
                </div>
            </section>

            <section className="py-20 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                <div className="container mx-auto px-6">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-4xl font-bold mb-6">How It Works</h2>
                            <div className="space-y-6">
                                {[
                                    { step: '1', title: 'Browse & Discover', desc: 'Explore restaurants with AI recommendations' },
                                    { step: '2', title: 'Book with Features', desc: 'Add VR tours, voice booking, group dining' },
                                    { step: '3', title: 'Earn Rewards', desc: 'Get blockchain tokens and NFT collectibles' },
                                    { step: '4', title: 'Track Impact', desc: 'Monitor your sustainability score' }
                                ].map((s, i) => (
                                    <div key={i} className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center font-bold text-xl">
                                            {s.step}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold mb-1">{s.title}</h3>
                                            <p className="opacity-90">{s.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-2xl p-8">
                            <h3 className="text-3xl font-bold mb-4">Join 1M+ Diners</h3>
                            <p className="mb-6 opacity-90">Start earning rewards and experiencing the future of dining today</p>
                            <input placeholder="Enter your email" className="w-full px-4 py-3 rounded-lg text-gray-800 mb-4" />
                            <button className="w-full bg-white text-purple-600 py-3 rounded-lg font-bold hover:shadow-xl">
                                Get Started Free
                            </button>
                            <p className="text-sm mt-4 opacity-75">No credit card required • Instant rewards</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-20">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-4xl font-bold mb-12">What Our Users Say</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { name: 'Sarah K.', role: 'Food Enthusiast', text: 'The VR restaurant tours saved me from bad experiences. I love previewing venues!', rating: 5 },
                            { name: 'Mike D.', role: 'Tech Professional', text: 'Blockchain rewards actually have value. I\'ve earned $500+ in tokens!', rating: 5 },
                            { name: 'Emily R.', role: 'Eco Warrior', text: 'Finally a platform that tracks my dining carbon footprint. Game changer!', rating: 5 }
                        ].map((t, i) => (
                            <div key={i} className="bg-white p-8 rounded-2xl shadow-lg">
                                <div className="flex justify-center mb-4">
                                    {[...Array(t.rating)].map((_, i) => <span key={i} className="text-yellow-500 text-xl">⭐</span>)}
                                </div>
                                <p className="text-gray-600 mb-6 italic">"{t.text}"</p>
                                <div className="font-bold">{t.name}</div>
                                <div className="text-sm text-gray-500">{t.role}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );

    const Restaurants = () => {
        const [searchTerm, setSearchTerm] = useState('');
        const [selectedCuisine, setSelectedCuisine] = useState('all');
        const [priceFilter, setPriceFilter] = useState('all');
        
        const allRestaurants = [
            ...restaurants,
            { name: 'Eco Garden', cuisine: 'Vegetarian', rating: 4.6, price: '$$', img: 'https://images.unsplash.com/photo-1540914124281-342587941389?w=400', features: ['🌱', '🤖'] },
            { name: 'Social Table', cuisine: 'International', rating: 4.9, price: '$$$', img: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400', features: ['👥', '🔗'] },
            { name: 'Tech Taste', cuisine: 'Asian Fusion', rating: 4.7, price: '$$$$', img: 'https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?w=400', features: ['🥽', '🎤'] }
        ];
        
        return (
            <div>
                <section className="hero-gradient text-white py-16">
                    <div className="container mx-auto px-6">
                        <h1 className="text-5xl font-bold mb-4">Discover Amazing Restaurants</h1>
                        <p className="text-xl opacity-90">Find your perfect dining experience with advanced features</p>
                    </div>
                </section>
                
                <div className="bg-white sticky top-16 z-40 shadow-lg">
                    <div className="container mx-auto px-6 py-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <input 
                                    placeholder="🔍 Search restaurants, cuisines, features..." 
                                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-purple-600"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <select 
                                className="px-4 py-3 border rounded-lg focus:outline-none focus:border-purple-600"
                                value={selectedCuisine}
                                onChange={e => setSelectedCuisine(e.target.value)}
                            >
                                <option value="all">All Cuisines</option>
                                <option value="american">American</option>
                                <option value="italian">Italian</option>
                                <option value="asian">Asian</option>
                                <option value="vegetarian">Vegetarian</option>
                            </select>
                            <select 
                                className="px-4 py-3 border rounded-lg focus:outline-none focus:border-purple-600"
                                value={priceFilter}
                                onChange={e => setPriceFilter(e.target.value)}
                            >
                                <option value="all">All Prices</option>
                                <option value="$">$ - Budget</option>
                                <option value="$$">$$ - Moderate</option>
                                <option value="$$$">$$$ - Upscale</option>
                                <option value="$$$$">$$$$ - Fine Dining</option>
                            </select>
                            <button className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold">
                                Apply Filters
                            </button>
                        </div>
                        
                        <div className="flex gap-2 mt-4 flex-wrap">
                            {['🔗 Blockchain', '🥽 VR Tours', '🎤 Voice', '👥 Groups', '🌱 Eco-Friendly'].map(tag => (
                                <button key={tag} className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm hover:bg-purple-200">
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                
                <div className="container mx-auto px-6 py-12">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-3xl font-bold">Showing {allRestaurants.length} restaurants</h2>
                        <div className="flex gap-2">
                            <button className="p-2 border rounded hover:bg-gray-100">📊</button>
                            <button className="p-2 border rounded hover:bg-gray-100">🗺️</button>
                        </div>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-8">
                        {allRestaurants.map((r, i) => (
                            <div key={i} className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transform hover:scale-105 transition-all">
                                <div className="relative">
                                    <img src={r.img} alt={r.name} className="w-full h-56 object-cover" />
                                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full">
                                        <span className="text-yellow-500">⭐ {r.rating}</span>
                                    </div>
                                    <div className="absolute bottom-4 left-4 flex gap-2">
                                        {r.features?.map((f, idx) => (
                                            <span key={idx} className="text-2xl bg-white/90 rounded-full p-2">{f}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-6">
                                    <h3 className="text-2xl font-bold mb-2">{r.name}</h3>
                                    <p className="text-gray-600 mb-4">{r.cuisine} • {r.price}</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => {
                                            setCurrentRestaurant(r);
                                            setPage('restaurant-detail');
                                        }} 
                                            className="flex-1 bg-gray-100 text-gray-800 py-3 rounded-xl font-semibold hover:bg-gray-200">
                                            View Details
                                        </button>
                                        <button onClick={() => {
                                            setSelectedRestaurant(r.name);
                                            setReservationData({...reservationData, restaurant: r.name});
                                            setPage('reservations');
                                        }} 
                                            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg">
                                            Reserve →
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const Reservations = () => {
        // If coming from restaurant page, ensure the restaurant is pre-selected
        useEffect(() => {
            if (selectedRestaurant && !reservationData.restaurant) {
                setReservationData({...reservationData, restaurant: selectedRestaurant});
            }
        }, [selectedRestaurant]);
        
        return (
        <div className="container mx-auto px-6 py-12 max-w-2xl">
            <h1 className="text-4xl font-bold mb-8 text-center">Make a Reservation</h1>
            
            <div className="flex justify-center mb-8">
                {[1,2,3,4].map(s => (
                    <div key={s} className="flex items-center">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white
                            ${step === s ? 'bg-purple-600' : step > s ? 'bg-green-600' : 'bg-gray-300'}`}>
                            {step > s ? '✓' : s}
                        </div>
                        {s < 4 && <div className={`w-16 h-1 ${step > s ? 'bg-green-600' : 'bg-gray-300'}`} />}
                    </div>
                ))}
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg">
                {step === 1 && (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold mb-4">Select Date & Time</h2>
                        
                        {/* Show selected restaurant if coming from restaurant page */}
                        {selectedRestaurant && (
                            <div className="bg-purple-100 border border-purple-300 p-4 rounded-lg mb-4">
                                <p className="text-sm text-purple-600 font-semibold">Selected Restaurant:</p>
                                <p className="text-xl font-bold text-purple-800">{selectedRestaurant}</p>
                            </div>
                        )}
                        
                        <select 
                            value={reservationData.restaurant || selectedRestaurant || ''} 
                            onChange={e => setReservationData({...reservationData, restaurant: e.target.value})}
                            className="w-full p-3 border rounded"
                        >
                            <option value="">Select Restaurant</option>
                            {restaurants.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                        </select>
                        <input 
                            type="date" 
                            value={reservationData.date || ''}
                            onChange={e => setReservationData({...reservationData, date: e.target.value})}
                            className="w-full p-3 border rounded" 
                        />
                        <select 
                            value={reservationData.time || ''}
                            onChange={e => setReservationData({...reservationData, time: e.target.value})}
                            className="w-full p-3 border rounded"
                        >
                            <option value="">Select Time</option>
                            {['6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select
                            value={reservationData.guests || ''}
                            onChange={e => setReservationData({...reservationData, guests: e.target.value})}
                            className="w-full p-3 border rounded"
                        >
                            <option value="">Number of Guests</option>
                            {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>)}
                        </select>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold mb-4">Guest Details</h2>
                        <input 
                            placeholder="First Name" 
                            value={reservationData.firstName || ''}
                            onChange={e => setReservationData({...reservationData, firstName: e.target.value})}
                            className="w-full p-3 border rounded" 
                        />
                        <input 
                            placeholder="Last Name" 
                            value={reservationData.lastName || ''}
                            onChange={e => setReservationData({...reservationData, lastName: e.target.value})}
                            className="w-full p-3 border rounded" 
                        />
                        <input 
                            placeholder="Email" 
                            type="email" 
                            value={reservationData.email || ''}
                            onChange={e => setReservationData({...reservationData, email: e.target.value})}
                            className="w-full p-3 border rounded" 
                        />
                        <input 
                            placeholder="Phone" 
                            type="tel" 
                            value={reservationData.phone || ''}
                            onChange={e => setReservationData({...reservationData, phone: e.target.value})}
                            className="w-full p-3 border rounded" 
                        />
                        <textarea
                            placeholder="Special Requests (optional)"
                            value={reservationData.specialRequests || ''}
                            onChange={e => setReservationData({...reservationData, specialRequests: e.target.value})}
                            className="w-full p-3 border rounded h-24"
                        />
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold mb-4">Special Features</h2>
                        <div className="space-y-3">
                            {[
                                { id: 'vr', label: '🥽 VR Experience', desc: 'Virtual tour of restaurant' },
                                { id: 'voice', label: '🎤 Voice Booking', desc: 'Confirm via Alexa/Google' },
                                { id: 'social', label: '👥 Social Dining', desc: 'Join other diners' },
                                { id: 'ai', label: '🤖 AI Concierge', desc: 'Personalized recommendations' },
                                { id: 'blockchain', label: '🔗 Blockchain Rewards', desc: 'Earn 2x tokens' }
                            ].map(f => (
                                <label key={f.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50 cursor-pointer">
                                    <div>
                                        <span className="font-semibold">{f.label}</span>
                                        <p className="text-sm text-gray-600">{f.desc}</p>
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        checked={reservationData.features?.[f.id] || false}
                                        onChange={e => setReservationData({
                                            ...reservationData, 
                                            features: {...(reservationData.features || {}), [f.id]: e.target.checked}
                                        })}
                                        className="w-5 h-5" 
                                    />
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="text-center space-y-4">
                        <div className="text-6xl">🎉</div>
                        <h2 className="text-3xl font-bold text-green-600">Reservation Confirmed!</h2>
                        <div className="bg-gray-50 p-6 rounded text-left">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600">Restaurant</p>
                                    <p className="font-semibold">{reservationData.restaurant || 'Not selected'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Date</p>
                                    <p className="font-semibold">{reservationData.date ? new Date(reservationData.date).toLocaleDateString() : 'Not selected'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Time</p>
                                    <p className="font-semibold">{reservationData.time || 'Not selected'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Guests</p>
                                    <p className="font-semibold">{reservationData.guests || '1'} {reservationData.guests === '1' ? 'Guest' : 'Guests'}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-sm text-gray-600">Name</p>
                                    <p className="font-semibold">{reservationData.firstName} {reservationData.lastName}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-sm text-gray-600">Contact</p>
                                    <p className="font-semibold">{reservationData.email} • {reservationData.phone}</p>
                                </div>
                            </div>
                            {reservationData.specialRequests && (
                                <div className="mt-4 pt-4 border-t">
                                    <p className="text-sm text-gray-600">Special Requests</p>
                                    <p className="font-semibold">{reservationData.specialRequests}</p>
                                </div>
                            )}
                            <div className="mt-4 pt-4 border-t">
                                <p className="text-green-600 font-bold text-center">+50 Loyalty Tokens Earned! 🪙</p>
                                {reservationData.features?.blockchain && (
                                    <p className="text-purple-600 text-sm text-center mt-1">2x Blockchain Bonus Active!</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="flex justify-between mt-8">
                    {step > 1 && step < 4 && (
                        <button onClick={() => setStep(step - 1)} className="px-6 py-2 border rounded hover:bg-gray-50">
                            Previous
                        </button>
                    )}
                    {step < 4 ? (
                        <button onClick={() => setStep(step + 1)} className="ml-auto px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
                            {step === 3 ? 'Confirm Reservation' : 'Next →'}
                        </button>
                    ) : (
                        <button onClick={() => {setStep(1); setSelectedRestaurant(null); setReservationData({}); setPage('dashboard');}} className="mx-auto px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700">
                            Go to Dashboard
                        </button>
                    )}
                </div>
            </div>
        </div>
        );
    };

    const Features = () => {
        const [activeFeature, setActiveFeature] = useState(null);
        
        const featuresDetailed = [
            { 
                icon: '🔗', 
                title: 'Blockchain Loyalty', 
                desc: 'Revolutionary token-based rewards system', 
                color: 'from-blue-500 to-cyan-500',
                details: ['Earn tokens with every reservation', 'Smart contract security', 'NFT badges for milestones', 'Trade tokens for rewards', 'Governance voting rights'],
                stats: { users: '500K+', rewards: '$2M+', tokens: '10M+' }
            },
            { 
                icon: '🥽', 
                title: 'VR Experiences', 
                desc: 'Immersive virtual restaurant tours', 
                color: 'from-purple-500 to-pink-500',
                details: ['360° restaurant tours', 'Virtual cooking classes', 'Meet the chef virtually', 'Preview ambiance', 'VR menu exploration'],
                stats: { tours: '100K+', classes: '500+', satisfaction: '98%' }
            },
            { 
                icon: '🎤', 
                title: 'Voice Integration', 
                desc: 'Book with your voice assistant', 
                color: 'from-green-500 to-teal-500',
                details: ['Alexa integration', 'Google Home support', 'Siri shortcuts', 'Natural language booking', 'Voice confirmations'],
                stats: { devices: '1M+', bookings: '50K+', accuracy: '99.5%' }
            },
            { 
                icon: '👥', 
                title: 'Social Dining', 
                desc: 'Coordinate group reservations easily', 
                color: 'from-orange-500 to-red-500',
                details: ['Group polls for venues', 'Split bill calculator', 'Dietary preference matching', 'Calendar sync', 'Real-time chat'],
                stats: { groups: '200K+', events: '1M+', saved: '10M mins' }
            },
            { 
                icon: '🤖', 
                title: 'AI Concierge', 
                desc: 'GPT-powered dining assistant', 
                color: 'from-indigo-500 to-purple-500',
                details: ['Personalized recommendations', 'Menu explanations', 'Wine pairings', 'Allergy alerts', 'Taste profile learning'],
                stats: { recommendations: '5M+', accuracy: '95%', languages: '50+' }
            },
            { 
                icon: '🌱', 
                title: 'Sustainability', 
                desc: 'Track your dining carbon footprint', 
                color: 'from-green-400 to-emerald-500',
                details: ['Carbon footprint tracking', 'Eco-certified restaurants', 'Plant-based rewards', 'Local sourcing info', 'Waste reduction metrics'],
                stats: { co2Saved: '1000t', ecoRestaurants: '5K+', trees: '50K+' }
            }
        ];
        
        return (
            <div>
                <section className="hero-gradient text-white py-20">
                    <div className="container mx-auto px-6 text-center">
                        <h1 className="text-6xl font-bold mb-6">Revolutionary Features</h1>
                        <p className="text-2xl opacity-90 max-w-3xl mx-auto">
                            Industry-first innovations that transform how you discover, book, and experience dining
                        </p>
                    </div>
                </section>
                
                <div className="container mx-auto px-6 py-16">
                    <div className="grid lg:grid-cols-2 gap-8">
                        {featuresDetailed.map((f, i) => (
                            <div key={i} className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all">
                                <div className={`h-2 bg-gradient-to-r ${f.color}`}></div>
                                <div className="p-8">
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className={`w-20 h-20 bg-gradient-to-r ${f.color} rounded-2xl flex items-center justify-center text-4xl flex-shrink-0`}>
                                            {f.icon}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-3xl font-bold mb-2">{f.title}</h3>
                                            <p className="text-gray-600 text-lg">{f.desc}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3 mb-6">
                                        {f.details.map((d, idx) => (
                                            <div key={idx} className="flex items-center gap-3">
                                                <span className="text-green-500">✓</span>
                                                <span className="text-gray-700">{d}</span>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl mb-6">
                                        {Object.entries(f.stats).map(([key, value]) => (
                                            <div key={key} className="text-center">
                                                <div className="text-2xl font-bold text-gray-800">{value}</div>
                                                <div className="text-xs text-gray-500 capitalize">{key}</div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <button 
                                        onClick={() => setActiveFeature(f)}
                                        className={`w-full bg-gradient-to-r ${f.color} text-white py-3 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all`}
                                    >
                                        Try {f.title} Now →
                                    </button>
                                </div>
                            </div>
                        ))}
                                    </div>
                                    
                                    <div className="mt-16 text-center bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-12 text-white">
                                        <h2 className="text-4xl font-bold mb-4">Ready to Experience the Future?</h2>
                                        <p className="text-xl opacity-90 mb-8">Join millions using next-gen dining features</p>
                                        <button onClick={() => setPage('reservations')} className="bg-white text-purple-600 px-8 py-4 rounded-xl font-bold text-lg hover:shadow-2xl">
                                            Start Your Journey →
                                        </button>
                                    </div>
                </div>
            </div>
        );
    };

    const Dashboard = () => {
        const [activeTab, setActiveTab] = useState('overview');
        
        const tabs = [
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'rewards', label: 'Rewards', icon: '🎁' },
            { id: 'reservations', label: 'Reservations', icon: '📅' },
            { id: 'social', label: 'Social', icon: '👥' },
            { id: 'sustainability', label: 'Eco Impact', icon: '🌱' }
        ];
        
        const TabContent = () => {
            switch(activeTab) {
                case 'overview':
                    return (
                        <div>
                            <div className="grid lg:grid-cols-4 gap-6 mb-8">
                                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl text-white">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="opacity-90 text-sm">Loyalty Tokens</p>
                                            <p className="text-3xl font-bold">1,250</p>
                                        </div>
                                        <span className="text-3xl">🪙</span>
                                    </div>
                                    <div className="bg-white/20 rounded-lg p-2 text-xs">
                                        +125 this month
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl text-white">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="opacity-90 text-sm">Total Reservations</p>
                                        <p className="text-3xl font-bold">156</p>
                                    </div>
                                    <span className="text-3xl">📅</span>
                                </div>
                                <div className="bg-white/20 rounded-lg p-2 text-xs">
                                    12 this month
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl text-white">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="opacity-90 text-sm">Reviews Given</p>
                                        <p className="text-3xl font-bold">48</p>
                                    </div>
                                    <span className="text-3xl">⭐</span>
                                </div>
                                <div className="bg-white/20 rounded-lg p-2 text-xs">
                                    4.8 avg rating
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-xl text-white">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="opacity-90 text-sm">NFT Badges</p>
                                        <p className="text-3xl font-bold">7</p>
                                    </div>
                                    <span className="text-3xl">🏆</span>
                                </div>
                                <div className="bg-white/20 rounded-lg p-2 text-xs">
                                    2 rare badges
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid lg:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-xl shadow-lg">
                                <h3 className="text-xl font-bold mb-4">Recent Activity</h3>
                                <div className="space-y-3">
                                    {[
                                        { action: 'Reservation at The Modern', time: '2 days ago', icon: '🍽️' },
                                        { action: 'Earned 100 tokens', time: '5 days ago', icon: '🪙' },
                                        { action: 'VR cooking class completed', time: '1 week ago', icon: '🥽' },
                                        { action: 'Group dinner organized', time: '2 weeks ago', icon: '👥' }
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                                            <span className="text-2xl">{item.icon}</span>
                                            <div className="flex-1">
                                                <p className="font-medium">{item.action}</p>
                                                <p className="text-sm text-gray-500">{item.time}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="bg-white p-6 rounded-xl shadow-lg">
                                <h3 className="text-xl font-bold mb-4">Upcoming Reservations</h3>
                                <div className="space-y-3">
                                    {[
                                        { restaurant: 'Le Bernardin', date: 'Tomorrow, 7:30 PM', guests: 2 },
                                        { restaurant: 'Nobu Downtown', date: 'Friday, 8:00 PM', guests: 4 },
                                        { restaurant: 'The Modern', date: 'Next Monday, 6:30 PM', guests: 2 }
                                    ].map((res, i) => (
                                        <div key={i} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition">
                                            <p className="font-bold text-lg">{res.restaurant}</p>
                                            <p className="text-gray-600">{res.date}</p>
                                            <p className="text-sm text-gray-500">{res.guests} guests</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );
                
            case 'rewards':
                return (
                    <div className="space-y-6">
                        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-8 rounded-2xl text-white">
                            <h3 className="text-2xl font-bold mb-2">Your Reward Status</h3>
                            <p className="text-4xl font-bold mb-4">Gold Member</p>
                            <div className="bg-white/20 rounded-lg p-4">
                                <p>250 tokens to Platinum</p>
                                <div className="w-full bg-white/30 rounded-full h-3 mt-2">
                                    <div className="bg-white rounded-full h-3 w-4/5"></div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid lg:grid-cols-3 gap-4">
                            {[
                                { reward: '$25 Credit', cost: '500 tokens', available: true },
                                { reward: 'VR Experience', cost: '750 tokens', available: true },
                                { reward: 'NFT Badge', cost: '1000 tokens', available: true },
                                { reward: 'Chef Table', cost: '2000 tokens', available: false },
                                { reward: 'Wine Tasting', cost: '300 tokens', available: true },
                                { reward: 'Cooking Class', cost: '600 tokens', available: true }
                            ].map((item, i) => (
                                <div key={i} className={`p-4 rounded-lg border-2 ${item.available ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50 opacity-60'}`}>
                                    <h4 className="font-bold text-lg">{item.reward}</h4>
                                    <p className="text-gray-600 mb-3">{item.cost}</p>
                                    <button className={`w-full py-2 rounded-lg font-semibold ${item.available ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                                        {item.available ? 'Redeem' : 'Locked'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                );
                
            case 'social':
                return (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-lg">
                            <h3 className="text-xl font-bold mb-4">Your Dining Groups</h3>
                            <div className="grid lg:grid-cols-2 gap-4">
                                {[
                                    { name: 'Weekend Foodies', members: 8, nextEvent: 'Saturday Brunch' },
                                    { name: 'Wine Club', members: 12, nextEvent: 'Tasting Night' },
                                    { name: 'Date Nights', members: 2, nextEvent: 'Anniversary Dinner' }
                                ].map((group, i) => (
                                    <div key={i} className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                                        <h4 className="font-bold text-lg">{group.name}</h4>
                                        <p className="text-gray-600">{group.members} members</p>
                                        <p className="text-sm text-purple-600 mt-2">Next: {group.nextEvent}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-lg">
                            <h3 className="text-xl font-bold mb-4">Blockchain Activity</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between p-3 bg-blue-50 rounded">
                                    <span>Token Reward</span>
                                    <span className="text-blue-600 font-bold">+50 🪙</span>
                                </div>
                                <div className="flex justify-between p-3 bg-purple-50 rounded">
                                    <span>NFT Badge Earned</span>
                                    <span className="text-purple-600">🏆 VR Explorer</span>
                                </div>
                                <div className="flex justify-between p-3 bg-green-50 rounded">
                                    <span>Eco Points</span>
                                    <span className="text-green-600 font-bold">+25 🌱</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
                
            case 'sustainability':
                return (
                    <div className="space-y-6">
                        <div className="bg-gradient-to-r from-green-400 to-emerald-500 p-8 rounded-2xl text-white">
                            <h3 className="text-2xl font-bold mb-4">Your Eco Impact</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <p className="text-3xl font-bold">42kg</p>
                                    <p className="opacity-90">CO₂ Saved</p>
                                </div>
                                <div>
                                    <p className="text-3xl font-bold">28</p>
                                    <p className="opacity-90">Eco Meals</p>
                                </div>
                                <div>
                                    <p className="text-3xl font-bold">15</p>
                                    <p className="opacity-90">Trees Planted</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-white p-6 rounded-xl shadow-lg">
                            <h3 className="text-xl font-bold mb-4">Eco Achievements</h3>
                            <div className="space-y-3">
                                {[
                                    { badge: '🌱 Plant Pioneer', desc: 'Ordered 10 plant-based meals', earned: true },
                                    { badge: '🚴 Local Hero', desc: 'Visited 5 local restaurants', earned: true },
                                    { badge: '♻️ Zero Waste', desc: 'Completed zero-waste dining', earned: false }
                                ].map((achievement, i) => (
                                    <div key={i} className={`p-3 rounded-lg ${achievement.earned ? 'bg-green-50' : 'bg-gray-50'}`}>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-bold">{achievement.badge}</p>
                                                <p className="text-sm text-gray-600">{achievement.desc}</p>
                                            </div>
                                            {achievement.earned && <span className="text-green-500">✓</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
                
            default:
                return (
                    <div className="bg-white p-6 rounded-xl shadow-lg">
                        <h3 className="text-xl font-bold mb-4">All Reservations</h3>
                        <div className="space-y-3">
                            {[
                                { restaurant: 'Le Bernardin', date: 'Tomorrow, 7:30 PM', status: 'Confirmed', statusColor: 'green' },
                                { restaurant: 'Nobu Downtown', date: 'Friday, 8:00 PM', status: 'Confirmed', statusColor: 'green' },
                                { restaurant: 'The Modern', date: 'Next Monday, 6:30 PM', status: 'Pending', statusColor: 'yellow' },
                                { restaurant: 'Eleven Madison', date: 'Last Week', status: 'Completed', statusColor: 'blue' }
                            ].map((res, i) => (
                                <div key={i} className="p-4 border rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="font-bold">{res.restaurant}</p>
                                        <p className="text-gray-600">{res.date}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-sm font-semibold bg-${res.statusColor}-100 text-${res.statusColor}-700`}>
                                        {res.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
        }
    };
        
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="hero-gradient text-white py-12">
                <div className="container mx-auto px-6">
                    <h1 className="text-4xl font-bold mb-2">Welcome back, {user?.name}! 👋</h1>
                    <p className="opacity-90">Manage your dining experiences and rewards</p>
                </div>
            </div>
            
            <div className="container mx-auto px-6 py-8">
                <div className="bg-white rounded-xl shadow-sm mb-6">
                    <div className="flex overflow-x-auto border-b">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-4 font-semibold whitespace-nowrap transition-all ${
                                    activeTab === tab.id 
                                        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                            >
                                <span className="text-xl">{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
                
                <TabContent />
            </div>
        </div>
    );
};

const RestaurantDetail = () => {
    if (!currentRestaurant) {
        setPage('restaurants');
        return null;
    }
    
    const [activeTab, setActiveTab] = useState('overview');
    const [imageIndex, setImageIndex] = useState(0);
    
    const images = [
        currentRestaurant.img,
        'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800',
        'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800',
        'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?w=800'
    ];
    
    const reviews = [
        { name: 'Sarah M.', rating: 5, date: '2 days ago', text: 'Absolutely incredible! The blockchain rewards made it even better.' },
        { name: 'John D.', rating: 4, date: '1 week ago', text: 'Great atmosphere and innovative features. Will definitely return!' },
        { name: 'Emily R.', rating: 5, date: '2 weeks ago', text: 'The VR wine pairing was mind-blowing. Never experienced anything like it!' }
    ];
    
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero Section with Image Gallery */}
            <div className="relative h-96 overflow-hidden">
                <img src={images[imageIndex]} alt={currentRestaurant.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                    <h1 className="text-5xl font-bold mb-2">{currentRestaurant.name}</h1>
                    <div className="flex items-center gap-4 text-lg">
                        <span className="flex items-center gap-1">
                            ⭐ {currentRestaurant.rating}
                        </span>
                        <span>{currentRestaurant.cuisine}</span>
                        <span>{currentRestaurant.price}</span>
                        <div className="flex gap-2 ml-4">
                            {currentRestaurant.features.map((f, i) => (
                                <span key={i} className="text-2xl bg-white/20 backdrop-blur px-2 py-1 rounded">{f}</span>
                            ))}
                        </div>
                    </div>
                </div>
                
                {/* Image Gallery Thumbnails */}
                <div className="absolute bottom-4 right-4 flex gap-2">
                    {images.map((img, i) => (
                        <button
                            key={i}
                            onClick={() => setImageIndex(i)}
                            className={`w-16 h-16 rounded overflow-hidden border-2 ${
                                i === imageIndex ? 'border-white' : 'border-white/50'
                            }`}
                        >
                            <img src={img} alt="" className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            </div>
            
            {/* Quick Actions Bar */}
            <div className="bg-white shadow-lg sticky top-16 z-40">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setActiveTab('overview')}
                                className={`px-4 py-2 rounded-lg font-semibold ${
                                    activeTab === 'overview' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                Overview
                            </button>
                            <button 
                                onClick={() => setActiveTab('menu')}
                                className={`px-4 py-2 rounded-lg font-semibold ${
                                    activeTab === 'menu' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                Menu
                            </button>
                            <button 
                                onClick={() => setActiveTab('reviews')}
                                className={`px-4 py-2 rounded-lg font-semibold ${
                                    activeTab === 'reviews' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                Reviews
                            </button>
                        </div>
                        <button 
                            onClick={() => {
                                setSelectedRestaurant(currentRestaurant.name);
                                setReservationData({...reservationData, restaurant: currentRestaurant.name});
                                setPage('reservations');
                            }}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg"
                        >
                            Reserve Table →
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="container mx-auto px-6 py-8">
                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                <div className="bg-white rounded-xl p-6 shadow-sm">
                                    <h2 className="text-2xl font-bold mb-4">About</h2>
                                    <p className="text-gray-700 text-lg mb-6">{currentRestaurant.description}</p>
                                    
                                    <h3 className="text-xl font-bold mb-3">Highlights</h3>
                                    <div className="space-y-2 mb-6">
                                        {currentRestaurant.highlights.map((h, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <span className="text-green-500">✓</span>
                                                <span>{h}</span>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <h3 className="text-xl font-bold mb-3">Available Features</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { icon: '🔗', name: 'Blockchain Rewards', desc: 'Earn tokens with every visit' },
                                            { icon: '🥽', name: 'VR Experiences', desc: 'Virtual tours available' },
                                            { icon: '🎤', name: 'Voice Booking', desc: 'Book with Alexa or Google' },
                                            { icon: '🤖', name: 'AI Concierge', desc: 'Personalized recommendations' },
                                            { icon: '👥', name: 'Group Dining', desc: 'Easy group reservations' },
                                            { icon: '🌱', name: 'Eco-Friendly', desc: 'Track your carbon footprint' }
                                        ].filter(f => currentRestaurant.features.includes(f.icon)).map((f, i) => (
                                            <div key={i} className="flex gap-3 p-3 bg-purple-50 rounded-lg">
                                                <span className="text-2xl">{f.icon}</span>
                                                <div>
                                                    <p className="font-semibold">{f.name}</p>
                                                    <p className="text-sm text-gray-600">{f.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'menu' && (
                            <div className="bg-white rounded-xl p-6 shadow-sm">
                                <h2 className="text-2xl font-bold mb-6">Menu Highlights</h2>
                                <div className="space-y-6">
                                    {currentRestaurant.menuSamples.map((item, i) => (
                                        <div key={i} className="border-b pb-4 last:border-0">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="text-xl font-semibold">{item.dish}</h3>
                                                <span className="text-lg font-bold text-purple-600">{item.price}</span>
                                            </div>
                                            <p className="text-gray-600">{item.desc}</p>
                                        </div>
                                    ))}
                                </div>
                                <button className="mt-6 text-purple-600 font-semibold hover:text-purple-700">
                                    View Full Menu →
                                </button>
                            </div>
                        )}
                        
                        {activeTab === 'reviews' && (
                            <div className="space-y-4">
                                <div className="bg-white rounded-xl p-6 shadow-sm">
                                    <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>
                                    <div className="flex items-center gap-4 mb-6 p-4 bg-purple-50 rounded-lg">
                                        <div className="text-4xl font-bold">{currentRestaurant.rating}</div>
                                        <div>
                                            <div className="flex text-yellow-400 text-xl">
                                                {'★'.repeat(Math.round(currentRestaurant.rating))}
                                            </div>
                                            <p className="text-gray-600">Based on 324 reviews</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        {reviews.map((r, i) => (
                                            <div key={i} className="border-b pb-4 last:border-0">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <p className="font-semibold">{r.name}</p>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-yellow-400">{'★'.repeat(r.rating)}</span>
                                                            <span className="text-sm text-gray-500">{r.date}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="text-gray-700">{r.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl p-6 shadow-sm">
                            <h3 className="text-xl font-bold mb-4">Location & Hours</h3>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-sm text-gray-500">Address</p>
                                    <p className="font-semibold">{currentRestaurant.address}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Hours</p>
                                    <p className="font-semibold">{currentRestaurant.hours}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Phone</p>
                                    <p className="font-semibold">{currentRestaurant.phone}</p>
                                </div>
                            </div>
                            <button className="w-full mt-4 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200">
                                📍 Get Directions
                            </button>
                        </div>
                        
                        <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-6 text-white">
                            <h3 className="text-xl font-bold mb-2">Earn Rewards!</h3>
                            <p className="mb-4">Get 50 tokens for dining here</p>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <span>🪙</span>
                                    <span>+50 base tokens</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span>🎁</span>
                                    <span>2x points on weekends</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span>🏆</span>
                                    <span>NFT badge after 5 visits</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

    // Dashboard Component with all disruptive features
    const Dashboard = () => {
        const [activeTab, setActiveTab] = useState('overview');
        
        const tabs = [
            { id: 'overview', name: 'Overview', icon: '📊' },
            { id: 'blockchain', name: 'Blockchain', icon: '🔗' },
            { id: 'vr', name: 'VR Experiences', icon: '🥽' },
            { id: 'voice', name: 'Voice Control', icon: '🎤' },
            { id: 'ai', name: 'AI Concierge', icon: '🤖' },
            { id: 'social', name: 'Social Dining', icon: '👥' },
            { id: 'sustainability', name: 'Sustainability', icon: '🌱' }
        ];

        return (
            <div className="min-h-screen bg-gray-50">
                <div className="bg-white border-b sticky top-16 z-40">
                    <div className="container mx-auto px-6">
                        <div className="flex space-x-8 overflow-x-auto">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 py-4 px-2 border-b-2 whitespace-nowrap ${
                                        activeTab === tab.id 
                                            ? 'border-purple-600 text-purple-600' 
                                            : 'border-transparent text-gray-600 hover:text-purple-600'
                                    }`}
                                >
                                    <span>{tab.icon}</span>
                                    <span className="font-medium">{tab.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="container mx-auto px-6 py-8">
                    {activeTab === 'overview' && (
                        <div>
                            <h1 className="text-4xl font-bold mb-8">Welcome back, {user?.name}! 🎉</h1>
                            
                            {/* Quick Stats */}
                            <div className="grid md:grid-cols-4 gap-6 mb-8">
                                <div className="bg-white p-6 rounded-xl shadow-lg">
                                    <div className="text-3xl mb-2">🪙</div>
                                    <div className="text-2xl font-bold">{loyaltyData.tokenBalance}</div>
                                    <div className="text-gray-600">OTT Tokens</div>
                                </div>
                                <div className="bg-white p-6 rounded-xl shadow-lg">
                                    <div className="text-3xl mb-2">🍽️</div>
                                    <div className="text-2xl font-bold">23</div>
                                    <div className="text-gray-600">Reservations</div>
                                </div>
                                <div className="bg-white p-6 rounded-xl shadow-lg">
                                    <div className="text-3xl mb-2">🥽</div>
                                    <div className="text-2xl font-bold">5</div>
                                    <div className="text-gray-600">VR Experiences</div>
                                </div>
                                <div className="bg-white p-6 rounded-xl shadow-lg">
                                    <div className="text-3xl mb-2">🌱</div>
                                    <div className="text-2xl font-bold">92%</div>
                                    <div className="text-gray-600">Eco Score</div>
                                </div>
                            </div>

                            {/* Recent Activity */}
                            <div className="bg-white p-6 rounded-xl shadow-lg">
                                <h3 className="text-2xl font-bold mb-4">Recent Activity</h3>
                                <div className="space-y-4">
                                    {[
                                        { icon: '🔗', text: 'Earned 50 tokens from Blockchain Bistro reservation', time: '2 hours ago' },
                                        { icon: '🥽', text: 'Completed VR wine tasting experience', time: '1 day ago' },
                                        { icon: '👥', text: 'Joined "Tech Foodies" dining group', time: '2 days ago' },
                                        { icon: '🌱', text: 'Achieved "Green Diner" sustainability badge', time: '3 days ago' }
                                    ].map((activity, i) => (
                                        <div key={i} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg">
                                            <div className="text-2xl">{activity.icon}</div>
                                            <div className="flex-1">
                                                <div className="font-medium">{activity.text}</div>
                                                <div className="text-sm text-gray-500">{activity.time}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'blockchain' && (
                        <div>
                            <h2 className="text-3xl font-bold mb-6">🔗 Blockchain Loyalty</h2>
                            <div className="grid md:grid-cols-3 gap-6">
                                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl">
                                    <div className="text-2xl mb-2">🪙</div>
                                    <div className="text-3xl font-bold">{loyaltyData.tokenBalance}</div>
                                    <div className="text-purple-100">Available Tokens</div>
                                </div>
                                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl">
                                    <div className="text-2xl mb-2">🔒</div>
                                    <div className="text-3xl font-bold">{loyaltyData.stakingBalance}</div>
                                    <div className="text-green-100">Staked Tokens</div>
                                </div>
                                <div className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white p-6 rounded-xl">
                                    <div className="text-2xl mb-2">👑</div>
                                    <div className="text-3xl font-bold capitalize">{loyaltyData.loyaltyTier}</div>
                                    <div className="text-yellow-100">Current Tier</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'vr' && (
                        <div>
                            <h2 className="text-3xl font-bold mb-6">🥽 Virtual Experiences</h2>
                            <div className="grid md:grid-cols-2 gap-6">
                                {vrExperiences.map(exp => (
                                    <div key={exp.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                                        <img src={exp.image} alt={exp.title} className="w-full h-48 object-cover" />
                                        <div className="p-6">
                                            <h3 className="text-xl font-bold mb-2">{exp.title}</h3>
                                            <p className="text-gray-600 mb-4">{exp.description}</p>
                                            <button className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700">
                                                Book Experience - ${exp.price}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'voice' && (
                        <div>
                            <h2 className="text-3xl font-bold mb-6">🎤 Voice Control</h2>
                            <div className="bg-white p-6 rounded-xl shadow-lg">
                                <h3 className="text-xl font-bold mb-4">Connected Devices</h3>
                                <div className="space-y-3">
                                    {voiceDevices.map(device => (
                                        <div key={device.id} className="flex items-center justify-between p-4 border rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="text-2xl">
                                                    {device.type === 'alexa' ? '🔵' : device.type === 'google_home' ? '🟡' : '📱'}
                                                </div>
                                                <div>
                                                    <div className="font-semibold">{device.name}</div>
                                                    <div className="text-sm text-gray-600">Last used: {device.lastUsed}</div>
                                                </div>
                                            </div>
                                            <div className={`w-3 h-3 rounded-full ${device.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'social' && (
                        <div>
                            <h2 className="text-3xl font-bold mb-6">👥 Social Dining</h2>
                            <div className="space-y-4">
                                {socialGroups.map(group => (
                                    <div key={group.id} className="bg-white p-6 rounded-xl shadow-lg">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-xl font-bold">{group.name}</h3>
                                                <p className="text-gray-600">{group.members}/{group.maxMembers} members</p>
                                                <p className="text-sm text-gray-500">Next: {group.nextDining} at {group.restaurant}</p>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-sm ${
                                                group.status === 'voting' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                                            }`}>
                                                {group.status === 'voting' ? 'Voting' : 'Confirmed'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'sustainability' && (
                        <div>
                            <h2 className="text-3xl font-bold mb-6">🌱 Sustainability</h2>
                            <div className="grid md:grid-cols-3 gap-6">
                                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl">
                                    <div className="text-2xl mb-2">🌍</div>
                                    <div className="text-3xl font-bold">{sustainabilityData.carbonFootprint} kg</div>
                                    <div className="text-green-100">Carbon Footprint</div>
                                </div>
                                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl">
                                    <div className="text-2xl mb-2">🚚</div>
                                    <div className="text-3xl font-bold">{sustainabilityData.localSourcingScore}%</div>
                                    <div className="text-blue-100">Local Sourcing</div>
                                </div>
                                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl">
                                    <div className="text-2xl mb-2">♻️</div>
                                    <div className="text-3xl font-bold">{sustainabilityData.wasteReduction}%</div>
                                    <div className="text-purple-100">Waste Reduction</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'ai' && (
                        <div>
                            <h2 className="text-3xl font-bold mb-6">🤖 AI Concierge</h2>
                            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                                <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">🤖</div>
                                        <div>
                                            <div className="font-bold">AI Dining Assistant</div>
                                            <div className="text-sm opacity-90">Ready to help with recommendations</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="space-y-4">
                                        <div className="bg-gray-100 p-4 rounded-lg">
                                            <p className="text-gray-800">Hello! I'm your AI concierge. I can help you find restaurants, make reservations, and provide personalized recommendations. What would you like to do today?</p>
                                        </div>
                                        <div className="flex gap-3">
                                            <input placeholder="Ask me anything about dining..." className="flex-1 p-3 border rounded-lg" />
                                            <button className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Send</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

const pages = { 
    home: Home, 
    restaurants: Restaurants, 
    reservations: Reservations, 
    features: Features, 
    dashboard: Dashboard,
    'restaurant-detail': RestaurantDetail 
};
const Page = pages[page] || Home;

return (
    <div className="min-h-screen">
        <Nav />
        <Page />
        <footer className="bg-gradient-to-b from-gray-900 to-black text-white">
            <div className="border-t border-gray-800">
                <div className="container mx-auto px-6 py-16">
                    <div className="grid md:grid-cols-5 gap-8">
                        <div className="md:col-span-2">
                            <h3 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                                🍽️ OpenTable Clone
                            </h3>
                            <p className="text-gray-400 mb-6">
                                Revolutionary dining platform featuring blockchain rewards, virtual reality experiences, 
                                AI-powered recommendations, and sustainable dining tracking.
                            </p>
                            <div className="flex space-x-4">
                                <button className="w-10 h-10 bg-white/10 rounded-full hover:bg-purple-600 transition-colors">📘</button>
                                <button className="w-10 h-10 bg-white/10 rounded-full hover:bg-purple-600 transition-colors">🐦</button>
                                <button className="w-10 h-10 bg-white/10 rounded-full hover:bg-purple-600 transition-colors">📷</button>
                                <button className="w-10 h-10 bg-white/10 rounded-full hover:bg-purple-600 transition-colors">💼</button>
                            </div>
                        </div>
                        
                        <div>
                                <h4 className="font-bold text-lg mb-4">Features</h4>
                                <ul className="space-y-2 text-gray-400">
                                    <li><button onClick={() => setPage('features')} className="hover:text-purple-400 transition-colors">🔗 Blockchain Loyalty</button></li>
                                    <li><button onClick={() => setPage('features')} className="hover:text-purple-400 transition-colors">🥽 VR Experiences</button></li>
                                    <li><button onClick={() => setPage('features')} className="hover:text-purple-400 transition-colors">🎤 Voice Booking</button></li>
                                    <li><button onClick={() => setPage('features')} className="hover:text-purple-400 transition-colors">👥 Social Dining</button></li>
                                    <li><button onClick={() => setPage('features')} className="hover:text-purple-400 transition-colors">🤖 AI Concierge</button></li>
                                    <li><button onClick={() => setPage('features')} className="hover:text-purple-400 transition-colors">🌱 Sustainability</button></li>
                                </ul>
                            </div>
                            
                            <div>
                                <h4 className="font-bold text-lg mb-4">Quick Links</h4>
                                <ul className="space-y-2 text-gray-400">
                                    <li><button onClick={() => setPage('home')} className="hover:text-purple-400 transition-colors">Home</button></li>
                                    <li><button onClick={() => setPage('restaurants')} className="hover:text-purple-400 transition-colors">Restaurants</button></li>
                                    <li><button onClick={() => setPage('reservations')} className="hover:text-purple-400 transition-colors">Reservations</button></li>
                                    <li><button onClick={() => setPage('dashboard')} className="hover:text-purple-400 transition-colors">Dashboard</button></li>
                                    <li><button className="hover:text-purple-400 transition-colors">Mobile App</button></li>
                                    <li><button className="hover:text-purple-400 transition-colors">Gift Cards</button></li>
                                </ul>
                            </div>
                            
                            <div>
                                <h4 className="font-bold text-lg mb-4">Developers</h4>
                                <ul className="space-y-2 text-gray-400">
                                    <li>
                                        <button onClick={() => window.open('http://localhost:3001/api/health', '_blank')} 
                                            className="hover:text-purple-400 transition-colors flex items-center gap-2">
                                            <span className="text-green-400">●</span> API Status
                                        </button>
                                    </li>
                                    <li>
                                        <button onClick={() => window.open('http://localhost:3001/graphql', '_blank')}
                                            className="hover:text-purple-400 transition-colors">
                                            GraphQL Playground
                                        </button>
                                    </li>
                                    <li>
                                        <button onClick={() => window.open('http://localhost:3001/api/disruptive', '_blank')}
                                            className="hover:text-purple-400 transition-colors">
                                            Disruptive APIs
                                        </button>
                                    </li>
                                    <li><button className="hover:text-purple-400 transition-colors">Documentation</button></li>
                                    <li><button className="hover:text-purple-400 transition-colors">GitHub</button></li>
                                    <li><button className="hover:text-purple-400 transition-colors">API Keys</button></li>
                                </ul>
                            </div>
                        </div>
                        
                        <div className="mt-12 pt-8 border-t border-gray-800">
                            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-xl p-6 mb-8">
                                <div className="flex flex-col md:flex-row justify-between items-center">
                                    <div className="mb-4 md:mb-0">
                                        <h4 className="text-xl font-bold mb-2">🚀 Get the Mobile App</h4>
                                        <p className="text-gray-400">Experience dining revolution on the go</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <button className="bg-black px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-gray-900">
                                            <span className="text-2xl">🍎</span>
                                            <div className="text-left">
                                                <div className="text-xs text-gray-400">Download on the</div>
                                                <div className="font-semibold">App Store</div>
                                            </div>
                                        </button>
                                        <button className="bg-black px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-gray-900">
                                            <span className="text-2xl">🤖</span>
                                            <div className="text-left">
                                                <div className="text-xs text-gray-400">Get it on</div>
                                                <div className="font-semibold">Google Play</div>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex flex-col md:flex-row justify-between items-center">
                                <div className="text-gray-400 text-sm mb-4 md:mb-0">
                                    © 2024 OpenTable Clone. All rights reserved. Built with revolutionary technology.
                                </div>
                                <div className="flex gap-6 text-sm text-gray-400">
                                    <button className="hover:text-purple-400">Privacy Policy</button>
                                    <button className="hover:text-purple-400">Terms of Service</button>
                                    <button className="hover:text-purple-400">Cookie Policy</button>
                                    <button className="hover:text-purple-400">Accessibility</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

ReactDOM.render(<App />, document.getElementById('root'));
