// Filename: hardhat.config.js
// This file configures the Hardhat development environment for Solidity smart contracts, including compilation settings, network configurations, and external service integrations. It enables local development, testnet deployment, and contract verification on Etherscan.

// Import Hardhat toolbox providing essential development tools including testing, deployment, and verification utilities
require("@nomicfoundation/hardhat-toolbox");
// Import OpenZeppelin Hardhat upgrades plugin for deploying and managing upgradeable smart contracts
require("@openzeppelin/hardhat-upgrades");
// Load environment variables from .env file for sensitive configuration data like private keys and API keys
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
// Export Hardhat configuration object defining project settings
module.exports = {
  // Solidity compiler configuration
  solidity: {
    version: "0.8.9", // Specify Solidity compiler version for contract compilation
    settings: {
      // Optimizer settings to reduce gas costs and contract size
      optimizer: {
        enabled: true, // Enable the Solidity optimizer for gas optimization
        runs: 200 // Number of optimization runs (balance between deployment cost and runtime cost)
      }
    }
  },
  // Network configurations for different blockchain environments
  networks: {
    // Local development network configuration
    localhost: {
      url: "http://127.0.0.1:8545" // Local Hardhat node URL for development and testing
    },
    // Sepolia testnet configuration for testing with real network conditions
    sepolia: {
      url: "https://rpc.sepolia.org", // Public RPC endpoint for Sepolia testnet
      accounts: [process.env.PRIVATE_KEY] // Private key from environment variables for testnet deployment
    }
  },
  // Etherscan configuration for contract verification and source code publication
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY // API key from environment variables for Etherscan verification
  }
};

// Legacy configuration (commented out for reference)
// The following commented code shows the previous configuration without optimizer settings
// This configuration used a simpler Solidity version specification without optimization
// It's kept for reference and can be uncommented if reverting to basic configuration is needed

// require("@nomicfoundation/hardhat-toolbox");
// require("@openzeppelin/hardhat-upgrades");
// require("dotenv").config();

// /** @type import('hardhat/config').HardhatUserConfig */
// module.exports = {
//   solidity: "0.8.9",
//   networks: {
//     localhost: {
//       url: "http://127.0.0.1:8545"
//     },
//     sepolia: {
//       url: "https://rpc.sepolia.org",
//       accounts: [process.env.PRIVATE_KEY]
//     }
//   },
//   etherscan: {
//     apiKey: process.env.ETHERSCAN_API_KEY
//   }
// };

// Comprehensive Hardhat Configuration Summary:
// hardhat.config.js is the central configuration file for a Hardhat-based Ethereum development project, defining how contracts are compiled,
// tested, and deployed across different networks. The configuration enables Solidity 0.8.9 compilation with optimizer settings for gas efficiency,
// supporting both local development on Hardhat's built-in network and testnet deployment on Sepolia. The toolbox plugin provides essential
// development tools including Chai for testing, ethers.js for blockchain interaction, and Waffle for advanced testing features.

// The OpenZeppelin upgrades plugin enables deployment of upgradeable contracts using proxy patterns, essential for long-term contract maintenance
// and feature updates in production environments. Environment variables handle sensitive data like private keys and API keys, keeping them secure
// and separate from source code. The Etherscan integration allows automatic contract verification, publishing source code for transparency and
// enabling users to interact with verified contracts through the Etherscan interface.

// This configuration supports the complex real estate tokenization project with its multiple contract types including ERC-1155 NFTs, escrow contracts,
// cross-chain bridges, and mock contracts for Aave and LayerZero integration. The optimizer settings balance deployment costs with runtime efficiency,
// crucial for contracts handling financial transactions. For production deployment, additional networks like mainnet would be added with appropriate
// gas price strategies and more robust private key management using hardware wallets or secure key management services.
