// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract KYCOracle {
    struct KYCData {
        bool isVerified;
        uint256 verificationTimestamp;
        uint256 expirationTimestamp;
    }
    
    mapping(address => KYCData) private kycVerifications;
    address public owner;
    address[] public verifiedUsers;
    
    event KYCVerified(address indexed user, uint256 timestamp, uint256 expiration);
    event KYCRevoked(address indexed user, uint256 timestamp);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    function verifyKYC(address user, uint256 validityPeriod) external onlyOwner {
        require(user != address(0), "Invalid user address");
        require(validityPeriod > 0, "Validity period must be positive");
        
        uint256 expiration = block.timestamp + validityPeriod;
        
        if (!kycVerifications[user].isVerified) {
            verifiedUsers.push(user);
        }
        
        kycVerifications[user] = KYCData({
            isVerified: true,
            verificationTimestamp: block.timestamp,
            expirationTimestamp: expiration
        });
        
        emit KYCVerified(user, block.timestamp, expiration);
    }
    
    function revokeKYC(address user) external onlyOwner {
        require(kycVerifications[user].isVerified, "User is not KYC verified");
        
        kycVerifications[user].isVerified = false;
        kycVerifications[user].expirationTimestamp = block.timestamp;
        
        emit KYCRevoked(user, block.timestamp);
    }
    
    function isKYCVerified(address user) external view returns (bool) {
        KYCData memory kyc = kycVerifications[user];
        return kyc.isVerified && block.timestamp <= kyc.expirationTimestamp;
    }
    
    function getKYCData(address user) external view returns (bool verified, uint256 timestamp, uint256 expiration) {
        KYCData memory kyc = kycVerifications[user];
        return (
            kyc.isVerified && block.timestamp <= kyc.expirationTimestamp,
            kyc.verificationTimestamp,
            kyc.expirationTimestamp
        );
    }
    
    function getVerifiedUsersCount() external view returns (uint256) {
        return verifiedUsers.length;
    }
    
    function batchVerifyKYC(address[] calldata users, uint256 validityPeriod) external onlyOwner {
        require(validityPeriod > 0, "Validity period must be positive");
        
        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            require(user != address(0), "Invalid user address");
            
            uint256 expiration = block.timestamp + validityPeriod;
            
            if (!kycVerifications[user].isVerified) {
                verifiedUsers.push(user);
            }
            
            kycVerifications[user] = KYCData({
                isVerified: true,
                verificationTimestamp: block.timestamp,
                expirationTimestamp: expiration
            });
            
            emit KYCVerified(user, block.timestamp, expiration);
        }
    }
}