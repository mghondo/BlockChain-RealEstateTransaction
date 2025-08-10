// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import './MockLZEndpoint.sol';

contract PolygonUSDCBridge is ReentrancyGuard, NonblockingLzApp {
    IERC20 public immutable usdc;
    uint16 public immutable ethereumChainId;
    address public immutable escrowContract;
    ILayerZeroEndpoint public lzEndpointInterface;
    
    struct BridgeRequest {
        address buyer;
        uint256 amount;
        uint256 shares;
        uint256 timestamp;
        bool processed;
    }
    
    mapping(bytes32 => BridgeRequest) public bridgeRequests;
    mapping(address => uint256) public userNonce;
    
    event DepositInitiated(
        address indexed buyer,
        uint256 amount,
        uint256 shares,
        bytes32 indexed requestId,
        uint256 timestamp
    );
    
    event CrossChainDepositSent(
        address indexed buyer,
        uint256 amount,
        uint256 shares,
        bytes32 indexed requestId,
        uint256 lzFee
    );
    
    event DepositRefunded(
        address indexed buyer,
        uint256 amount,
        bytes32 indexed requestId
    );
    
    error InsufficientFee(uint256 required, uint256 provided);
    error InvalidAmount();
    error InvalidShares();
    error TransferFailed();
    error RequestNotFound();
    error RequestAlreadyProcessed();
    error Unauthorized();
    
    constructor(
        address _lzEndpoint,
        address _usdc,
        uint16 _ethereumChainId,
        address _escrowContract
    ) NonblockingLzApp(_lzEndpoint) {
        usdc = IERC20(_usdc);
        ethereumChainId = _ethereumChainId;
        escrowContract = _escrowContract;
        lzEndpointInterface = ILayerZeroEndpoint(_lzEndpoint);
    }
    
    // Function to initiate cross-chain deposit from Polygon to Ethereum
    function initiateDeposit(
        uint256 amount,
        uint256 shares,
        bytes calldata adapterParams
    ) external payable nonReentrant {
        if (amount == 0) revert InvalidAmount();
        if (shares == 0 || shares > 100) revert InvalidShares();
        
        // Transfer USDC from user to this contract
        if (!usdc.transferFrom(msg.sender, address(this), amount)) {
            revert TransferFailed();
        }
        
        // Generate unique request ID
        bytes32 requestId = keccak256(
            abi.encodePacked(msg.sender, amount, shares, userNonce[msg.sender], block.timestamp)
        );
        userNonce[msg.sender]++;
        
        // Store bridge request
        bridgeRequests[requestId] = BridgeRequest({
            buyer: msg.sender,
            amount: amount,
            shares: shares,
            timestamp: block.timestamp,
            processed: false
        });
        
        emit DepositInitiated(msg.sender, amount, shares, requestId, block.timestamp);
        
        // Send cross-chain message to Ethereum escrow contract
        _sendCrossChainDeposit(msg.sender, amount, shares, requestId, adapterParams);
    }
    
    function _sendCrossChainDeposit(
        address buyer,
        uint256 amount,
        uint256 shares,
        bytes32 requestId,
        bytes calldata adapterParams
    ) internal {
        bytes memory payload = abi.encode(buyer, amount, shares);
        
        // Get LayerZero fee estimate
        (uint256 messageFee, ) = lzEndpointInterface.estimateFees(
            ethereumChainId,
            address(this),
            payload,
            false,
            adapterParams
        );
        
        if (msg.value < messageFee) {
            revert InsufficientFee(messageFee, msg.value);
        }
        
        // Send LayerZero message
        _lzSend(
            ethereumChainId,
            payload,
            payable(msg.sender),
            address(0x0),
            adapterParams,
            msg.value
        );
        
        // Mark as processed
        bridgeRequests[requestId].processed = true;
        
        emit CrossChainDepositSent(buyer, amount, shares, requestId, messageFee);
    }
    
    // Estimate LayerZero fees for cross-chain transaction
    function estimateFee(
        uint256 amount,
        uint256 shares,
        bool useZro,
        bytes calldata adapterParams
    ) external view returns (uint256 nativeFee, uint256 zroFee) {
        bytes memory payload = abi.encode(msg.sender, amount, shares);
        return lzEndpointInterface.estimateFees(
            ethereumChainId,
            address(this),
            payload,
            useZro,
            adapterParams
        );
    }
    
    // Emergency function to refund USDC if cross-chain transfer fails
    function refundDeposit(bytes32 requestId) external nonReentrant {
        BridgeRequest storage request = bridgeRequests[requestId];
        
        if (request.buyer == address(0)) revert RequestNotFound();
        if (request.buyer != msg.sender) revert Unauthorized();
        if (request.processed) revert RequestAlreadyProcessed();
        
        // Allow refund only after 1 hour if not processed
        require(
            block.timestamp > request.timestamp + 1 hours,
            "Refund not available yet"
        );
        
        uint256 refundAmount = request.amount;
        request.processed = true; // Mark as processed to prevent double refund
        
        if (!usdc.transfer(msg.sender, refundAmount)) {
            revert TransferFailed();
        }
        
        emit DepositRefunded(msg.sender, refundAmount, requestId);
    }
    
    // Function to handle failed LayerZero messages (if needed)
    function _nonblockingLzReceive(
        uint16,
        bytes memory,
        uint64,
        bytes memory
    ) internal override {
        // Handle any return messages from Ethereum if needed
    }
    
    // Owner functions for contract management
    function withdrawStuckTokens(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
    
    function withdrawETH() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    // View functions
    function getBridgeRequest(bytes32 requestId) 
        external 
        view 
        returns (
            address buyer,
            uint256 amount,
            uint256 shares,
            uint256 timestamp,
            bool processed
        ) 
    {
        BridgeRequest memory request = bridgeRequests[requestId];
        return (
            request.buyer,
            request.amount,
            request.shares,
            request.timestamp,
            request.processed
        );
    }
    
    function getUserNonce(address user) external view returns (uint256) {
        return userNonce[user];
    }
    
    // Function to check if request is eligible for refund
    function isRefundEligible(bytes32 requestId) external view returns (bool) {
        BridgeRequest memory request = bridgeRequests[requestId];
        return (
            request.buyer != address(0) &&
            !request.processed &&
            block.timestamp > request.timestamp + 1 hours
        );
    }
}