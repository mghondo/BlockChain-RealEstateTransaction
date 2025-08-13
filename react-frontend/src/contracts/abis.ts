// Contract ABIs extracted from the original artifacts
export const REAL_ESTATE_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function mint(address to, string memory uri) returns (uint256)",
  "function approve(address to, uint256 tokenId)",
  "function getApproved(uint256 tokenId) view returns (address)",
  "function setApprovalForAll(address operator, bool approved)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
  "function transferFrom(address from, address to, uint256 tokenId)",
  "function safeTransferFrom(address from, address to, uint256 tokenId)",
  "function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data)"
];

export const ESCROW_ABI = [
  "function getPhase() view returns (uint8)",
  "function getPropertyDetails() view returns (tuple(address seller, address buyer, address nftAddress, uint256 nftID, uint256 purchasePrice, uint256 escrowAmount, uint256 inspectionPeriod, uint256 financingPeriod))",
  "function totalEarnestDeposited() view returns (uint256)",
  "function depositEarnest() payable",
  "function withdraw() nonpayable",
  "function approveInspection() nonpayable",
  "function updateSale() nonpayable",
  "function cancelSale() nonpayable",
  "function getInspectionPassed() view returns (bool)",
  "function getFinancingApproved() view returns (bool)",
  "function getSaleCompleted() view returns (bool)",
  "function getParticipants() view returns (address[])",
  "function getParticipantDeposit(address participant) view returns (uint256)"
];

export const ESCROW_WITH_STABLE_AND_YIELD_ABI = [
  "function getPhase() view returns (uint8)",
  "function getPropertyDetails() view returns (tuple(address seller, address buyer, address nftAddress, uint256 nftID, uint256 purchasePrice, uint256 escrowAmount, uint256 inspectionPeriod, uint256 financingPeriod))",
  "function totalEarnestDeposited() view returns (uint256)",
  "function depositEarnestUSDC(uint256 amount) nonpayable",
  "function withdrawUSDC() nonpayable",
  "function approveInspection() nonpayable",
  "function updateSale() nonpayable",
  "function claimYield() nonpayable",
  "function getTotalYieldEarned() view returns (uint256)",
  "function getParticipantYield(address participant) view returns (uint256)",
  "function getUSDCBalance() view returns (uint256)",
  "function getAUSDCBalance() view returns (uint256)"
];

export const ESCROW_WITH_STABLE_AND_YIELD_CROSS_CHAIN_ABI = [
  "function getPhase() view returns (uint8)",
  "function getPropertyDetails() view returns (tuple(address seller, address buyer, address nftAddress, uint256 nftID, uint256 purchasePrice, uint256 escrowAmount, uint256 inspectionPeriod, uint256 financingPeriod))",
  "function totalEarnestDeposited() view returns (uint256)",
  "function depositEarnestUSDC(uint256 amount) nonpayable",
  "function depositEarnestCrossChain(uint16 srcChainId, uint256 amount) payable",
  "function withdrawUSDC() nonpayable",
  "function approveInspection() nonpayable",
  "function updateSale() nonpayable",
  "function claimYield() nonpayable",
  "function getTotalYieldEarned() view returns (uint256)",
  "function getParticipantYield(address participant) view returns (uint256)",
  "function getCrossChainDeposits(address participant) view returns (uint256)",
  "function estimateFees(uint16 dstChainId, bytes memory payload) view returns (uint256 nativeFee, uint256 zroFee)"
];

export const MOCK_USDC_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount) nonpayable",
  "function burn(address from, uint256 amount) nonpayable"
];

export const MOCK_AUSDC_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)", 
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount) nonpayable",
  "function burn(address from, uint256 amount) nonpayable",
  "function getExchangeRate() view returns (uint256)",
  "function setExchangeRate(uint256 rate) nonpayable"
];

export const KYC_ORACLE_ABI = [
  "function isKYCApproved(address user) view returns (bool)",
  "function approveKYC(address user) nonpayable",
  "function revokeKYC(address user) nonpayable",
  "function addKYCOperator(address operator) nonpayable",
  "function removeKYCOperator(address operator) nonpayable",
  "function isKYCOperator(address operator) view returns (bool)"
];

// Contract addresses for different networks
export const CONTRACT_ADDRESSES = {
  // Ethereum Mainnet (chainId: 1)
  1: {
    RealEstate: "0x0000000000000000000000000000000000000000", // Update with actual address
    MockUSDC: "0xA0b86a33E6441319F8ee15A8EfA8C4f04c1E0F4b", // Actual USDC address
    KYCOracle: "0x0000000000000000000000000000000000000000", // Update with actual address
  },
  // Polygon (chainId: 137)
  137: {
    RealEstate: "0x0000000000000000000000000000000000000000", // Update with actual address
    MockUSDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // Actual USDC address on Polygon
    KYCOracle: "0x0000000000000000000000000000000000000000", // Update with actual address
  },
  // Sepolia Testnet (chainId: 11155111)
  11155111: {
    RealEstate: "0x0000000000000000000000000000000000000000", // Update with deployed address
    MockUSDC: "0x0000000000000000000000000000000000000000", // Update with deployed address
    KYCOracle: "0x0000000000000000000000000000000000000000", // Update with deployed address
  },
  // Polygon Amoy Testnet (chainId: 80002)
  80002: {
    RealEstate: "0x0000000000000000000000000000000000000000", // Update with deployed address
    MockUSDC: "0x0000000000000000000000000000000000000000", // Update with deployed address
    KYCOracle: "0x0000000000000000000000000000000000000000", // Update with deployed address
  }
};

// Escrow contract addresses - these would typically be registered in a factory contract
export const ESCROW_CONTRACTS = {
  // Example escrow contracts
  "0x1234567890123456789012345678901234567890": {
    type: "EscrowWithStableAndYieldCrossChain",
    network: 11155111 // Sepolia
  },
  "0x2345678901234567890123456789012345678901": {
    type: "EscrowWithStableAndYield", 
    network: 80002 // Polygon Amoy
  },
  "0x3456789012345678901234567890123456789012": {
    type: "Escrow",
    network: 11155111 // Sepolia
  }
};

// Layer Zero Chain IDs for cross-chain functionality
export const LAYER_ZERO_CHAIN_IDS = {
  1: 101,     // Ethereum Mainnet
  137: 109,   // Polygon
  11155111: 10161, // Sepolia
  80002: 10267     // Polygon Amoy
};