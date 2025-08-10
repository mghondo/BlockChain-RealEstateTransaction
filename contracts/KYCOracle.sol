// Filename: KYCOracle.sol
// This contract provides a KYC (Know Your Customer) verification oracle system that manages user verification status with time-based expiration. It enables owner-controlled verification and revocation with batch processing capabilities for compliance requirements.

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0; // Specifies the Solidity compiler version for the contract

// KYCOracle contract for managing user verification status
contract KYCOracle {
  // Struct to store KYC verification data for each user
  struct KYCData {
    bool isVerified; // Boolean flag indicating if user is currently verified
    uint256 verificationTimestamp; // Timestamp when verification was granted
    uint256 expirationTimestamp; // Timestamp when verification expires
  }

  // Mapping from user address to their KYC verification data
  mapping(address => KYCData) private kycVerifications;
  // Address of the contract owner who can verify/revoke KYC
  address public owner;
  // Array storing all addresses that have been verified (for enumeration)
  address[] public verifiedUsers;

  // Event emitted when a user's KYC is verified
  event KYCVerified(
    address indexed user,
    uint256 timestamp,
    uint256 expiration
  );
  // Event emitted when a user's KYC is revoked
  event KYCRevoked(address indexed user, uint256 timestamp);

  // Modifier to restrict functions to the contract owner only
  modifier onlyOwner() {
    require(msg.sender == owner, 'Only owner can perform this action'); // Ensures caller is owner
    _; // Continues execution if authorized
  }

  // Constructor sets the deployer as the contract owner
  constructor() {
    owner = msg.sender; // Sets the contract deployer as owner
  }

  // Function to verify a user's KYC with specified validity period
  function verifyKYC(address user, uint256 validityPeriod) external onlyOwner {
    require(user != address(0), 'Invalid user address'); // Validates user address is not zero
    require(validityPeriod > 0, 'Validity period must be positive'); // Validates validity period

    uint256 expiration = block.timestamp + validityPeriod; // Calculates expiration timestamp

    // Add user to verified users array if this is their first verification
    if (!kycVerifications[user].isVerified) {
      verifiedUsers.push(user); // Adds user to verified users list
    }

    // Update user's KYC data with new verification
    kycVerifications[user] = KYCData({
      isVerified: true, // Sets verification status to true
      verificationTimestamp: block.timestamp, // Records current timestamp
      expirationTimestamp: expiration // Sets expiration timestamp
    });

    emit KYCVerified(user, block.timestamp, expiration); // Emits verification event
  }

  // Function to revoke a user's KYC verification
  function revokeKYC(address user) external onlyOwner {
    require(kycVerifications[user].isVerified, 'User is not KYC verified'); // Validates user is currently verified

    kycVerifications[user].isVerified = false; // Sets verification status to false
    kycVerifications[user].expirationTimestamp = block.timestamp; // Sets expiration to current time

    emit KYCRevoked(user, block.timestamp); // Emits revocation event
  }

  // View function to check if a user's KYC is currently valid
  function isKYCVerified(address user) external view returns (bool) {
    KYCData memory kyc = kycVerifications[user]; // Retrieves user's KYC data
    return kyc.isVerified && block.timestamp <= kyc.expirationTimestamp; // Returns true if verified and not expired
  }

  // View function to get complete KYC data for a user
  function getKYCData(
    address user
  )
    external
    view
    returns (bool verified, uint256 timestamp, uint256 expiration)
  {
    KYCData memory kyc = kycVerifications[user]; // Retrieves user's KYC data
    return (
      kyc.isVerified && block.timestamp <= kyc.expirationTimestamp, // Current verification status
      kyc.verificationTimestamp, // Original verification timestamp
      kyc.expirationTimestamp // Expiration timestamp
    );
  }

  // View function to get the total count of users who have been verified
  function getVerifiedUsersCount() external view returns (uint256) {
    return verifiedUsers.length; // Returns length of verified users array
  }

  // Function to verify multiple users' KYC in a single transaction (gas optimization)
  function batchVerifyKYC(
    address[] calldata users,
    uint256 validityPeriod
  ) external onlyOwner {
    require(validityPeriod > 0, 'Validity period must be positive'); // Validates validity period

    // Iterate through all provided user addresses
    for (uint256 i = 0; i < users.length; i++) {
      address user = users[i]; // Gets current user address
      require(user != address(0), 'Invalid user address'); // Validates address is not zero

      uint256 expiration = block.timestamp + validityPeriod; // Calculates expiration timestamp

      // Add user to verified users array if this is their first verification
      if (!kycVerifications[user].isVerified) {
        verifiedUsers.push(user); // Adds user to verified users list
      }

      // Update user's KYC data with new verification
      kycVerifications[user] = KYCData({
        isVerified: true, // Sets verification status to true
        verificationTimestamp: block.timestamp, // Records current timestamp
        expirationTimestamp: expiration // Sets expiration timestamp
      });

      emit KYCVerified(user, block.timestamp, expiration); // Emits verification event for each user
    }
  }
}

// Comprehensive KYC Oracle Summary:
// KYCOracle.sol is a compliance-focused smart contract that manages Know Your Customer (KYC) verification for users in a decentralized system.
// The contract maintains verification status with time-based expiration, allowing only the contract owner to grant, revoke, or batch-process verifications.
// Each user's KYC data includes verification status, original timestamp, and expiration time, enabling time-limited compliance tracking.
// The system supports both individual and batch verification operations for gas efficiency when processing multiple users simultaneously.

// The contract integrates with real estate tokenization platforms to ensure regulatory compliance, particularly for cross-chain USDC deposits that require
// mandatory KYC verification before processing. Events provide transparent tracking of verification changes, while view functions enable external contracts
// to check user compliance status. The owner-controlled model ensures centralized compliance management while maintaining on-chain transparency.
// For production use, consider implementing multi-signature ownership, automated expiration notifications, and integration with external KYC providers.

// This oracle pattern is essential for regulated DeFi applications, enabling compliant tokenized real estate transactions while maintaining user privacy
// through address-based verification rather than storing personal information on-chain. The time-limited verification model supports regulatory requirements
// for periodic re-verification, making it suitable for institutional adoption in tokenized asset markets.
