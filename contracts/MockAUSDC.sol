// Filename: MockAUSDC.sol
// This file implements a mock version of Aave's yield-bearing aUSDC token for testing purposes, simulating interest accrual over time.
// It integrates with MockUSDC for minting, burning, and transfers, allowing local testing of yield logic without mainnet dependencies.
// contracts/MockAUSDC.sol  // Path comment for the contract file.
// SPDX-License-Identifier: MIT  
// Specifies the license for the contract, MIT for permissive use.
// Specifies the Solidity compiler version for the contract.  // Comment on the pragma directive.
pragma solidity ^0.8.0;  // Sets the Solidity compiler version to 0.8.0 or higher.
// Imports the ERC20 contract from OpenZeppelin for standard token functionality.  // Comment on the import.
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";  // Imports ERC20 base for token standards.
// Custom interface for MockUSDC to allow minting in the mock.  // Comment explaining the custom interface.
interface IMockUSDC is IERC20 {  // Defines an interface extending IERC20 for MockUSDC.
function mint(address to, uint256 amount) external;  // Function signature for minting in MockUSDC.
}
// MockAUSDC contract that inherits from ERC20 to simulate Aave's yield-bearing USDC token.  // Comment on the contract purpose.
contract MockAUSDC is ERC20 {  // Declares the MockAUSDC contract inheriting from ERC20.
// Interface for the USDC token with mint capability.  // Comment on the usdc variable.
IMockUSDC public usdc;  // Public variable holding the IMockUSDC interface.
// Rate for simulating yield accrual per second (approximately 5% APY).  // Comment on the yield rate.
uint256 public yieldRatePerSecond = 1585489599; // ~5% APY  // Public variable for yield rate per second.
// Timestamp to track the start of yield accrual.  // Comment on the start timestamp.
uint256 public startTimestamp; // Track start time for yield  // Public variable for yield start timestamp.
// Constructor that initializes the token and sets the USDC interface and start timestamp.  // Comment on the constructor.
constructor(address _usdc) ERC20("Mock aUSDC", "aUSDC") {  // Constructor taking USDC address and initializing ERC20 with name and symbol.
usdc = IMockUSDC(_usdc);  // Sets the usdc interface with the provided address.
startTimestamp = block.timestamp; // Set start time on deployment  // Sets the start timestamp to current block time.
}
// External function to mint tokens.  // Comment on the mint function.
function mint(address to, uint256 amount) external {  // External function for minting tokens.
// Internal ERC20 function to mint tokens.  // Comment on the _mint call.
_mint(to, amount);  // Calls internal _mint to create tokens.
}
// External function to burn tokens, adjusted for yielded balance.  // Comment on the burn function.
function burn(address from, uint256 amount) external {  // External function for burning tokens with yield adjustment.
// Get the yielded balance.  // Comment on getting yielded balance.
uint256 yieldedBalance = balanceOf(from);  // Calls balanceOf to get adjusted balance.
require(amount <= yieldedBalance, "ERC20: burn amount exceeds balance");  // Requires amount not exceeding yielded balance.
// Get the base balance (principal).  // Comment on getting base balance.
uint256 baseBalance = super.balanceOf(from);  // Calls parent's balanceOf for base amount.
// Calculate proportional base to burn.  // Comment on baseToBurn calculation.
uint256 baseToBurn = (amount == yieldedBalance) ? baseBalance : (amount * baseBalance) / yieldedBalance;  // Computes base amount to burn proportionally.
// Burn the calculated base amount.  // Comment on the _burn call.
_burn(from, baseToBurn);  // Calls internal _burn with calculated amount.
}
// External function to transfer USDC from the contract, minting yield if necessary.  // Comment on the transferUSDC function.
function transferUSDC(address to, uint256 amount) external {  // External function to transfer USDC, simulating yield mint if needed.
// Mint extra USDC to simulate yield if the contract doesn't have enough.  // Comment on checking and minting.
uint256 currentUsdcBalance = usdc.balanceOf(address(this));  // Gets current USDC balance of this contract.
if (currentUsdcBalance < amount) {  // Checks if balance is insufficient.
usdc.mint(address(this), amount - currentUsdcBalance);  // Mints the difference to this contract.
}
// Transfer the full amount (principal + simulated yield).  // Comment on the transfer.
usdc.transfer(to, amount);  // Transfers the requested amount to the recipient.
}
// Overrides the balanceOf function to include simulated yield.  // Comment on the balanceOf override.
function balanceOf(address account) public view override returns (uint256) {  // Overrides balanceOf to add simulated yield.
// Gets the base balance without yield.  // Comment on base balance.
uint256 baseBalance = super.balanceOf(account);  // Calls parent's balanceOf.
// Returns 0 if base balance is 0.  // Comment on zero check.
if (baseBalance == 0) return 0;  // Returns 0 if no base balance.
// Calculates seconds elapsed since start.  // Comment on time calculation.
uint256 secondsElapsed = block.timestamp - startTimestamp; // Accurate elapsed time  // Computes time passed since start.
// Returns base balance plus simulated yield.  // Comment on yield addition.
return baseBalance + (baseBalance * yieldRatePerSecond * secondsElapsed) / 1e18;  // Adds calculated yield to base.
}
// Overrides the decimals function to return 6.  // Comment on the decimals override.
function decimals() public view virtual override returns (uint8) {  // Overrides decimals to match USDC's 6 decimals.
return 6;  // Returns 6 for decimal places.
}
}
// Thorough Explanation:
// MockAUSDC.sol is a mock contract simulating Aave's aUSDC yield-bearing token for local testing in Hardhat environments. 
//It inherits from ERC20, providing mint, burn, and transfer functions adjusted for simulated yield. The constructor sets the USDC interface 
// and start timestamp for yield calculation. Yield accrues at ~5% APY per second, added dynamically in balanceOf.
// The mint function creates tokens, burn proportionally reduces base on yielded balance, and transferUSDC mints extra USDC if needed to 
// simulate yield during withdrawals. balanceOf overrides to include time-based yield, and decimals ensures 6 places like USDC. 
// This allows testing escrow yield without mainnet, integrating with MockUSDC and MockAavePool.
// For realism, it could include variable rates or failure modes, but it's sufficient for basic testing. It supports fractional 
// ownership by handling USDC precision, aligning with retail tokenization where yield enhances escrowed funds. Use in tests to 
// simulate 90-day yields, as in RealEstate.js.2.6s