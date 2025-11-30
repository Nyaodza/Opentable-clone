'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { userService } from '@/lib/api/user';
import { ErrorBoundary } from '@/components/common/error-boundary';

interface RewardInfo {
  points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  pointsToNextTier: number;
  lifetimePoints: number;
  expiringPoints: {
    amount: number;
    date: string;
  } | null;
}

interface Reward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  category: 'dining' | 'discount' | 'experience' | 'gift';
  imageUrl?: string;
  expiryDays: number;
  available: boolean;
}

interface PointsActivity {
  id: string;
  type: 'earned' | 'redeemed' | 'expired';
  description: string;
  points: number;
  date: string;
  restaurantName?: string;
}

const tierBenefits = {
  bronze: {
    name: 'Bronze',
    minPoints: 0,
    color: 'bg-orange-600',
    benefits: [
      'Earn 1 point per $1 spent',
      'Birthday bonus points',
      'Early access to new restaurants',
    ],
  },
  silver: {
    name: 'Silver',
    minPoints: 1000,
    color: 'bg-gray-500',
    benefits: [
      'Earn 1.5 points per $1 spent',
      'Priority reservations',
      'Quarterly bonus points',
      'All Bronze benefits',
    ],
  },
  gold: {
    name: 'Gold',
    minPoints: 5000,
    color: 'bg-yellow-500',
    benefits: [
      'Earn 2 points per $1 spent',
      'Complimentary desserts',
      'VIP customer service',
      'All Silver benefits',
    ],
  },
  platinum: {
    name: 'Platinum',
    minPoints: 10000,
    color: 'bg-purple-600',
    benefits: [
      'Earn 3 points per $1 spent',
      'Exclusive dining events',
      'Personal concierge',
      'All Gold benefits',
    ],
  },
};

