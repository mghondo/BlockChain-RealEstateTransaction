// Filename: PolygonUSDCBridge.sol
// This contract facilitates cross-chain USDC deposits from Polygon to Ethereum for real estate escrow transactions using LayerZero messaging protocol. It enables users to deposit USDC on Polygon and have it credited to escrow contracts on Ethereum, supporting fractional property ownership with built-in refund mechanisms for failed transactions.

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0; // Specifies the Solidity compiler version for the contract

// Import ERC20 interface for USDC token interactions
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
// Import ReentrancyGuard to prevent reentrancy attacks during cross-chain operations
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
// Import mock LayerZero contracts for cross-chain messaging functionality
import './MockLZEndpoint.sol';

// PolygonUSDCBridge contract inheriting from ReentrancyGuard and NonblockingLzApp for secure cross-chain operations
contract PolygonUSDCBridge is ReentrancyGuard, NonblockingLzApp {
  // Immutable USDC token contract interface for gas-efficient access
  IERC20 public immutable usdc;
  // Immutable Ethereum chain ID for LayerZero messaging
  uint16 public immutable ethereumChainId;
  // Immutable address of the target escrow contract on Ethereum
  address public immutable escrowContract;
  // LayerZero endpoint interface for fee estimation and message sending
  ILayerZeroEndpoint public lzEndpointInterface;

  // Struct to track cross-chain bridge requests with buyer information and processing status
  struct BridgeRequest {
    address buyer; // Address of the user initiating the cross-chain deposit
    uint256 amount; // Amount of USDC being bridged
    uint256 shares; // Number of property shares being purchased (out of 100)
    uint256 timestamp; // Timestamp when the request was created
    bool processed; // Flag indicating if the cross-chain message has been sent
  }

  // Mapping from unique request IDs to bridge request data
  mapping(bytes32 => BridgeRequest) public bridgeRequests;
  // Mapping from user addresses to their nonce for generating unique request IDs
  mapping(address => uint256) public userNonce;

  // Event emitted when a cross-chain deposit is initiated on Polygon
  event DepositInitiated(
    address indexed buyer, // Address of the user making the deposit
    uint256 amount, // Amount of USDC deposited
    uint256 shares, // Number of shares being purchased
    bytes32 indexed requestId, // Unique identifier for the bridge request
    uint256 timestamp // Timestamp when the deposit was initiated
  );

  // Event emitted when the cross-chain message is successfully sent to Ethereum
  event CrossChainDepositSent(
    address indexed buyer, // Address of the user making the deposit
    uint256 amount, // Amount of USDC being sent
    uint256 shares, // Number of shares being purchased
    bytes32 indexed requestId, // Unique identifier for the bridge request
    uint256 lzFee // LayerZero fee paid for the cross-chain message
  );

  // Event emitted when a failed deposit is refunded to the user
  event DepositRefunded(
    address indexed buyer, // Address of the user receiving the refund
    uint256 amount, // Amount of USDC refunded
    bytes32 indexed requestId // Unique identifier for the bridge request
  );

  // Custom error for insufficient LayerZero fees provided
  error InsufficientFee(uint256 required, uint256 provided);
  // Custom error for invalid deposit amounts (zero or negative)
  error InvalidAmount();
  // Custom error for invalid share amounts (zero or greater than 100)
  error InvalidShares();
  // Custom error for failed token transfers
  error TransferFailed();
  // Custom error when trying to access a non-existent bridge request
  error RequestNotFound();
  // Custom error when trying to process an already processed request
  error RequestAlreadyProcessed();
  // Custom error for unauthorized access attempts
  error Unauthorized();

  // Constructor to initialize the bridge with LayerZero endpoint, USDC token, target chain, and escrow contract
  constructor(
    address _lzEndpoint, // LayerZero endpoint address for cross-chain messaging
    address _usdc, // USDC token contract address on Polygon
    uint16 _ethereumChainId, // Ethereum chain ID for LayerZero protocol
    address _escrowContract // Target escrow contract address on Ethereum
  ) NonblockingLzApp(_lzEndpoint) {
    // Initialize parent contract with LayerZero endpoint
    usdc = IERC20(_usdc); // Set the USDC token interface
    ethereumChainId = _ethereumChainId; // Set the target Ethereum chain ID
    escrowContract = _escrowContract; // Set the target escrow contract address
    lzEndpointInterface = ILayerZeroEndpoint(_lzEndpoint); // Set the LayerZero endpoint interface
  }

  // Function to initiate cross-chain deposit from Polygon to Ethereum with validation and LayerZero messaging
  function initiateDeposit(
    uint256 amount, // Amount of USDC to deposit
    uint256 shares, // Number of property shares to purchase (1-100)
    bytes calldata adapterParams // LayerZero adapter parameters for message handling
  ) external payable nonReentrant {
    // Payable for LayerZero fees, protected against reentrancy
    if (amount == 0) revert InvalidAmount(); // Validate deposit amount is not zero
    if (shares == 0 || shares > 100) revert InvalidShares(); // Validate shares are within valid range

    // Transfer USDC from user to this contract for cross-chain bridging
    if (!usdc.transferFrom(msg.sender, address(this), amount)) {
      revert TransferFailed(); // Revert if USDC transfer fails
    }

    // Generate unique request ID using user address, amount, shares, nonce, and timestamp
    bytes32 requestId = keccak256(
      abi.encodePacked(
        msg.sender,
        amount,
        shares,
        userNonce[msg.sender],
        block.timestamp
      )
    );
    userNonce[msg.sender]++; // Increment user nonce for next request uniqueness

    // Store bridge request data for tracking and potential refunds
    bridgeRequests[requestId] = BridgeRequest({
      buyer: msg.sender, // Store the buyer's address
      amount: amount, // Store the deposit amount
      shares: shares, // Store the shares being purchased
      timestamp: block.timestamp, // Store the request timestamp
      processed: false // Mark as not yet processed
    });

    emit DepositInitiated(
      msg.sender,
      amount,
      shares,
      requestId,
      block.timestamp
    ); // Emit deposit initiation event

    // Send cross-chain message to Ethereum escrow contract
    _sendCrossChainDeposit(
      msg.sender,
      amount,
      shares,
      requestId,
      adapterParams
    );
  }

  // Internal function to send cross-chain deposit message via LayerZero protocol
  function _sendCrossChainDeposit(
    address buyer, // Buyer address to include in the message
    uint256 amount, // Amount of USDC being bridged
    uint256 shares, // Number of shares being purchased
    bytes32 requestId, // Unique request identifier for tracking
    bytes calldata adapterParams // LayerZero adapter parameters for message handling
  ) internal {
    bytes memory payload = abi.encode(buyer, amount, shares); // Encode message payload with buyer data

    // Get LayerZero fee estimate for the cross-chain message
    (uint256 messageFee, ) = lzEndpointInterface.estimateFees(
      ethereumChainId, // Destination chain ID (Ethereum)
      address(this), // Source contract address
      payload, // Message payload
      false, // Don't pay in ZRO tokens
      adapterParams // Adapter parameters
    );

    if (msg.value < messageFee) {
      revert InsufficientFee(messageFee, msg.value); // Revert if insufficient fee provided
    }

    // Send LayerZero message to Ethereum escrow contract
    _lzSend(
      ethereumChainId, // Destination chain ID
      payload, // Encoded message data
      payable(msg.sender), // Refund address for excess fees
      address(0x0), // ZRO payment address (not used)
      adapterParams, // Adapter parameters
      msg.value // Native token amount for fees
    );

    // Mark the request as processed to prevent duplicate sending
    bridgeRequests[requestId].processed = true;

    emit CrossChainDepositSent(buyer, amount, shares, requestId, messageFee); // Emit successful send event
  }

  // View function to estimate LayerZero fees for cross-chain transaction before execution
  function estimateFee(
    uint256 amount, // Amount of USDC to be bridged
    uint256 shares, // Number of shares to be purchased
    bool useZro, // Whether to pay fees in ZRO tokens instead of native tokens
    bytes calldata adapterParams // LayerZero adapter parameters for fee calculation
  ) external view returns (uint256 nativeFee, uint256 zroFee) {
    // Returns native and ZRO token fees
    bytes memory payload = abi.encode(msg.sender, amount, shares); // Encode payload for fee estimation
    return
      lzEndpointInterface.estimateFees(
        ethereumChainId, // Destination chain ID (Ethereum)
        address(this), // Source contract address
        payload, // Message payload for fee calculation
        useZro, // ZRO token payment preference
        adapterParams // Adapter parameters affecting fees
      );
  }

  // Emergency function to refund USDC if cross-chain transfer fails after timeout period
  function refundDeposit(bytes32 requestId) external nonReentrant {
    // Protected against reentrancy attacks
    BridgeRequest storage request = bridgeRequests[requestId]; // Get storage reference to modify processed flag

    if (request.buyer == address(0)) revert RequestNotFound(); // Validate request exists
    if (request.buyer != msg.sender) revert Unauthorized(); // Ensure only buyer can request refund
    if (request.processed) revert RequestAlreadyProcessed(); // Prevent refunds for processed requests

    // Allow refund only after 1 hour if not processed (gives time for cross-chain message)
    require(
      block.timestamp > request.timestamp + 1 hours,
      'Refund not available yet' // Error message for premature refund attempts
    );

    uint256 refundAmount = request.amount; // Store refund amount before state changes
    request.processed = true; // Mark as processed to prevent double refund attacks

    if (!usdc.transfer(msg.sender, refundAmount)) {
      revert TransferFailed(); // Revert if USDC transfer fails
    }

    emit DepositRefunded(msg.sender, refundAmount, requestId); // Emit refund event for tracking
  }

  // Internal function to handle failed LayerZero messages (required by NonblockingLzApp)
  function _nonblockingLzReceive(
    uint16, // Source chain ID (unused in current implementation)
    bytes memory, // Source address (unused in current implementation)
    uint64, // Nonce (unused in current implementation)
    bytes memory // Payload (unused in current implementation)
  ) internal override {
    // Handle any return messages from Ethereum if needed
    // This function can be extended to handle failure notifications or confirmations
  }

  // Emergency owner function to withdraw stuck tokens from the contract
  function withdrawStuckTokens(
    address token,
    uint256 amount
  ) external onlyOwner {
    IERC20(token).transfer(owner(), amount); // Transfer specified token amount to owner
  }

  // Emergency owner function to withdraw accumulated ETH fees from LayerZero operations
  function withdrawETH() external onlyOwner {
    payable(owner()).transfer(address(this).balance); // Transfer all ETH balance to owner
  }

  // View function to get complete bridge request details by request ID
  function getBridgeRequest(
    bytes32 requestId
  )
    external
    view
    returns (
      address buyer, // Address of the user who initiated the request
      uint256 amount, // Amount of USDC in the request
      uint256 shares, // Number of shares being purchased
      uint256 timestamp, // Timestamp when request was created
      bool processed // Whether the cross-chain message has been sent
    )
  {
    BridgeRequest memory request = bridgeRequests[requestId]; // Load request from storage
    return (
      request.buyer, // Return buyer address
      request.amount, // Return USDC amount
      request.shares, // Return share count
      request.timestamp, // Return creation timestamp
      request.processed // Return processing status
    );
  }

  // View function to get the current nonce for a user (used for request ID generation)
  function getUserNonce(address user) external view returns (uint256) {
    return userNonce[user]; // Return the user's current nonce
  }

  // View function to check if a bridge request is eligible for refund
  function isRefundEligible(bytes32 requestId) external view returns (bool) {
    BridgeRequest memory request = bridgeRequests[requestId]; // Load request from storage
    return (request.buyer != address(0) && // Request exists (buyer is not zero address)
      !request.processed && // Request has not been processed yet
      block.timestamp > request.timestamp + 1 hours); // One hour timeout has passed
  }
}

