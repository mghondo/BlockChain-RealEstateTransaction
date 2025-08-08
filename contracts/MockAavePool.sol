// contracts/MockAavePool.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./MockAUSDC.sol";

contract MockAavePool {
    IERC20 public usdc;
    MockAUSDC public aUsdc;

    constructor(address _usdc, address _aUsdc) {
        usdc = IERC20(_usdc);
        aUsdc = MockAUSDC(_aUsdc);
    }

    function supply(address asset, uint256 amount, address onBehalfOf, uint16) external {
        require(asset == address(usdc), "Invalid asset");
        usdc.transferFrom(msg.sender, address(aUsdc), amount);
        aUsdc.mint(onBehalfOf, amount);
    }

    function withdraw(address asset, uint256 amount, address to) external returns (uint256) {
        require(asset == address(usdc), "Invalid asset");
        uint256 balance = aUsdc.balanceOf(msg.sender);
        uint256 amountToWithdraw = amount == type(uint256).max ? balance : amount;
        aUsdc.burn(msg.sender, amountToWithdraw);
        aUsdc.transferUSDC(to, amountToWithdraw);
        return amountToWithdraw;
    }
}