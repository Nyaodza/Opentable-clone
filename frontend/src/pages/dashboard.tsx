import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../contexts/AuthContext';
import BlockchainDashboard from '../components/blockchain/BlockchainDashboard';
import VirtualExperienceHub from '../components/virtual/VirtualExperienceHub';
import VoiceCommandCenter from '../components/voice/VoiceCommandCenter';
import AIConciergeChat from '../components/ai/AIConciergeChat';
import SocialDiningHub from '../components/social/SocialDiningHub';
import SustainabilityDashboard from '../components/sustainability/SustainabilityDashboard';

interface DashboardProps {}

const Dashboard: React.FC<DashboardProps> = () => {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('overview');
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

    const [sustainabilityData, setSustainabilityData] = useState({
        carbonFootprint: 2.4,
        localSourcingScore: 85,
        wasteReduction: 92,
        ecoFriendlyVisits: 23,
        monthlyGoal: 30,
        achievements: ['Green Diner', 'Local Hero', 'Waste Warrior']
    });

    useEffect(() => {
        if (!loading && !user) {
            router.push('/auth/login');
        }

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
                case 'SUSTAINABILITY_UPDATE':
                    setSustainabilityData(prev => ({
                        ...prev,
                        ...data.updates
                    }));
                    break;
            }
        };
        
        return () => {
            ws.close();
        };
    }, [user, loading, router]);

    const tabs = [
        { id: 'overview', name: 'Overview', icon: '📊' },
        { id: 'blockchain', name: 'Blockchain', icon: '🔗' },
        { id: 'vr', name: 'VR Experiences', icon: '🥽' },
        { id: 'voice', name: 'Voice Control', icon: '🎤' },
        { id: 'ai', name: 'AI Concierge', icon: '🤖' },
        { id: 'social', name: 'Social Dining', icon: '👥' },
        { id: 'sustainability', name: 'Sustainability', icon: '🌱' }
    ];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    return (
        <>
            <Head>
                <title>Dashboard - OpenTable Clone</title>
                <meta name="description" content="Your personalized dining dashboard with blockchain rewards, VR experiences, and more" />
            </Head>

            <div className="min-h-screen bg-gray-50">
                {/* Tab Navigation */}
                <div className="bg-white border-b sticky top-0 z-40">
                    <div className="container mx-auto px-6">
                        <div className="flex space-x-8 overflow-x-auto">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 py-4 px-2 border-b-2 whitespace-nowrap transition-colors ${
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

                {/* Tab Content */}
                <div className="container mx-auto px-6 py-8">
                    {activeTab === 'overview' && (
                        <div>
                            <h1 className="text-4xl font-bold mb-8">Welcome back, {user?.name || 'User'}! 🎉</h1>
                            
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
                                    <div className="text-2xl font-bold">{sustainabilityData.wasteReduction}%</div>
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
                        <BlockchainDashboard loyaltyData={loyaltyData} setLoyaltyData={setLoyaltyData} />
                    )}

                    {activeTab === 'vr' && (
                        <VirtualExperienceHub experiences={vrExperiences} setExperiences={setVrExperiences} />
                    )}

                    {activeTab === 'voice' && (
                        <VoiceCommandCenter />
                    )}

                    {activeTab === 'ai' && (
                        <AIConciergeChat />
                    )}

                    {activeTab === 'social' && (
                        <SocialDiningHub />
                    )}

                    {activeTab === 'sustainability' && (
                        <SustainabilityDashboard data={sustainabilityData} setData={setSustainabilityData} />
                    )}
                </div>
            </div>
        </>
    );
};

export default Dashboard;
