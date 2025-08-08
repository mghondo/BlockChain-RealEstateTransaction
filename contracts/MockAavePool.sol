// Filename: MockAavePool.sol
// Description at the bottom of this file.

// contracts/MockAavePool.sol
// SPDX-License-Identifier: MIT
// Specifies the Solidity compiler version for the contract.
pragma solidity ^0.8.0;

// Imports the IERC20 interface from OpenZeppelin for token interactions.
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// Imports the MockAUSDC contract for yield-bearing token simulation.
import "./MockAUSDC.sol";

// MockAavePool contract to simulate Aave's lending pool.
contract MockAavePool {
    // Interface for USDC token.
    IERC20 public usdc;
    // Instance of MockAUSDC for yield simulation.
    MockAUSDC public aUsdc;

    // Constructor to initialize USDC and aUSDC references.
    constructor(address _usdc, address _aUsdc) {
        usdc = IERC20(_usdc);
        aUsdc = MockAUSDC(_aUsdc);
    }

    // Function to simulate supplying assets to the pool.
    function supply(address asset, uint256 amount, address onBehalfOf, uint16) external {
        // Checks if the asset is USDC.
        require(asset == address(usdc), "Invalid asset");
        // Transfers USDC from the caller to the MockAUSDC contract.
        usdc.transferFrom(msg.sender, address(aUsdc), amount);
        // Mints aUSDC to the onBehalfOf address.
        aUsdc.mint(onBehalfOf, amount);
    }

    // Function to simulate withdrawing assets from the pool.
    function withdraw(address asset, uint256 amount, address to) external returns (uint256) {
        // Checks if the asset is USDC.
        require(asset == address(usdc), "Invalid asset");
        // Gets the caller's aUSDC balance.
        uint256 balance = aUsdc.balanceOf(msg.sender);
        // Calculates the withdrawal amount, handling max value.
        uint256 amountToWithdraw = amount == type(uint256).max ? balance : amount;
        // Burns the aUSDC tokens from the caller.
        aUsdc.burn(msg.sender, amountToWithdraw);
        // Transfers USDC from MockAUSDC to the recipient.
        aUsdc.transferUSDC(to, amountToWithdraw);
        // Returns the withdrawn amount.
        return amountToWithdraw;
    }
}

// Thorough Explanation:
// MockAavePool.sol is a mock contract that simulates Aave v3's lending pool for testing purposes. It handles supply and withdraw functions, integrating with MockAUSDC for yield simulation. The constructor sets references to USDC and aUSDC. The supply function transfers USDC to MockAUSDC and mints aUSDC, mimicking depositing funds into Aave. The withdraw function burns aUSDC and transfers USDC back, handling full withdrawals with type(uint256).max.

// This mock enables local testing of Aave interactions without mainnet, ensuring the escrow contract's yield logic works. It's minimal, focusing on core functions, and assumes valid calls.

// The contract is key for isolating Aave dependencies in tests, allowing simulation of liquidity and yield. For more realism, it could include interest rate models or failure modes, but it's sufficient for basic escrow testing.