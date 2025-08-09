// Filename: MockUSDC.sol
// Description at the bottom of this file.

// SPDX-License-Identifier: MIT
// Specifies the Solidity compiler version for the contract.
pragma solidity ^0.8.0;

// Imports the ERC20 contract from OpenZeppelin for standard token functionality.
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// MockUSDC contract that inherits from ERC20 to simulate USDC token behavior.
contract MockUSDC is ERC20 {
    // Constructor that initializes the token with name "Mock USDC" and symbol "USDC".
    constructor() ERC20("Mock USDC", "USDC") {}

    // Public function to mint new tokens to a specified address, callable externally.
    function mint(address to, uint256 amount) external {
        // Internal ERC20 function to mint tokens.
        _mint(to, amount);
    }

    // Overrides the decimals function to return 6, matching USDC's decimal places.
    function decimals() public view virtual override returns (uint8) {
        return 6;
    }
}

// Thorough Explanation:
// MockUSDC.sol is a simple mock contract designed to simulate the USDC stablecoin for testing purposes in a local development environment like Hardhat. 
// It inherits from OpenZeppelin's ERC20 standard, providing basic token functionality such as transfer, 
// approval, and balance checks. The constructor sets the token name and symbol, while the mint function allows external calls to create new tokens, 
// which is useful for test setups where buyers and lenders need USDC balances.

// The decimals function is overridden to return 6, accurately mimicking USDC's decimal precision (unlike ETH's 18 decimals). 
// This ensures amount calculations in tests (e.g., $1 = 1,000,000 units) are correct. The contract is minimal, focusing on essential 
// features for escrow testing without real-world security concerns like access control on minting, as it's only for development.

// This mock is crucial for isolating tests from mainnet dependencies, allowing simulation of USDC transfers and balances without actual tokens. 
//It's integrated with the escrow contract's USDC handling and can be extended if needed for more advanced testing, such as burning or pausing tokens.