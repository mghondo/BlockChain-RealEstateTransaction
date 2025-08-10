// deploy-crosschain.js - Deployment script for cross-chain real estate escrow system
const hre = require("hardhat");

// LayerZero endpoint addresses (mainnet)
const LAYERZERO_ENDPOINTS = {
  ethereum: "0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675",
  polygon: "0x3c2269811836af69497E5F486A85D7316753cf62"
};

// USDC token addresses (mainnet)
const USDC_ADDRESSES = {
  ethereum: "0xA0b86a33E6441D7C73C5f7c4f59EDB0e8eb6f2ab", // Ethereum USDC
  polygon: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"   // Polygon USDC
};

// Aave v3 addresses (mainnet)
const AAVE_ADDRESSES = {
  ethereum: {
    pool: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
    aUsdc: "0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c"
  }
};

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  const balance = await deployer.getBalance();
  console.log("Account balance:", hre.ethers.utils.formatEther(balance), "ETH");

  // Deploy KYC Oracle
  console.log("\n--- Deploying KYC Oracle ---");
  const KYCOracle = await hre.ethers.getContractFactory("KYCOracle");
  const kycOracle = await KYCOracle.deploy();
  await kycOracle.deployed();
  console.log("KYC Oracle deployed to:", kycOracle.address);

  // Deploy RealEstate NFT contract
  console.log("\n--- Deploying RealEstate NFT ---");
  const RealEstate = await hre.ethers.getContractFactory("RealEstate");
  const realEstate = await RealEstate.deploy();
  await realEstate.deployed();
  console.log("RealEstate deployed to:", realEstate.address);

  // Example property configuration
  const propertyConfig = {
    nftID: 1,
    purchasePrice: hre.ethers.utils.parseUnits("100000", 6), // $100,000 USDC
    escrowAmount: hre.ethers.utils.parseUnits("20000", 6),   // $20,000 USDC
    seller: deployer.address,
    inspector: deployer.address, // In production, use separate addresses
    lender: deployer.address     // In production, use separate addresses
  };

  // Deploy Cross-Chain Escrow (Ethereum)
  console.log("\n--- Deploying Cross-Chain Escrow (Ethereum) ---");
  const CrossChainEscrow = await hre.ethers.getContractFactory("EscrowWithStableAndYieldCrossChain");
  const escrow = await CrossChainEscrow.deploy(
    LAYERZERO_ENDPOINTS.ethereum,
    realEstate.address,
    propertyConfig.nftID,
    propertyConfig.purchasePrice,
    propertyConfig.escrowAmount,
    propertyConfig.seller,
    propertyConfig.inspector,
    propertyConfig.lender,
    USDC_ADDRESSES.ethereum,
    AAVE_ADDRESSES.ethereum.pool,
    AAVE_ADDRESSES.ethereum.aUsdc,
    kycOracle.address
  );
  await escrow.deployed();
  console.log("Cross-Chain Escrow deployed to:", escrow.address);

  // Deploy Polygon Bridge (would be deployed on Polygon)
  console.log("\n--- Deploying Polygon USDC Bridge ---");
  const PolygonBridge = await hre.ethers.getContractFactory("PolygonUSDCBridge");
  const polygonBridge = await PolygonBridge.deploy(
    LAYERZERO_ENDPOINTS.polygon, // Would use Polygon endpoint when deploying on Polygon
    USDC_ADDRESSES.polygon,      // Would use Polygon USDC when deploying on Polygon
    1,                          // Ethereum chain ID for LayerZero
    escrow.address
  );
  await polygonBridge.deployed();
  console.log("Polygon Bridge deployed to:", polygonBridge.address);

  // Mint initial property NFT
  console.log("\n--- Minting Property NFT ---");
  const mintTx = await realEstate.mint("https://ipfs.io/ipfs/QmPropertyMetadata");
  await mintTx.wait();
  console.log("Property NFT minted with ID:", propertyConfig.nftID);

  // Approve escrow to manage NFTs
  const approveTx = await realEstate.setApprovalForAll(escrow.address, true);
  await approveTx.wait();
  console.log("Escrow approved to manage NFTs");

  // Display deployment summary
  console.log("\n=== DEPLOYMENT SUMMARY ===");
  console.log("Network:", hre.network.name);
  console.log("Deployer:", deployer.address);
  console.log("KYC Oracle:", kycOracle.address);
  console.log("RealEstate NFT:", realEstate.address);
  console.log("Cross-Chain Escrow:", escrow.address);
  console.log("Polygon Bridge:", polygonBridge.address);
  
  console.log("\n=== PROPERTY CONFIGURATION ===");
  console.log("Property NFT ID:", propertyConfig.nftID);
  console.log("Purchase Price:", hre.ethers.utils.formatUnits(propertyConfig.purchasePrice, 6), "USDC");
  console.log("Escrow Amount:", hre.ethers.utils.formatUnits(propertyConfig.escrowAmount, 6), "USDC");
  console.log("Total Shares:", 100);

  console.log("\n=== NEXT STEPS ===");
  console.log("1. Verify KYC for all participants:");
  console.log("   await kycOracle.verifyKYC(buyerAddress, validityPeriod)");
  console.log("2. Initialize buyers in escrow:");
  console.log("   await escrow.initializeBuyers([buyer1, buyer2], [50, 50])");
  console.log("3. Deploy Polygon bridge on Polygon network");
  console.log("4. Set up LayerZero trusted remotes between chains");

  // Gas usage report
  const gasUsed = {
    kycOracle: (await kycOracle.deployTransaction.wait()).gasUsed,
    realEstate: (await realEstate.deployTransaction.wait()).gasUsed,
    escrow: (await escrow.deployTransaction.wait()).gasUsed,
    bridge: (await polygonBridge.deployTransaction.wait()).gasUsed
  };

  console.log("\n=== GAS USAGE REPORT ===");
  console.log("KYC Oracle:", gasUsed.kycOracle.toString());
  console.log("RealEstate:", gasUsed.realEstate.toString());
  console.log("Cross-Chain Escrow:", gasUsed.escrow.toString());
  console.log("Polygon Bridge:", gasUsed.bridge.toString());
  console.log("Total Gas Used:", gasUsed.kycOracle.add(gasUsed.realEstate).add(gasUsed.escrow).add(gasUsed.bridge).toString());

  // Verify contracts (optional, requires etherscan API key)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nWaiting for block confirmations...");
    await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
    
    try {
      await hre.run("verify:verify", {
        address: kycOracle.address,
        constructorArguments: []
      });
      
      await hre.run("verify:verify", {
        address: realEstate.address,
        constructorArguments: []
      });
      
      await hre.run("verify:verify", {
        address: escrow.address,
        constructorArguments: [
          LAYERZERO_ENDPOINTS.ethereum,
          realEstate.address,
          propertyConfig.nftID,
          propertyConfig.purchasePrice,
          propertyConfig.escrowAmount,
          propertyConfig.seller,
          propertyConfig.inspector,
          propertyConfig.lender,
          USDC_ADDRESSES.ethereum,
          AAVE_ADDRESSES.ethereum.pool,
          AAVE_ADDRESSES.ethereum.aUsdc,
          kycOracle.address
        ]
      });
      
      console.log("Contracts verified on Etherscan");
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });