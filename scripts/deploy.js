// scripts/deploy.js - Enhanced deployment script for RealEstate fractional ownership
const { ethers } = require('hardhat');

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log('\n🚀 Starting Enhanced RealEstate Contract Deployment');
    console.log('🔑 Deploying with account:', deployer.address);
    console.log('💰 Account balance:', ethers.utils.formatEther(await deployer.provider.getBalance(deployer.address)), 'ETH\n');

    try {
        // Deploy Enhanced RealEstate Contract
        console.log('📋 Deploying Enhanced RealEstate contract...');
        const RealEstate = await ethers.getContractFactory('RealEstate');
        const realEstate = await RealEstate.deploy();
        await realEstate.deployed();
        
        const contractAddress = realEstate.address;
        console.log('✅ Enhanced RealEstate deployed to:', contractAddress);

        // Verify deployment
        console.log('\n🔍 Verifying deployment...');
        const totalProperties = await realEstate.getTotalProperties();
        console.log('📊 Initial total properties:', totalProperties.toString());

        // Mint sample properties for testing
        console.log('\n🏠 Minting sample properties for testing...');
        
        const sampleProperties = [
            {
                uri: "https://ipfs.io/ipfs/QmSampleProperty1",
                pricePerShare: ethers.utils.parseEther("0.1") // 0.1 ETH per share
            },
            {
                uri: "https://ipfs.io/ipfs/QmSampleProperty2", 
                pricePerShare: ethers.utils.parseEther("0.05") // 0.05 ETH per share
            },
            {
                uri: "https://ipfs.io/ipfs/QmSampleProperty3",
                pricePerShare: ethers.utils.parseEther("0.2") // 0.2 ETH per share
            }
        ];

        const mintedTokenIds = [];
        for (let i = 0; i < sampleProperties.length; i++) {
            const property = sampleProperties[i];
            console.log(`   Minting property ${i + 1}...`);
            
            const tx = await realEstate.mint(property.uri, property.pricePerShare);
            const receipt = await tx.wait();
            
            // Extract token ID from events
            const tokenId = await realEstate.getTotalProperties();
            mintedTokenIds.push(tokenId);
            
            console.log(`   ✅ Property ${i + 1} minted with Token ID: ${tokenId}`);
            console.log(`      Price per share: ${ethers.utils.formatEther(property.pricePerShare)} ETH`);
            console.log(`      Transaction hash: ${tx.hash}`);
        }

        // Verify sample properties
        console.log('\n📋 Verifying sample properties...');
        for (const tokenId of mintedTokenIds) {
            const propertyDetails = await realEstate.properties(tokenId);
            const availableShares = propertyDetails[2]; // availableShares is index 2
            const pricePerShare = propertyDetails[0]; // pricePerShare is index 0
            
            console.log(`   Token ID ${tokenId}:`);
            console.log(`     Available shares: ${availableShares}/100`);
            console.log(`     Price per share: ${ethers.utils.formatEther(pricePerShare)} ETH`);
            console.log(`     Total value: ${ethers.utils.formatEther(pricePerShare.mul(100))} ETH`);
        }

        // Display contract information for frontend integration
        console.log('\n📄 Contract Information for Frontend Integration:');
        console.log('=====================================');
        console.log(`Contract Address: ${contractAddress}`);
        console.log(`Network: ${await deployer.provider.getNetwork().then(n => n.name)}`);
        console.log(`Chain ID: ${await deployer.provider.getNetwork().then(n => n.chainId)}`);
        console.log(`Deployer: ${deployer.address}`);
        console.log(`Total Properties: ${await realEstate.getTotalProperties()}`);
        
        console.log('\n🔧 Update your frontend configuration:');
        console.log('=====================================');
        console.log(`1. Update CONTRACT_ADDRESSES in abis.ts:`);
        console.log(`   ${await deployer.provider.getNetwork().then(n => n.chainId)}: {`);
        console.log(`     RealEstate: "${contractAddress}",`);
        console.log(`     ...`);
        console.log(`   }`);
        console.log(`\n2. Initialize Web3Service with:`);
        console.log(`   await web3Service.initialize(provider, "${contractAddress}");`);

        console.log('\n✅ Deployment completed successfully!');
        
        return {
            contractAddress,
            mintedTokenIds,
            deployer: deployer.address
        };

    } catch (error) {
        console.error('\n❌ Deployment failed:', error);
        throw error;
    }
}

// Enhanced error handling and execution
if (require.main === module) {
    main()
        .then((result) => {
            console.log('\n🎉 All operations completed successfully!');
            console.log('📊 Final Summary:', result);
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Deployment script failed:', error);
            process.exit(1);
        });
}

module.exports = main;