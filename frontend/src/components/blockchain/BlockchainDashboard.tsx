import React, { useState } from 'react';
import { ethers } from 'ethers';

interface LoyaltyData {
    tokenBalance: number;
    totalEarned: number;
    totalRedeemed: number;
    loyaltyTier: string;
    stakingBalance: number;
    stakingRewards: number;
    nftCollectibles: Array<{
        id: number;
        name: string;
        rarity: string;
        image: string;
        value: number;
    }>;
    recentTransactions: Array<{
        type: string;
        amount: number;
        source: string;
        date: string;
    }>;
}

interface BlockchainDashboardProps {
    loyaltyData: LoyaltyData;
    setLoyaltyData: React.Dispatch<React.SetStateAction<LoyaltyData>>;
}

const BlockchainDashboard: React.FC<BlockchainDashboardProps> = ({ loyaltyData, setLoyaltyData }) => {
    const [walletConnected, setWalletConnected] = useState(false);
    const [walletAddress, setWalletAddress] = useState('');
    const [stakeAmount, setStakeAmount] = useState('');
    const [stakeDuration, setStakeDuration] = useState('30');

    const connectWallet = async () => {
        if (typeof window.ethereum !== 'undefined') {
            try {
                const provider = new ethers.BrowserProvider(window.ethereum);
                await provider.send("eth_requestAccounts", []);
                const signer = await provider.getSigner();
                const address = await signer.getAddress();
                
                setWalletAddress(address);
                setWalletConnected(true);
                
                // Switch to Polygon network if needed
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0x89' }], // Polygon Mainnet
                    });
                } catch (switchError: any) {
                    if (switchError.code === 4902) {
                        // Add Polygon network
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: '0x89',
                                chainName: 'Polygon Mainnet',
                                nativeCurrency: {
                                    name: 'MATIC',
                                    symbol: 'MATIC',
                                    decimals: 18
                                },
                                rpcUrls: ['https://polygon-rpc.com/'],
                                blockExplorerUrls: ['https://polygonscan.com/']
                            }]
                        });
                    }
                }
            } catch (error) {
                console.error('Failed to connect wallet:', error);
            }
        } else {
            alert('Please install MetaMask to use blockchain features');
        }
    };

    const stakeTokens = async () => {
        if (!walletConnected || !stakeAmount) return;

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            
            // Contract interaction would go here
            // For now, simulate the staking
            const amount = parseInt(stakeAmount);
            setLoyaltyData(prev => ({
                ...prev,
                tokenBalance: prev.tokenBalance - amount,
                stakingBalance: prev.stakingBalance + amount,
                recentTransactions: [
                    {
                        type: 'stake',
                        amount: amount,
                        source: 'staking',
                        date: new Date().toISOString().split('T')[0]
                    },
                    ...prev.recentTransactions
                ]
            }));
            
            setStakeAmount('');
            alert(`Successfully staked ${amount} OTT tokens for ${stakeDuration} days!`);
        } catch (error) {
            console.error('Staking failed:', error);
            alert('Staking failed. Please try again.');
        }
    };

    const redeemTokens = (amount: number) => {
        setLoyaltyData(prev => ({
            ...prev,
            tokenBalance: prev.tokenBalance - amount,
            totalRedeemed: prev.totalRedeemed + amount,
            recentTransactions: [
                {
                    type: 'redeem',
                    amount: amount,
                    source: 'discount',
                    date: new Date().toISOString().split('T')[0]
                },
                ...prev.recentTransactions
            ]
        }));
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">🔗 Blockchain Loyalty</h2>
                <button
                    onClick={connectWallet}
                    className={`px-6 py-3 rounded-lg font-semibold ${
                        walletConnected 
                            ? 'bg-green-600 text-white' 
                            : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                >
                    {walletConnected ? `Connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Connect Wallet'}
                </button>
            </div>

            {/* Token Overview */}
            <div className="grid md:grid-cols-4 gap-6 mb-8">
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-purple-100">Token Balance</span>
                        <span className="text-2xl">🪙</span>
                    </div>
                    <div className="text-3xl font-bold">{loyaltyData.tokenBalance}</div>
                    <div className="text-sm text-purple-100">OTT Tokens</div>
                </div>
                
                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-green-100">Total Earned</span>
                        <span className="text-2xl">📈</span>
                    </div>
                    <div className="text-3xl font-bold">{loyaltyData.totalEarned}</div>
                    <div className="text-sm text-green-100">All Time</div>
                </div>
                
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-blue-100">Staking Balance</span>
                        <span className="text-2xl">🔒</span>
                    </div>
                    <div className="text-3xl font-bold">{loyaltyData.stakingBalance}</div>
                    <div className="text-sm text-blue-100">+{loyaltyData.stakingRewards} rewards</div>
                </div>
                
                <div className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-yellow-100">Tier Status</span>
                        <span className="text-2xl">👑</span>
                    </div>
                    <div className="text-3xl font-bold capitalize">{loyaltyData.loyaltyTier}</div>
                    <div className="text-sm text-yellow-100">Premium Benefits</div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
                {/* Staking Interface */}
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h3 className="text-2xl font-bold mb-4">💰 Token Staking</h3>
                    <div className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-semibold">Current Staking</span>
                                <span className="text-blue-600 font-bold">{loyaltyData.stakingBalance} OTT</span>
                            </div>
                            <div className="text-sm text-gray-600">Earning {loyaltyData.stakingRewards} tokens/month</div>
                        </div>
                        
                        <div className="space-y-3">
                            <label className="block text-sm font-medium">Stake Amount</label>
                            <input 
                                type="number" 
                                placeholder="Enter tokens to stake"
                                value={stakeAmount}
                                onChange={(e) => setStakeAmount(e.target.value)}
                                max={loyaltyData.tokenBalance}
                                className="w-full p-3 border rounded-lg focus:outline-none focus:border-blue-500" 
                            />
                            <select 
                                value={stakeDuration}
                                onChange={(e) => setStakeDuration(e.target.value)}
                                className="w-full p-3 border rounded-lg focus:outline-none focus:border-blue-500"
                            >
                                <option value="30">30 days (5% APY)</option>
                                <option value="90">90 days (8% APY)</option>
                                <option value="180">180 days (12% APY)</option>
                                <option value="365">365 days (18% APY)</option>
                            </select>
                            <button 
                                onClick={stakeTokens}
                                disabled={!walletConnected || !stakeAmount}
                                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
                            >
                                Stake Tokens
                            </button>
                        </div>
                    </div>
                </div>

                {/* NFT Collectibles */}
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h3 className="text-2xl font-bold mb-4">🎨 NFT Collectibles</h3>
                    <div className="space-y-4">
                        {loyaltyData.nftCollectibles.map(nft => (
                            <div key={nft.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                                <div className="flex items-center gap-3">
                                    <div className="text-3xl">{nft.image}</div>
                                    <div>
                                        <div className="font-semibold">{nft.name}</div>
                                        <div className="text-sm text-gray-600 capitalize">{nft.rarity}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-green-600">{nft.value} OTT</div>
                                    <button className="text-sm text-blue-600 hover:underline">View Details</button>
                                </div>
                            </div>
                        ))}
                        <button className="w-full border-2 border-dashed border-gray-300 py-8 rounded-lg text-gray-500 hover:border-purple-400 hover:text-purple-600">
                            + Earn More NFTs
                        </button>
                    </div>
                </div>
            </div>

            {/* Token Redemption */}
            <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
                <h3 className="text-2xl font-bold mb-4">🎁 Redeem Rewards</h3>
                <div className="grid md:grid-cols-3 gap-4">
                    {[
                        { amount: 100, reward: '$10 Dining Credit', description: 'Use at any partner restaurant' },
                        { amount: 250, reward: '25% Off Next Meal', description: 'Valid for reservations up to $200' },
                        { amount: 500, reward: 'Free VR Experience', description: 'Access to premium virtual dining' }
                    ].map((offer, i) => (
                        <div key={i} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="text-lg font-bold mb-2">{offer.reward}</div>
                            <div className="text-sm text-gray-600 mb-3">{offer.description}</div>
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-purple-600">{offer.amount} OTT</span>
                                <button 
                                    onClick={() => redeemTokens(offer.amount)}
                                    disabled={loyaltyData.tokenBalance < offer.amount}
                                    className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700 disabled:bg-gray-400"
                                >
                                    Redeem
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Transaction History */}
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-2xl font-bold mb-4">📊 Recent Transactions</h3>
                <div className="space-y-3">
                    {loyaltyData.recentTransactions.slice(0, 10).map((tx, i) => (
                        <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold
                                    ${tx.type === 'earn' ? 'bg-green-500' : tx.type === 'redeem' ? 'bg-red-500' : 'bg-blue-500'}`}>
                                    {tx.type === 'earn' ? '+' : tx.type === 'redeem' ? '-' : '🔒'}
                                </div>
                                <div>
                                    <div className="font-semibold capitalize">{tx.type} Tokens</div>
                                    <div className="text-sm text-gray-600">From {tx.source}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`font-bold ${tx.type === 'earn' ? 'text-green-600' : tx.type === 'redeem' ? 'text-red-600' : 'text-blue-600'}`}>
                                    {tx.type === 'redeem' ? '-' : '+'}{tx.amount} OTT
                                </div>
                                <div className="text-sm text-gray-500">{tx.date}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BlockchainDashboard;
