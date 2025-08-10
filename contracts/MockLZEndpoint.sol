// Filename: MockLZEndpoint.sol
// This file implements mock contracts for LayerZero cross-chain messaging protocol, providing test implementations for endpoint functionality and base application contracts. It enables local testing of cross-chain communication without deploying to actual LayerZero infrastructure.

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0; // Specifies the Solidity compiler version for the contract

// Interface defining the core LayerZero endpoint functionality for cross-chain messaging
interface ILayerZeroEndpoint {
  // Function to estimate fees for cross-chain message transmission
  function estimateFees(
    uint16 _dstChainId, // Destination chain ID
    address _userApplication, // User application address
    bytes calldata _payload, // Message payload to send
    bool _payInZRO, // Whether to pay fees in ZRO token
    bytes calldata _adapterParam // Adapter parameters for message handling
  ) external view returns (uint256 nativeFee, uint256 zroFee); // Returns native and ZRO token fees

  // Function to send cross-chain messages
  function send(
    uint16 _dstChainId, // Destination chain ID
    bytes calldata _destination, // Destination address on target chain
    bytes calldata _payload, // Message payload to send
    address payable _refundAddress, // Address to refund excess fees
    address _zroPaymentAddress, // Address for ZRO token payment
    bytes calldata _adapterParams // Adapter parameters for message handling
  ) external payable; // Payable function requiring native token for fees
}

// Mock implementation of LayerZero endpoint for testing cross-chain functionality
contract MockLZEndpoint is ILayerZeroEndpoint {
  // Nested mapping to store trusted remote addresses for each chain and application
  mapping(address => mapping(uint16 => mapping(bytes => address)))
    public trustedRemoteLookup;

  // Mock implementation of fee estimation - returns fixed 0.001 ETH fee
  function estimateFees(
    uint16, // Destination chain ID (unused in mock)
    address, // User application address (unused in mock)
    bytes calldata, // Message payload (unused in mock)
    bool, // Pay in ZRO flag (unused in mock)
    bytes calldata // Adapter parameters (unused in mock)
  ) external pure override returns (uint256 nativeFee, uint256 zroFee) {
    return (1000000000000000, 0); // Returns 0.001 ETH native fee, 0 ZRO fee
  }

  // Mock implementation of message sending - accepts payment but doesn't actually send
  function send(
    uint16, // Destination chain ID (unused in mock)
    bytes calldata, // Destination address (unused in mock)
    bytes calldata, // Message payload (unused in mock)
    address payable, // Refund address (unused in mock)
    address, // ZRO payment address (unused in mock)
    bytes calldata // Adapter parameters (unused in mock)
  ) external payable override {} // Empty implementation for testing

  // Function to set trusted remote address for a specific chain
  function setTrustedRemote(
    uint16 _chainId,
    bytes calldata _trustedRemote
  ) external {
    trustedRemoteLookup[msg.sender][_chainId][_trustedRemote] = msg.sender; // Maps caller to trusted remote
  }

  // Function to get trusted remote address for a specific chain
  function getTrustedRemote(
    uint16 _chainId,
    bytes calldata _trustedRemote
  ) external view returns (address) {
    return trustedRemoteLookup[msg.sender][_chainId][_trustedRemote]; // Returns mapped trusted remote
  }
}

// Abstract base contract for LayerZero applications providing common functionality
abstract contract LzApp {
  address public lzEndpoint; // Address of the LayerZero endpoint contract

  // Constructor to initialize the endpoint address
  constructor(address _endpoint) {
    lzEndpoint = _endpoint; // Sets the LayerZero endpoint address
  }

  // Internal function for sending LayerZero messages (mock implementation)
  function _lzSend(
    uint16, // Destination chain ID (unused in mock)
    bytes memory, // Message payload (unused in mock)
    address payable, // Refund address (unused in mock)
    address, // ZRO payment address (unused in mock)
    bytes memory, // Adapter parameters (unused in mock)
    uint256 // Native fee amount (unused in mock)
  ) internal virtual {} // Empty virtual implementation for testing

  // Modifier for owner-only functions (simplified for testing)
  modifier onlyOwner() {
    _; // No access control check in mock version
  }

  // Virtual function to get contract owner (simplified for testing)
  function owner() public view virtual returns (address) {
    return msg.sender; // Returns caller as owner (simplified for testing)
  }
}

// Abstract contract for non-blocking LayerZero applications extending LzApp
abstract contract NonblockingLzApp is LzApp {
  // Constructor that calls parent LzApp constructor
  constructor(address _endpoint) LzApp(_endpoint) {} // Initializes parent with endpoint

  // Abstract function for handling received cross-chain messages
  function _nonblockingLzReceive(
    uint16 _srcChainId, // Source chain ID where message originated
    bytes memory _srcAddress, // Source address that sent the message
    uint64 _nonce, // Message nonce for ordering and uniqueness
    bytes memory _payload // Message payload received from source chain
  ) internal virtual; // Virtual function to be implemented by inheriting contracts
}

// Comprehensive LayerZero Mock Implementation Summary:
// MockLZEndpoint.sol provides essential mock implementations for LayerZero's cross-chain messaging protocol, enabling local testing of cross-chain
// functionality without deploying to actual LayerZero infrastructure. The ILayerZeroEndpoint interface defines core functions for fee estimation
// and message sending, while MockLZEndpoint provides simplified implementations that accept fees and track trusted remotes without actual transmission.
// The mock estimateFees function returns a fixed 0.001 ETH fee, and the send function is empty but payable to simulate real behavior.

// The abstract LzApp and NonblockingLzApp contracts provide base functionality for building LayerZero applications, with simplified owner management
// and placeholder message sending logic. These contracts serve as building blocks for cross-chain applications like the PolygonUSDCBridge and
// EscrowWithStableAndYieldCrossChain contracts in this project. The trusted remote lookup system enables applications to maintain authorized
// cross-chain counterparts, essential for secure cross-chain communication.

// This mock infrastructure is crucial for testing cross-chain escrow scenarios where USDC deposits must be verified across different chains before
// proceeding with real estate transactions. In production, these mocks would be replaced with actual LayerZero contracts, but for development
// and testing, they provide the necessary interface compliance while avoiding external dependencies. The implementation supports the 24-hour timelock
// and KYC verification requirements for cross-chain deposits in the tokenized real estate platform.
