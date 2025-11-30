const { ethers } = require('hardhat');
require('dotenv').config();

async function main() {
    console.log('🚀 Starting OpenTable Token deployment...');

    // Get the contract factory
    const OpenTableToken = await ethers.getContractFactory('OpenTableToken');

    // Deploy the contract
    console.log('📝 Deploying OpenTableToken contract...');
    const token = await OpenTableToken.deploy();
    await token.waitForDeployment();

    const tokenAddress = await token.getAddress();
    console.log(`✅ OpenTableToken deployed to: ${tokenAddress}`);

    // Verify deployment
    const name = await token.name();
    const symbol = await token.symbol();
    const totalSupply = await token.totalSupply();
    const maxSupply = await token.MAX_SUPPLY();

    console.log('📊 Contract Details:');
    console.log(`   Name: ${name}`);
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Total Supply: ${ethers.formatEther(totalSupply)} ${symbol}`);
    console.log(`   Max Supply: ${ethers.formatEther(maxSupply)} ${symbol}`);

    // Save deployment info
    const deploymentInfo = {
        network: process.env.NETWORK || 'localhost',
        contractAddress: tokenAddress,
        deploymentTime: new Date().toISOString(),
        deployer: (await ethers.getSigners())[0].address,
        contractName: 'OpenTableToken',
        symbol: symbol,
        totalSupply: totalSupply.toString(),
        maxSupply: maxSupply.toString()
    };

    const fs = require('fs');
    const path = require('path');
    
    const deploymentsDir = path.join(__dirname, '../deployments');
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    fs.writeFileSync(
        path.join(deploymentsDir, 'OpenTableToken.json'),
        JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('💾 Deployment info saved to deployments/OpenTableToken.json');

    // Set up initial configuration
    console.log('⚙️ Setting up initial configuration...');
    
    // Register some mock restaurants (in production, this would be done through admin interface)
    const mockRestaurants = [
        '0x1234567890123456789012345678901234567890',
        '0x2345678901234567890123456789012345678901',
        '0x3456789012345678901234567890123456789012'
    ];

    for (const restaurant of mockRestaurants) {
        try {
            await token.registerRestaurant(restaurant);
            console.log(`   ✅ Registered restaurant: ${restaurant}`);
        } catch (error) {
            console.log(`   ❌ Failed to register restaurant ${restaurant}: ${error.message}`);
        }
    }

    console.log('🎉 Deployment completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Update your .env file with the contract address');
    console.log('2. Verify the contract on Polygonscan (if on mainnet)');
    console.log('3. Update frontend configuration with new contract address');
    console.log('4. Test token earning and staking functionality');

    return tokenAddress;
}

// Handle deployment errors
main()
    .then((address) => {
        console.log(`\n🏁 Final contract address: ${address}`);
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Deployment failed:', error);
        process.exit(1);
    });
