// contracts/MockAUSDC.sol
// SPDX-License-Identifier: MIT
// Specifies the Solidity compiler version for the contract.
pragma solidity ^0.8.0;

// Imports the ERC20 contract from OpenZeppelin for standard token functionality.
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Custom interface for MockUSDC to allow minting in the mock.
interface IMockUSDC is IERC20 {
    function mint(address to, uint256 amount) external;
}

// MockAUSDC contract that inherits from ERC20 to simulate Aave's yield-bearing USDC token.
contract MockAUSDC is ERC20 {
    // Interface for the USDC token with mint capability.
    IMockUSDC public usdc;
    // Rate for simulating yield accrual per second (approximately 5% APY).
    uint256 public yieldRatePerSecond = 1585489599; // ~5% APY
    // Timestamp to track the start of yield accrual.
    uint256 public startTimestamp; // Track start time for yield

    // Constructor that initializes the token and sets the USDC interface and start timestamp.
    constructor(address _usdc) ERC20("Mock aUSDC", "aUSDC") {
        usdc = IMockUSDC(_usdc);
        startTimestamp = block.timestamp; // Set start time on deployment
    }

    // External function to mint tokens.
    function mint(address to, uint256 amount) external {
        // Internal ERC20 function to mint tokens.
        _mint(to, amount);
    }

    // External function to burn tokens, adjusted for yielded balance.
    function burn(address from, uint256 amount) external {
        // Get the yielded balance.
        uint256 yieldedBalance = balanceOf(from);
        require(amount <= yieldedBalance, "ERC20: burn amount exceeds balance");

        // Get the base balance (principal).
        uint256 baseBalance = super.balanceOf(from);

        // Calculate proportional base to burn.
        uint256 baseToBurn = (amount == yieldedBalance) ? baseBalance : (amount * baseBalance) / yieldedBalance;

        // Burn the calculated base amount.
        _burn(from, baseToBurn);
    }

    // External function to transfer USDC from the contract, minting yield if necessary.
    function transferUSDC(address to, uint256 amount) external {
        // Mint extra USDC to simulate yield if the contract doesn't have enough.
        uint256 currentUsdcBalance = usdc.balanceOf(address(this));
        if (currentUsdcBalance < amount) {
            usdc.mint(address(this), amount - currentUsdcBalance);
        }

        // Transfer the full amount (principal + simulated yield).
        usdc.transfer(to, amount);
    }

    // Overrides the balanceOf function to include simulated yield.
    function balanceOf(address account) public view override returns (uint256) {
        // Gets the base balance without yield.
        uint256 baseBalance = super.balanceOf(account);
        // Returns 0 if base balance is 0.
        if (baseBalance == 0) return 0;
        // Calculates seconds elapsed since start.
        uint256 secondsElapsed = block.timestamp - startTimestamp; // Accurate elapsed time
        // Returns base balance plus simulated yield.
        return baseBalance + (baseBalance * yieldRatePerSecond * secondsElapsed) / 1e18;
    }

    // Overrides the decimals function to return 6.
    function decimals() public view virtual override returns (uint8) {
        return 6;
    }
}