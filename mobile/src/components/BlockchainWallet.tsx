import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal } from 'react-native';
import { ethers } from 'ethers';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WalletData {
    address: string;
    balance: string;
    tokenBalance: number;
    isConnected: boolean;
}

const BlockchainWallet: React.FC = () => {
    const [walletData, setWalletData] = useState<WalletData>({
        address: '',
        balance: '0',
        tokenBalance: 0,
        isConnected: false
    });
    const [modalVisible, setModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        checkWalletConnection();
    }, []);

    const checkWalletConnection = async () => {
        try {
            const savedAddress = await AsyncStorage.getItem('walletAddress');
            if (savedAddress) {
                setWalletData(prev => ({
                    ...prev,
                    address: savedAddress,
                    isConnected: true
                }));
                await updateWalletBalance(savedAddress);
            }
        } catch (error) {
            console.error('Error checking wallet connection:', error);
        }
    };

    const connectWallet = async () => {
        setLoading(true);
        try {
            // For mobile, we'll simulate wallet connection
            // In production, this would integrate with WalletConnect or similar
            const mockAddress = '0x' + Math.random().toString(16).substr(2, 40);
            
            await AsyncStorage.setItem('walletAddress', mockAddress);
            
            setWalletData({
                address: mockAddress,
                balance: '2.5',
                tokenBalance: 1250,
                isConnected: true
            });
            
            Alert.alert('Success', 'Wallet connected successfully!');
        } catch (error) {
            Alert.alert('Error', 'Failed to connect wallet');
            console.error('Wallet connection error:', error);
        } finally {
            setLoading(false);
        }
    };

    const disconnectWallet = async () => {
        try {
            await AsyncStorage.removeItem('walletAddress');
            setWalletData({
                address: '',
                balance: '0',
                tokenBalance: 0,
                isConnected: false
            });
            Alert.alert('Success', 'Wallet disconnected');
        } catch (error) {
            Alert.alert('Error', 'Failed to disconnect wallet');
        }
    };

    const updateWalletBalance = async (address: string) => {
        try {
            // Simulate balance fetching
            const mockBalance = (Math.random() * 5).toFixed(2);
            const mockTokenBalance = Math.floor(Math.random() * 2000) + 500;
            
            setWalletData(prev => ({
                ...prev,
                balance: mockBalance,
                tokenBalance: mockTokenBalance
            }));
        } catch (error) {
            console.error('Error updating balance:', error);
        }
    };

    const sendTokens = () => {
        Alert.alert(
            'Send Tokens',
            'This feature will allow you to send OTT tokens to other users.',
            [{ text: 'OK' }]
        );
    };

    const stakeTokens = () => {
        Alert.alert(
            'Stake Tokens',
            'Stake your OTT tokens to earn rewards!',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Stake', 
                    onPress: () => {
                        Alert.alert('Success', 'Tokens staked successfully!');
                        setWalletData(prev => ({
                            ...prev,
                            tokenBalance: prev.tokenBalance - 100
                        }));
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>🔗 Blockchain Wallet</Text>
            
            {!walletData.isConnected ? (
                <View style={styles.connectContainer}>
                    <Text style={styles.subtitle}>Connect your wallet to access blockchain features</Text>
                    <TouchableOpacity 
                        style={styles.connectButton} 
                        onPress={connectWallet}
                        disabled={loading}
                    >
                        <Text style={styles.connectButtonText}>
                            {loading ? 'Connecting...' : 'Connect Wallet'}
                        </Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.walletContainer}>
                    <View style={styles.addressContainer}>
                        <Text style={styles.addressLabel}>Wallet Address:</Text>
                        <Text style={styles.address}>
                            {walletData.address.slice(0, 6)}...{walletData.address.slice(-4)}
                        </Text>
                    </View>

                    <View style={styles.balanceContainer}>
                        <View style={styles.balanceItem}>
                            <Text style={styles.balanceLabel}>MATIC Balance</Text>
                            <Text style={styles.balanceValue}>{walletData.balance} MATIC</Text>
                        </View>
                        
                        <View style={styles.balanceItem}>
                            <Text style={styles.balanceLabel}>OTT Tokens</Text>
                            <Text style={styles.tokenBalance}>{walletData.tokenBalance} OTT</Text>
                        </View>
                    </View>

                    <View style={styles.actionsContainer}>
                        <TouchableOpacity style={styles.actionButton} onPress={sendTokens}>
                            <Text style={styles.actionButtonText}>Send Tokens</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={styles.actionButton} onPress={stakeTokens}>
                            <Text style={styles.actionButtonText}>Stake Tokens</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.actionButton, styles.disconnectButton]} 
                            onPress={disconnectWallet}
                        >
                            <Text style={styles.actionButtonText}>Disconnect</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.featuresContainer}>
                        <Text style={styles.featuresTitle}>Blockchain Features:</Text>
                        <Text style={styles.featureItem}>• Earn tokens from reservations</Text>
                        <Text style={styles.featureItem}>• Stake tokens for rewards</Text>
                        <Text style={styles.featureItem}>• Collect NFT dining badges</Text>
                        <Text style={styles.featureItem}>• Redeem tokens for discounts</Text>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f8f9fa',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        color: '#333',
    },
    connectContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 30,
        color: '#666',
        paddingHorizontal: 20,
    },
    connectButton: {
        backgroundColor: '#8B5CF6',
        paddingHorizontal: 40,
        paddingVertical: 15,
        borderRadius: 25,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    connectButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    walletContainer: {
        flex: 1,
    },
    addressContainer: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        marginBottom: 20,
        elevation: 2,
    },
    addressLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
    },
    address: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    balanceContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    balanceItem: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        flex: 0.48,
        elevation: 2,
    },
    balanceLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
    },
    balanceValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#10B981',
    },
    tokenBalance: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#8B5CF6',
    },
    actionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    actionButton: {
        backgroundColor: '#8B5CF6',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        marginBottom: 10,
        minWidth: '30%',
        alignItems: 'center',
    },
    disconnectButton: {
        backgroundColor: '#EF4444',
    },
    actionButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    featuresContainer: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        elevation: 2,
    },
    featuresTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    featureItem: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
    },
});

export default BlockchainWallet;
