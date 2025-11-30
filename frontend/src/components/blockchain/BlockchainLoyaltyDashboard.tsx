import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useSubscription } from '@apollo/client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui';
import { Coins, TrendingUp, Trophy, Zap, Gift, Users } from 'lucide-react';
import { gql } from '@apollo/client';

const GET_BLOCKCHAIN_LOYALTY = gql`
  query GetBlockchainLoyalty($userId: ID!) {
    blockchainLoyalty(userId: $userId) {
      id
      tokenBalance
      totalEarned
      totalRedeemed
      walletAddress
      blockchainNetwork
      stakingBalance
      stakingRewards
      loyaltyTier
      tierProgress
      referralTokens
      nftCollectibles {
        id
        name
        imageUrl
        rarity
      }
      isActive
    }
    blockchainTransactions(userId: $userId, limit: 10) {
      id
      transactionType
      tokenAmount
      sourceType
      status
      createdAt
    }
    loyaltyLeaderboard(limit: 10) {
      user {
        id
        firstName
        lastName
      }
      totalEarned
      loyaltyTier
    }
  }
`;

const EARN_TOKENS = gql`
  mutation EarnTokens($input: TokenEarnInput!) {
    earnTokens(input: $input) {
      id
      tokenAmount
      status
    }
  }
`;

const REDEEM_TOKENS = gql`
  mutation RedeemTokens($input: TokenRedeemInput!) {
    redeemTokens(input: $input) {
      id
      tokenAmount
      status
    }
  }
`;

const STAKE_TOKENS = gql`
  mutation StakeTokens($input: StakingInput!) {
    stakeTokens(input: $input) {
      id
      tokenAmount
      status
    }
  }
`;

const LOYALTY_UPDATED_SUBSCRIPTION = gql`
  subscription BlockchainLoyaltyUpdated($userId: ID!) {
    blockchainLoyaltyUpdated(userId: $userId) {
      tokenBalance
      totalEarned
      loyaltyTier
      tierProgress
      stakingBalance
      stakingRewards
    }
  }
`;

interface BlockchainLoyaltyDashboardProps {
  userId: string;
}

