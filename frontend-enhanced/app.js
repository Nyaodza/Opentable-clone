// Complete OpenTable Clone Application
const { useState, useEffect } = React;

const OpenTableApp = () => {
    const [currentPage, setCurrentPage] = useState('home');
    const [user, setUser] = useState(null);
    const [reservationStep, setReservationStep] = useState(1);
    const [reservationData, setReservationData] = useState({});
    const [apiStatus, setApiStatus] = useState('checking');

    useEffect(() => {
        checkApiStatus();
        // Simulate user login
        setTimeout(() => {
            setUser({
                name: 'John Doe',
                email: 'john@example.com',
                role: Math.random() > 0.5 ? 'admin' : 'user',
                loyaltyTokens: 1250,
                sustainabilityScore: 85,
                reservations: 12,
                reviews: 8
            });
        }, 1000);
    }, []);

    const checkApiStatus = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/health');
            setApiStatus(response.ok ? 'connected' : 'error');
        } catch (error) {
            setApiStatus('offline');
        }
    };

    // Multi-step reservation form
    const ReservationForm = () => {
        const steps = [
            { number: 1, title: 'Restaurant & Date', icon: '🍽️' },
            { number: 2, title: 'Party Details', icon: '👥' },
            { number: 3, title: 'Special Requests', icon: '✨' },
            { number: 4, title: 'Confirmation', icon: '✅' }
        ];

        const handleSubmit = () => {
            alert('Reservation confirmed! 🎉');
            setReservationStep(1);
            setReservationData({});
            setCurrentPage('dashboard');
        };

        return (
            <div className="max-w-4xl mx-auto">
                {/* Step Indicator */}
                <div className="flex justify-center mb-8">
                    {steps.map((step, index) => (
                        <div key={step.number} className="flex items-center">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold transition-all ${
                                step.number === reservationStep ? 'bg-gradient-to-r from-blue-500 to-purple-600 scale-110' :
                                step.number < reservationStep ? 'bg-green-500' : 'bg-gray-300'
                            }`}>
                                {step.number < reservationStep ? '✓' : step.icon}
                            </div>
                            {index < steps.length - 1 && (
                                <div className={`w-16 h-1 mx-2 ${step.number < reservationStep ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-8">
                    <h2 className="text-2xl font-bold mb-6">{steps[reservationStep - 1].title}</h2>
                    
                    {reservationStep === 1 && (
                        <div className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <select className="w-full px-4 py-3 border rounded-lg" 
                                        onChange={(e) => setReservationData({...reservationData, restaurant: e.target.value})}>
                                    <option>Select Restaurant</option>
                                    <option>The Blockchain Bistro</option>
                                    <option>Virtual Vineyard</option>
                                    <option>Smart Kitchen</option>
                                </select>
                                <input type="date" className="w-full px-4 py-3 border rounded-lg"
                                       onChange={(e) => setReservationData({...reservationData, date: e.target.value})} />
                            </div>
                        </div>
                    )}

                    {reservationStep === 2 && (
                        <div className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <input type="text" placeholder="First Name" className="w-full px-4 py-3 border rounded-lg" />
                                <input type="text" placeholder="Last Name" className="w-full px-4 py-3 border rounded-lg" />
                                <input type="email" placeholder="Email" className="w-full px-4 py-3 border rounded-lg" />
                                <input type="tel" placeholder="Phone" className="w-full px-4 py-3 border rounded-lg" />
                            </div>
                        </div>
                    )}

                    {reservationStep === 3 && (
                        <div className="space-y-6">
                            <textarea placeholder="Special requests or dietary restrictions..." 
                                     className="w-full px-4 py-3 border rounded-lg h-32"></textarea>
                            <div className="grid md:grid-cols-3 gap-4">
                                <label className="flex items-center space-x-2">
                                    <input type="checkbox" />
                                    <span>VR Experience</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <input type="checkbox" />
                                    <span>Voice Booking</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <input type="checkbox" />
                                    <span>Social Dining</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {reservationStep === 4 && (
                        <div className="text-center space-y-6">
                            <div className="text-6xl">🎉</div>
                            <h3 className="text-2xl font-bold text-green-600">Reservation Confirmed!</h3>
                            <div className="bg-gray-50 p-6 rounded-lg">
                                <p><strong>Restaurant:</strong> {reservationData.restaurant}</p>
                                <p><strong>Date:</strong> {reservationData.date}</p>
                                <p><strong>Loyalty Tokens Earned:</strong> +50 🪙</p>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between mt-8">
                        {reservationStep > 1 && (
                            <button onClick={() => setReservationStep(reservationStep - 1)}
                                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                                Previous
                            </button>
                        )}
                        <div className="ml-auto">
                            {reservationStep < 4 ? (
                                <button onClick={() => setReservationStep(reservationStep + 1)}
                                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg">
                                    Next
                                </button>
                            ) : (
                                <button onClick={handleSubmit}
                                        className="px-6 py-3 bg-green-600 text-white rounded-lg">
                                    Complete Reservation
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // User Dashboard
    const UserDashboard = () => (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">Welcome back, {user?.name}! 👋</h1>
                <p className="text-xl text-gray-600">Manage your dining experiences</p>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
                <div className="dashboard-card p-6 text-center">
                    <div className="text-3xl mb-2">🪙</div>
                    <div className="text-2xl font-bold text-blue-600">{user?.loyaltyTokens}</div>
                    <div className="text-sm text-gray-600">Loyalty Tokens</div>
                </div>
                <div className="dashboard-card p-6 text-center">
                    <div className="text-3xl mb-2">🍽️</div>
                    <div className="text-2xl font-bold text-green-600">{user?.reservations}</div>
                    <div className="text-sm text-gray-600">Reservations</div>
                </div>
                <div className="dashboard-card p-6 text-center">
                    <div className="text-3xl mb-2">⭐</div>
                    <div className="text-2xl font-bold text-yellow-600">{user?.reviews}</div>
                    <div className="text-sm text-gray-600">Reviews</div>
                </div>
                <div className="dashboard-card p-6 text-center">
                    <div className="text-3xl mb-2">🌱</div>
                    <div className="text-2xl font-bold text-green-600">{user?.sustainabilityScore}%</div>
                    <div className="text-sm text-gray-600">Eco Score</div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="text-xl font-bold mb-4">Recent Reservations</h3>
                    <div className="space-y-3">
                        {['The Blockchain Bistro', 'Virtual Vineyard', 'Smart Kitchen'].map((restaurant, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <div className="font-medium">{restaurant}</div>
                                    <div className="text-sm text-gray-600">Dec {15 + index}, 2024</div>
                                </div>
                                <span className="text-green-600 text-sm">Completed</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="text-xl font-bold mb-4">Blockchain Activity</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                            <div>
                                <div className="font-medium">Token Reward</div>
                                <div className="text-sm text-gray-600">Dining at Blockchain Bistro</div>
                            </div>
                            <span className="text-blue-600 font-medium">+50 🪙</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                            <div>
                                <div className="font-medium">NFT Earned</div>
                                <div className="text-sm text-gray-600">VR Experience Badge</div>
                            </div>
                            <span className="text-purple-600 font-medium">🏆</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // Admin Dashboard
    const AdminDashboard = () => (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">Admin Dashboard 👨‍💼</h1>
                <p className="text-xl text-gray-600">Manage the platform</p>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
                <div className="dashboard-card p-6 text-center">
                    <div className="text-3xl mb-2">🏪</div>
                    <div className="text-2xl font-bold text-blue-600">1,247</div>
                    <div className="text-sm text-gray-600">Restaurants</div>
                </div>
                <div className="dashboard-card p-6 text-center">
                    <div className="text-3xl mb-2">👥</div>
                    <div className="text-2xl font-bold text-green-600">45,892</div>
                    <div className="text-sm text-gray-600">Active Users</div>
                </div>
                <div className="dashboard-card p-6 text-center">
                    <div className="text-3xl mb-2">📅</div>
                    <div className="text-2xl font-bold text-purple-600">12,456</div>
                    <div className="text-sm text-gray-600">Reservations Today</div>
                </div>
                <div className="dashboard-card p-6 text-center">
                    <div className="text-3xl mb-2">💰</div>
                    <div className="text-2xl font-bold text-yellow-600">$2.4M</div>
                    <div className="text-sm text-gray-600">Revenue</div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="text-xl font-bold mb-4">System Health</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span>Backend API</span>
                            <span className="text-green-600">✅ Online</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Blockchain Network</span>
                            <span className="text-green-600">✅ Connected</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>VR Services</span>
                            <span className="text-green-600">✅ Active</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>AI Concierge</span>
                            <span className="text-green-600">✅ Running</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="text-xl font-bold mb-4">Recent Activity</h3>
                    <div className="space-y-3">
                        <div className="text-sm text-gray-600">
                            <span className="font-medium">New restaurant</span> added: Tech Fusion
                        </div>
                        <div className="text-sm text-gray-600">
                            <span className="font-medium">VR experience</span> launched at 3 venues
                        </div>
                        <div className="text-sm text-gray-600">
                            <span className="font-medium">Blockchain rewards</span> distributed: 50K tokens
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // Footer Component
    const Footer = () => (
        <footer className="bg-gray-900 text-white py-16 mt-20">
            <div className="container mx-auto px-6">
                <div className="grid md:grid-cols-4 gap-8">
                    <div>
                        <h3 className="text-xl font-bold mb-4">OpenTable Clone</h3>
                        <p className="text-gray-400 mb-4">Revolutionary dining platform with blockchain, VR, and AI.</p>
                        <div className="flex space-x-4">
                            <button className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">f</button>
                            <button className="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center">t</button>
                            <button className="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center">i</button>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-bold mb-4">Features</h4>
                        <ul className="space-y-2 text-gray-400">
                            <li><button onClick={() => setCurrentPage('features')}>Blockchain Loyalty</button></li>
                            <li><button onClick={() => setCurrentPage('features')}>VR Experiences</button></li>
                            <li><button onClick={() => setCurrentPage('features')}>Voice Commands</button></li>
                            <li><button onClick={() => setCurrentPage('features')}>Social Dining</button></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold mb-4">Company</h4>
                        <ul className="space-y-2 text-gray-400">
                            <li><a href="#" className="hover:text-white">About Us</a></li>
                            <li><a href="#" className="hover:text-white">Careers</a></li>
                            <li><a href="#" className="hover:text-white">Press</a></li>
                            <li><a href="#" className="hover:text-white">Contact</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold mb-4">Support</h4>
                        <ul className="space-y-2 text-gray-400">
                            <li><a href="#" className="hover:text-white">Help Center</a></li>
                            <li><a href="#" className="hover:text-white">API Docs</a></li>
                            <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                            <li><a href="#" className="hover:text-white">Terms of Service</a></li>
                        </ul>
                    </div>
                </div>
                <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
                    <p>&copy; 2024 OpenTable Clone. All rights reserved. Built with revolutionary technology.</p>
                </div>
            </div>
        </footer>
    );

    // Main App Render
    const renderPage = () => {
        switch (currentPage) {
            case 'reservations':
                return (
                    <div className="py-12">
                        <div className="container mx-auto px-6">
                            <div className="text-center mb-12">
                                <h1 className="text-4xl font-bold mb-4">Make a Reservation</h1>
                                <p className="text-xl text-gray-600">Book your revolutionary dining experience</p>
                            </div>
                            <ReservationForm />
                        </div>
                    </div>
                );
            case 'dashboard':
                return (
                    <div className="py-12">
                        <div className="container mx-auto px-6">
                            <UserDashboard />
                        </div>
                    </div>
                );
            case 'admin':
                return (
                    <div className="py-12">
                        <div className="container mx-auto px-6">
                            <AdminDashboard />
                        </div>
                    </div>
                );
            default:
                return (
                    <div>
                        {/* Hero Section */}
                        <section className="hero-gradient text-white py-20 relative overflow-hidden">
                            <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                            <div className="container mx-auto px-6 relative z-10">
                                <div className="max-w-4xl mx-auto text-center">
                                    <h1 className="text-6xl md:text-7xl font-bold mb-6 animate-slideIn">
                                        The Future of
                                        <span className="block bg-gradient-to-r from-yellow-400 to-pink-400 bg-clip-text text-transparent">
                                            Dining is Here
                                        </span>
                                    </h1>
                                    <p className="text-xl md:text-2xl mb-8 opacity-90">
                                        Experience revolutionary dining with blockchain loyalty, VR experiences, 
                                        voice commands, social dining, AI concierge, and sustainability tracking.
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                        <button
                                            onClick={() => setCurrentPage('reservations')}
                                            className="bg-white text-gray-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg"
                                        >
                                            Make Reservation
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage('features')}
                                            className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white hover:text-gray-900 transition-all transform hover:scale-105"
                                        >
                                            Explore Features
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Features Section */}
                        <section className="py-20 bg-gray-50">
                            <div className="container mx-auto px-6">
                                <h2 className="text-4xl font-bold text-center mb-16">Revolutionary Features</h2>
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {[
                                        { icon: '🔗', title: 'Blockchain Loyalty', desc: 'Earn tokens, stake rewards, collect NFTs' },
                                        { icon: '🥽', title: 'VR Experiences', desc: 'Virtual tours and cooking classes' },
                                        { icon: '🎤', title: 'Voice Commands', desc: 'Book with Alexa, Google, Siri' },
                                        { icon: '👥', title: 'Social Dining', desc: 'Group coordination and voting' },
                                        { icon: '🤖', title: 'AI Concierge', desc: 'Personalized recommendations' },
                                        { icon: '🌱', title: 'Sustainability', desc: 'Track environmental impact' }
                                    ].map((feature, index) => (
                                        <div key={index} className="feature-card bg-white rounded-2xl p-8 shadow-lg text-center">
                                            <div className="text-5xl mb-4">{feature.icon}</div>
                                            <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                            <p className="text-gray-600">{feature.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navigation */}
            <nav className="glass-effect text-white shadow-xl sticky top-0 z-50">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-8">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                    <span className="text-xl font-bold">OT</span>
                                </div>
                                <h1 className="text-2xl font-bold">OpenTable Clone</h1>
                            </div>
                            <div className="hidden md:flex space-x-6">
                                {['home', 'restaurants', 'reservations', 'features'].map((page) => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`nav-link px-3 py-2 rounded-lg capitalize font-medium ${
                                            currentPage === page ? 'bg-white bg-opacity-20' : 'hover:bg-white hover:bg-opacity-10'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className={`flex items-center space-x-2 ${apiStatus === 'connected' ? 'text-green-400' : 'text-red-400'}`}>
                                <div className="w-2 h-2 rounded-full bg-current animate-pulse"></div>
                                <span className="text-sm">{apiStatus === 'connected' ? 'API Connected' : 'API Offline'}</span>
                            </div>
                            {user ? (
                                <div className="flex items-center space-x-3">
                                    <div className="text-right">
                                        <div className="text-sm font-medium">{user.name}</div>
                                        <div className="text-xs opacity-75">{user.loyaltyTokens} tokens</div>
                                    </div>
                                    <button
                                        onClick={() => setCurrentPage(user.role === 'admin' ? 'admin' : 'dashboard')}
                                        className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center"
                                    >
                                        {user.name.charAt(0)}
                                    </button>
                                </div>
                            ) : (
                                <button className="bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 rounded-lg font-medium">
                                    Sign In
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {renderPage()}
            <Footer />
        </div>
    );
};

// Render the app
ReactDOM.render(<OpenTableApp />, document.getElementById('root'));