export default function RewardsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rewardInfo, setRewardInfo] = useState<RewardInfo>({
    points: 0,
    tier: 'bronze',
    pointsToNextTier: 1000,
    lifetimePoints: 0,
    expiringPoints: null,
  });
  const [availableRewards, setAvailableRewards] = useState<Reward[]>([]);
  const [pointsHistory, setPointsHistory] = useState<PointsActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'rewards' | 'history' | 'tiers'>('rewards');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (session?.user) {
      loadRewardsData();
    }
  }, [session, status, router]);

  const loadRewardsData = async () => {
    try {
      const [rewardData, rewards, history] = await Promise.all([
        userService.getRewardInfo(),
        userService.getAvailableRewards(),
        userService.getPointsHistory(),
      ]);
      
      setRewardInfo(rewardData);
      setAvailableRewards(rewards);
      setPointsHistory(history);
    } catch (error) {
      console.error('Failed to load rewards data:', error);
      // Use mock data for demo
      setRewardInfo({
        points: 1250,
        tier: 'silver',
        pointsToNextTier: 3750,
        lifetimePoints: 2500,
        expiringPoints: {
          amount: 200,
          date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });
      
      setAvailableRewards([
        {
          id: '1',
          name: '$20 Dining Credit',
          description: 'Get $20 off your next reservation',
          pointsCost: 1000,
          category: 'dining',
          expiryDays: 90,
          available: true,
        },
        {
          id: '2',
          name: '25% Off Fine Dining',
          description: 'Save 25% at select fine dining restaurants',
          pointsCost: 2000,
          category: 'discount',
          expiryDays: 60,
          available: true,
        },
        {
          id: '3',
          name: 'Chef\'s Table Experience',
          description: 'Exclusive chef\'s table for 2 at partner restaurants',
          pointsCost: 5000,
          category: 'experience',
          expiryDays: 180,
          available: false,
        },
        {
          id: '4',
          name: 'Wine Tasting Gift Set',
          description: 'Premium wine selection delivered to your door',
          pointsCost: 3000,
          category: 'gift',
          expiryDays: 120,
          available: true,
        },
      ]);

      setPointsHistory([
        {
          id: '1',
          type: 'earned',
          description: 'Dining at The Modern',
          points: 250,
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          restaurantName: 'The Modern',
        },
        {
          id: '2',
          type: 'earned',
          description: 'Birthday bonus',
          points: 500,
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '3',
          type: 'redeemed',
          description: '$10 Dining Credit',
          points: -500,
          date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemReward = async (rewardId: string, pointsCost: number) => {
    if (rewardInfo.points < pointsCost) {
      alert('You don\'t have enough points for this reward.');
      return;
    }

    if (!confirm('Are you sure you want to redeem this reward?')) {
      return;
    }

    try {
      await userService.redeemReward(rewardId);
      setRewardInfo(prev => ({ ...prev, points: prev.points - pointsCost }));
      alert('Reward redeemed successfully! Check your email for details.');
    } catch (error) {
      console.error('Failed to redeem reward:', error);
      alert('Failed to redeem reward. Please try again.');
    }
  };

  const currentTier = tierBenefits[rewardInfo.tier];
  const nextTier = Object.values(tierBenefits).find(
    tier => tier.minPoints > rewardInfo.lifetimePoints
  );

  const progressPercentage = nextTier
    ? ((rewardInfo.lifetimePoints - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100
    : 100;

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Rewards Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-lg shadow-lg p-8 text-white mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">My Rewards</h1>
                <div className="flex items-center gap-3 mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${currentTier.color} text-white`}>
                    {currentTier.name} Member
                  </span>
                  <span className="text-red-100">
                    {rewardInfo.lifetimePoints.toLocaleString()} lifetime points
                  </span>
                </div>
                <div className="text-4xl font-bold">
                  {rewardInfo.points.toLocaleString()} points
                </div>
                {rewardInfo.expiringPoints && (
                  <p className="text-red-100 text-sm mt-2">
                    ⚠️ {rewardInfo.expiringPoints.amount} points expiring on{' '}
                    {new Date(rewardInfo.expiringPoints.date).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="mt-6 md:mt-0">
                <Link
                  href="/restaurants"
                  className="bg-white text-red-600 px-6 py-3 rounded-lg hover:bg-red-50 transition-colors font-medium"
                >
                  Earn More Points
                </Link>
              </div>
            </div>

            {/* Progress to Next Tier */}
            {nextTier && (
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Progress to {nextTier.name}</span>
                  <span>{rewardInfo.pointsToNextTier.toLocaleString()} points to go</span>
                </div>
                <div className="w-full bg-red-800 rounded-full h-3">
                  <div
                    className="bg-white rounded-full h-3 transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex">
                <button
                  onClick={() => setActiveTab('rewards')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'rewards'
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Available Rewards
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'history'
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Points History
                </button>
                <button
                  onClick={() => setActiveTab('tiers')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'tiers'
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Membership Tiers
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'rewards' && (
            <div>
              {/* Category Filter */}
              <div className="mb-6 flex gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Rewards
                </button>
                <button
                  onClick={() => setSelectedCategory('dining')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedCategory === 'dining'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Dining Credits
                </button>
                <button
                  onClick={() => setSelectedCategory('discount')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedCategory === 'discount'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Discounts
                </button>
                <button
                  onClick={() => setSelectedCategory('experience')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedCategory === 'experience'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Experiences
                </button>
                <button
                  onClick={() => setSelectedCategory('gift')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedCategory === 'gift'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Gifts
                </button>
              </div>

              {/* Rewards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableRewards
                  .filter(reward => selectedCategory === 'all' || reward.category === selectedCategory)
                  .map((reward) => (
                    <div
                      key={reward.id}
                      className={`bg-white rounded-lg shadow-sm overflow-hidden ${
                        !reward.available || rewardInfo.points < reward.pointsCost
                          ? 'opacity-60'
                          : ''
                      }`}
                    >
                      <div className="h-48 bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center">
                        <span className="text-6xl">
                          {reward.category === 'dining' && '🍽️'}
                          {reward.category === 'discount' && '🏷️'}
                          {reward.category === 'experience' && '✨'}
                          {reward.category === 'gift' && '🎁'}
                        </span>
                      </div>
                      <div className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{reward.name}</h3>
                        <p className="text-gray-600 text-sm mb-4">{reward.description}</p>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-2xl font-bold text-red-600">
                            {reward.pointsCost.toLocaleString()} pts
                          </span>
                          <span className="text-xs text-gray-500">
                            Valid for {reward.expiryDays} days
                          </span>
                        </div>
                        <button
                          onClick={() => handleRedeemReward(reward.id, reward.pointsCost)}
                          disabled={!reward.available || rewardInfo.points < reward.pointsCost}
                          className={`w-full py-2 rounded-md font-medium transition-colors ${
                            reward.available && rewardInfo.points >= reward.pointsCost
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {!reward.available
                            ? 'Coming Soon'
                            : rewardInfo.points < reward.pointsCost
                            ? 'Insufficient Points'
                            : 'Redeem'}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="space-y-4">
                {pointsHistory.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        activity.type === 'earned'
                          ? 'bg-green-100 text-green-600'
                          : activity.type === 'redeemed'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {activity.type === 'earned' && '+'}
                        {activity.type === 'redeemed' && '-'}
                        {activity.type === 'expired' && '!'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{activity.description}</p>
                        {activity.restaurantName && (
                          <p className="text-sm text-gray-600">{activity.restaurantName}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {new Date(activity.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className={`text-lg font-semibold ${
                      activity.type === 'earned'
                        ? 'text-green-600'
                        : activity.type === 'redeemed'
                        ? 'text-blue-600'
                        : 'text-gray-600'
                    }`}>
                      {activity.type === 'earned' ? '+' : ''}{activity.points.toLocaleString()} pts
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'tiers' && (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.entries(tierBenefits).map(([key, tier]) => (
                <div
                  key={key}
                  className={`bg-white rounded-lg shadow-sm p-6 ${
                    key === rewardInfo.tier ? 'ring-2 ring-red-600' : ''
                  }`}
                >
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${tier.color} text-white mb-4`}>
                    {tier.name}
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    {tier.minPoints.toLocaleString()}+ lifetime points
                  </p>
                  <h3 className="font-semibold text-gray-900 mb-3">Benefits</h3>
                  <ul className="space-y-2">
                    {tier.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-green-500 mt-0.5">✓</span>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                  {key === rewardInfo.tier && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm font-medium text-red-600">Your Current Tier</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* How to Earn Points */}
          <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">How to Earn Points</h2>
            <div className="grid md:grid-cols-4 gap-6">
              <div>
                <div className="text-2xl mb-2">🍽️</div>
                <h3 className="font-medium mb-1">Dine & Earn</h3>
                <p className="text-sm text-gray-600">
                  Earn points for every dollar spent at participating restaurants
                </p>
              </div>
              <div>
                <div className="text-2xl mb-2">⭐</div>
                <h3 className="font-medium mb-1">Write Reviews</h3>
                <p className="text-sm text-gray-600">
                  Get bonus points for sharing your dining experiences
                </p>
              </div>
              <div>
                <div className="text-2xl mb-2">📸</div>
                <h3 className="font-medium mb-1">Share Photos</h3>
                <p className="text-sm text-gray-600">
                  Upload photos of your meals to earn extra points
                </p>
              </div>
              <div>
                <div className="text-2xl mb-2">👥</div>
                <h3 className="font-medium mb-1">Refer Friends</h3>
                <p className="text-sm text-gray-600">
                  Invite friends and earn points when they make their first booking
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}