const BlockchainLoyaltyDashboard: React.FC<BlockchainLoyaltyDashboardProps> = ({ userId }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stakingAmount, setStakingAmount] = useState('');
  const [stakingDuration, setStakingDuration] = useState('30');

  const { data, loading, error, refetch } = useQuery(GET_BLOCKCHAIN_LOYALTY, {
    variables: { userId },
    pollInterval: 30000, // Poll every 30 seconds
  });

  const [earnTokens] = useMutation(EARN_TOKENS);
  const [redeemTokens] = useMutation(REDEEM_TOKENS);
  const [stakeTokens] = useMutation(STAKE_TOKENS);

  useSubscription(LOYALTY_UPDATED_SUBSCRIPTION, {
    variables: { userId },
    onData: ({ data: subscriptionData }) => {
      if (subscriptionData.data?.blockchainLoyaltyUpdated) {
        refetch();
      }
    },
  });

  const handleStakeTokens = async () => {
    try {
      await stakeTokens({
        variables: {
          input: {
            amount: parseFloat(stakingAmount),
            duration: parseInt(stakingDuration),
          },
        },
      });
      setStakingAmount('');
      refetch();
    } catch (error) {
      console.error('Error staking tokens:', error);
    }
  };

  const handleRedeemTokens = async (amount: number, rewardType: string) => {
    try {
      await redeemTokens({
        variables: {
          input: {
            amount,
            rewardType,
            metadata: { timestamp: new Date().toISOString() },
          },
        },
      });
      refetch();
    } catch (error) {
      console.error('Error redeeming tokens:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-4">
        Error loading blockchain loyalty data: {error.message}
      </div>
    );
  }

  const loyalty = data?.blockchainLoyalty;
  const transactions = data?.blockchainTransactions || [];
  const leaderboard = data?.loyaltyLeaderboard || [];

  const getTierColor = (tier: string) => {
    const colors = {
      bronze: 'bg-amber-100 text-amber-800',
      silver: 'bg-gray-100 text-gray-800',
      gold: 'bg-yellow-100 text-yellow-800',
      platinum: 'bg-purple-100 text-purple-800',
      diamond: 'bg-blue-100 text-blue-800',
    };
    return colors[tier.toLowerCase() as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const rewardOptions = [
    { id: 'discount_10', name: '10% Off Next Meal', cost: 100, icon: Gift },
    { id: 'discount_20', name: '20% Off Next Meal', cost: 200, icon: Gift },
    { id: 'free_appetizer', name: 'Free Appetizer', cost: 150, icon: Gift },
    { id: 'priority_booking', name: 'Priority Booking (1 Month)', cost: 300, icon: Zap },
    { id: 'vip_experience', name: 'VIP Dining Experience', cost: 500, icon: Trophy },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Blockchain Loyalty Dashboard</h1>
        <p className="text-gray-600">Earn, stake, and redeem OpenTable Tokens (OTT)</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Token Balance</p>
                <p className="text-2xl font-bold text-gray-900">{loyalty?.tokenBalance?.toFixed(2) || '0.00'}</p>
                <p className="text-xs text-gray-500">OTT</p>
              </div>
              <Coins className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Earned</p>
                <p className="text-2xl font-bold text-green-600">{loyalty?.totalEarned?.toFixed(2) || '0.00'}</p>
                <p className="text-xs text-gray-500">OTT</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Staking Balance</p>
                <p className="text-2xl font-bold text-purple-600">{loyalty?.stakingBalance?.toFixed(2) || '0.00'}</p>
                <p className="text-xs text-gray-500">OTT Staked</p>
              </div>
              <Zap className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Loyalty Tier</p>
                <Badge className={getTierColor(loyalty?.loyaltyTier || 'bronze')}>
                  {loyalty?.loyaltyTier?.toUpperCase() || 'BRONZE'}
                </Badge>
                <Progress value={loyalty?.tierProgress || 0} className="mt-2" />
              </div>
              <Trophy className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="earn">Earn</TabsTrigger>
          <TabsTrigger value="stake">Stake</TabsTrigger>
          <TabsTrigger value="redeem">Redeem</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactions.map((tx: any) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium capitalize">{tx.transactionType}</p>
                        <p className="text-sm text-gray-600">{tx.sourceType}</p>
                        <p className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${tx.transactionType === 'earn' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.transactionType === 'earn' ? '+' : '-'}{tx.tokenAmount} OTT
                        </p>
                        <Badge variant={tx.status === 'confirmed' ? 'default' : 'secondary'}>
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* NFT Collectibles */}
            <Card>
              <CardHeader>
                <CardTitle>NFT Collectibles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {loyalty?.nftCollectibles?.map((nft: any) => (
                    <div key={nft.id} className="text-center">
                      <img
                        src={nft.imageUrl || '/placeholder-nft.png'}
                        alt={nft.name}
                        className="w-full h-24 object-cover rounded-lg mb-2"
                      />
                      <p className="text-sm font-medium">{nft.name}</p>
                      <Badge variant="outline">{nft.rarity}</Badge>
                    </div>
                  )) || (
                    <p className="col-span-2 text-center text-gray-500 py-8">
                      No NFT collectibles yet. Keep dining to unlock special NFTs!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="earn" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ways to Earn OTT Tokens</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Make Reservations</h3>
                  <p className="text-sm text-gray-600 mb-2">Earn 10-15 OTT per reservation</p>
                  <p className="text-xs text-gray-500">Bonus multipliers for weekends and prime time</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Write Reviews</h3>
                  <p className="text-sm text-gray-600 mb-2">Earn 5-10 OTT per review</p>
                  <p className="text-xs text-gray-500">Extra tokens for detailed reviews with photos</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Refer Friends</h3>
                  <p className="text-sm text-gray-600 mb-2">Earn 50 OTT per successful referral</p>
                  <p className="text-xs text-gray-500">Friend must complete their first reservation</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Special Events</h3>
                  <p className="text-sm text-gray-600 mb-2">Earn 25-150 OTT</p>
                  <p className="text-xs text-gray-500">Birthday, anniversary, and seasonal bonuses</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stake" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stake Your Tokens</CardTitle>
              <p className="text-sm text-gray-600">Earn 12% APY by staking your OTT tokens</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Amount to Stake</label>
                  <input
                    type="number"
                    value={stakingAmount}
                    onChange={(e) => setStakingAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full p-3 border rounded-lg"
                    min="100"
                    max={loyalty?.tokenBalance || 0}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Available: {loyalty?.tokenBalance?.toFixed(2) || '0.00'} OTT (Minimum: 100 OTT)
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Staking Duration</label>
                  <select
                    value={stakingDuration}
                    onChange={(e) => setStakingDuration(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="30">30 Days</option>
                    <option value="90">90 Days</option>
                    <option value="180">180 Days</option>
                    <option value="365">365 Days</option>
                  </select>
                </div>

                {stakingAmount && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm">
                      <strong>Estimated Rewards:</strong>{' '}
                      {((parseFloat(stakingAmount) * 0.12 * parseInt(stakingDuration)) / 365).toFixed(2)} OTT
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleStakeTokens}
                  disabled={!stakingAmount || parseFloat(stakingAmount) < 100}
                  className="w-full"
                >
                  Stake Tokens
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="redeem" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Redeem Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rewardOptions.map((reward) => (
                  <div key={reward.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <reward.icon className="h-6 w-6 text-blue-600" />
                      <Badge>{reward.cost} OTT</Badge>
                    </div>
                    <h3 className="font-semibold mb-2">{reward.name}</h3>
                    <Button
                      onClick={() => handleRedeemTokens(reward.cost, reward.id)}
                      disabled={(loyalty?.tokenBalance || 0) < reward.cost}
                      className="w-full"
                      variant={loyalty?.tokenBalance >= reward.cost ? 'default' : 'secondary'}
                    >
                      {loyalty?.tokenBalance >= reward.cost ? 'Redeem' : 'Insufficient Balance'}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Token Earners
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaderboard.map((entry: any, index: number) => (
                  <div key={entry.user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-800' :
                        index === 2 ? 'bg-amber-100 text-amber-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{entry.user.firstName} {entry.user.lastName}</p>
                        <Badge className={getTierColor(entry.loyaltyTier)} size="sm">
                          {entry.loyaltyTier.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{entry.totalEarned.toFixed(2)} OTT</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BlockchainLoyaltyDashboard;
