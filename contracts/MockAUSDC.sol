// contracts/MockAUSDC.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockAUSDC is ERC20 {
    IERC20 public usdc;
    uint256 public yieldRatePerSecond = 1585489599; // ~5% APY
    mapping(address => uint256) public usdcReserves;
    uint256 public startTimestamp; // Track start time for yield

    constructor(address _usdc) ERC20("Mock aUSDC", "aUSDC") {
        usdc = IERC20(_usdc);
        startTimestamp = block.timestamp; // Set start time on deployment
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
        usdcReserves[to] += amount;
    }

    function burn(address from, uint256 amount) external {
        uint256 currentBalance = balanceOf(from); // Use actual balance including yield
        require(amount <= currentBalance, "ERC20: burn amount exceeds balance");
        _burn(from, amount);
        if (amount <= usdcReserves[from]) {
            usdcReserves[from] -= amount;
        } else {
            usdcReserves[from] = 0; // Reset if yield exceeds reserve
        }
    }

    function transferUSDC(address to, uint256 amount) external {
        uint256 currentBalance = balanceOf(msg.sender); // Use actual balance
        require(currentBalance >= amount, "Insufficient aUSDC balance");
        require(usdc.balanceOf(address(this)) >= amount, "Insufficient USDC balance");
        usdc.transfer(to, amount);
        if (amount <= usdcReserves[msg.sender]) {
            usdcReserves[msg.sender] -= amount;
        } else {
            usdcReserves[msg.sender] = 0; // Adjust reserve if yield is included
        }
    }

    function balanceOf(address account) public view override returns (uint256) {
        uint256 baseBalance = super.balanceOf(account);
        if (baseBalance == 0) return 0;
        uint256 secondsElapsed = block.timestamp - startTimestamp; // Accurate elapsed time
        return baseBalance + (baseBalance * yieldRatePerSecond * secondsElapsed) / 1e18;
    }

    function decimals() public view virtual override returns (uint8) {
        return 6;
    }
}