// Comprehensive Polygon USDC Bridge Summary:
// PolygonUSDCBridge.sol is a sophisticated cross-chain bridge contract that enables users to deposit USDC on Polygon and have it credited
// to escrow contracts on Ethereum for real estate tokenization transactions. The contract uses LayerZero's messaging protocol to send
// cross-chain messages containing buyer information, deposit amounts, and share purchases. It includes comprehensive safety mechanisms
// including reentrancy protection, request tracking, and emergency refund functionality for failed cross-chain transactions.

// The bridge supports fractional property ownership by allowing users to specify the number of shares (1-100) they wish to purchase
// along with their USDC deposit. Each request generates a unique ID using the buyer's address, amount, shares, nonce, and timestamp,
// preventing replay attacks and ensuring request uniqueness. The contract estimates LayerZero fees before execution and validates
// sufficient payment for cross-chain messaging, with excess fees refunded to users automatically.

// Security features include a 1-hour timeout period for refunds, preventing immediate refunds that could interfere with cross-chain
// message processing while still providing user protection for genuinely failed transactions. The contract inherits from ReentrancyGuard
// and NonblockingLzApp, providing battle-tested security patterns for cross-chain DeFi applications. Emergency functions allow contract
// owners to withdraw stuck tokens or accumulated fees, while view functions provide transparency for request status and refund eligibility.

// This bridge is essential for the tokenized real estate platform, enabling users to participate in property investments from Polygon
// while maintaining the security and functionality of Ethereum-based escrow contracts. It demonstrates advanced cross-chain DeFi patterns
// suitable for institutional adoption and regulatory compliance requirements in tokenized asset markets.
