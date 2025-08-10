// Filename: terminalCommands.js
// This file contains commonly used terminal commands for the Hardhat development workflow, including code formatting, compilation, and testing commands. These commands are essential for maintaining code quality and ensuring contract functionality throughout the development process.

// Format all Solidity contracts using Prettier for consistent code style and readability
// npx prettier --write "contracts/**/*.sol"

// Compile all Solidity contracts and generate artifacts for deployment and testing
// npx hardhat compile

// Run the complete test suite to verify contract functionality and catch regressions
// npx hardhat test

// Additional Development Commands Reference:
// The commands above represent the core development workflow for this tokenized real estate project.
// Prettier formatting ensures consistent code style across all Solidity files, making the codebase more maintainable and professional.
// Contract compilation generates the necessary ABI and bytecode files required for deployment and frontend integration.
// The test command executes all test files in the test/ directory, validating contract behavior including escrow logic, fractional ownership, and cross-chain functionality.

// Extended Command Reference (uncomment as needed):
// npx hardhat node                              // Start local Hardhat network for development
// npx hardhat run scripts/deploy.js             // Deploy contracts to the configured network
// npx hardhat run scripts/deploy.js --network sepolia  // Deploy to Sepolia testnet
// npx hardhat verify --network sepolia <address>       // Verify contract on Etherscan
// npx hardhat console                           // Open interactive Hardhat console
// npx hardhat clean                            // Clean compilation artifacts
// npx hardhat size-contracts                   // Check contract sizes for deployment limits

// For continuous development, consider running tests in watch mode or setting up automated formatting in your editor.
// These commands form the foundation of the development lifecycle for complex DeFi contracts involving real estate tokenization,
// cross-chain bridges, and yield-bearing escrow mechanisms that require thorough testing and consistent code quality.