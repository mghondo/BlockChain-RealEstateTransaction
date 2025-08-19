// Filename: RealEstate.sol
// Enhanced RealEstate contract using ERC-1155 for fractional ownership of properties as NFTs with a fixed 100 shares per property.
// Includes share trading, ownership tracking, and purchase functionality for blockchain integration.
// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.2;

import '@openzeppelin/contracts/token/ERC1155/ERC1155.sol';
import '@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol';
import '@openzeppelin/contracts/token/ERC1155/utils/ERC1155Receiver.sol';
import '@openzeppelin/contracts/utils/Counters.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';

contract RealEstate is ERC1155, ERC1155Holder, ReentrancyGuard {
  using Counters for Counters.Counter;
  
  Counters.Counter private _tokenIds;
  
  // Property metadata and pricing
  mapping(uint256 => string) private _uris;
  mapping(uint256 => uint256) private _propertyPrices; // Price per share in wei
  mapping(uint256 => bool) private _propertyExists;
  
  // Property details for marketplace integration
  struct PropertyDetails {
    uint256 pricePerShare;
    uint256 totalShares;
    uint256 availableShares;
    string metadataURI;
    address originalMinter;
    bool isActive;
  }
  
  mapping(uint256 => PropertyDetails) public properties;
  
  // Events for frontend integration
  event PropertyMinted(uint256 indexed tokenId, address indexed minter, uint256 pricePerShare, string uri);
  event SharesPurchased(uint256 indexed tokenId, address indexed buyer, uint256 amount, uint256 totalCost);
  event SharesTransferred(uint256 indexed tokenId, address indexed from, address indexed to, uint256 amount);
  event PropertyPriceUpdated(uint256 indexed tokenId, uint256 newPrice);

  constructor() ERC1155('') {}

  // Enhanced mint function with pricing
  function mint(string memory tokenURI, uint256 pricePerShare) public returns (uint256) {
    require(pricePerShare > 0, "Price per share must be greater than 0");
    
    _tokenIds.increment();
    uint256 newItemId = _tokenIds.current();
    
    // Mint all 100 shares to the contract initially
    _mint(address(this), newItemId, 100, '');
    
    // Store property details
    _uris[newItemId] = tokenURI;
    _propertyPrices[newItemId] = pricePerShare;
    _propertyExists[newItemId] = true;
    
    properties[newItemId] = PropertyDetails({
      pricePerShare: pricePerShare,
      totalShares: 100,
      availableShares: 100,
      metadataURI: tokenURI,
      originalMinter: msg.sender,
      isActive: true
    });
    
    emit PropertyMinted(newItemId, msg.sender, pricePerShare, tokenURI);
    return newItemId;
  }

  // Purchase shares of a property
  function purchaseShares(uint256 tokenId, uint256 amount) public payable nonReentrant {
    require(_propertyExists[tokenId], "Property does not exist");
    require(properties[tokenId].isActive, "Property is not active");
    require(amount > 0 && amount <= 100, "Invalid share amount");
    require(properties[tokenId].availableShares >= amount, "Not enough shares available");
    
    uint256 totalCost = properties[tokenId].pricePerShare * amount;
    require(msg.value >= totalCost, "Insufficient payment");
    
    // Transfer shares from contract to buyer
    _safeTransferFrom(address(this), msg.sender, tokenId, amount, '');
    
    // Update available shares
    properties[tokenId].availableShares -= amount;
    
    // Transfer payment to original minter
    (bool success, ) = payable(properties[tokenId].originalMinter).call{value: totalCost}('');
    require(success, "Payment transfer failed");
    
    // Refund excess payment
    if (msg.value > totalCost) {
      (bool refundSuccess, ) = payable(msg.sender).call{value: msg.value - totalCost}('');
      require(refundSuccess, "Refund failed");
    }
    
    emit SharesPurchased(tokenId, msg.sender, amount, totalCost);
  }

  // Transfer shares between users
  function transferShares(uint256 tokenId, address to, uint256 amount) public {
    require(_propertyExists[tokenId], "Property does not exist");
    require(to != address(0), "Cannot transfer to zero address");
    require(balanceOf(msg.sender, tokenId) >= amount, "Insufficient shares");
    
    _safeTransferFrom(msg.sender, to, tokenId, amount, '');
    
    emit SharesTransferred(tokenId, msg.sender, to, amount);
  }

  // Get share balance for a specific property and owner
  function getShareBalance(uint256 tokenId, address owner) public view returns (uint256) {
    require(_propertyExists[tokenId], "Property does not exist");
    return balanceOf(owner, tokenId);
  }

  // Get property price per share
  function getPropertyPrice(uint256 tokenId) public view returns (uint256) {
    require(_propertyExists[tokenId], "Property does not exist");
    return properties[tokenId].pricePerShare;
  }

  // Get available shares for purchase
  function getAvailableShares(uint256 tokenId) public view returns (uint256) {
    require(_propertyExists[tokenId], "Property does not exist");
    return properties[tokenId].availableShares;
  }

  // Update property price (only original minter)
  function updatePropertyPrice(uint256 tokenId, uint256 newPrice) public {
    require(_propertyExists[tokenId], "Property does not exist");
    require(msg.sender == properties[tokenId].originalMinter, "Only original minter can update price");
    require(newPrice > 0, "Price must be greater than 0");
    
    properties[tokenId].pricePerShare = newPrice;
    _propertyPrices[tokenId] = newPrice;
    
    emit PropertyPriceUpdated(tokenId, newPrice);
  }

  // Deactivate property (only original minter)
  function deactivateProperty(uint256 tokenId) public {
    require(_propertyExists[tokenId], "Property does not exist");
    require(msg.sender == properties[tokenId].originalMinter, "Only original minter can deactivate");
    
    properties[tokenId].isActive = false;
  }

  // Get total number of properties minted
  function getTotalProperties() public view returns (uint256) {
    return _tokenIds.current();
  }

  // Check if property exists
  function propertyExists(uint256 tokenId) public view returns (bool) {
    return _propertyExists[tokenId];
  }

  // Override uri function to return stored URI
  function uri(uint256 tokenId) public view override returns (string memory) {
    require(_propertyExists[tokenId], "Property does not exist");
    return _uris[tokenId];
  }

  // Batch transfer for efficiency
  function safeBatchTransferFrom(
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  ) public override {
    require(from == msg.sender || isApprovedForAll(from, msg.sender), "ERC1155: caller is not token owner or approved");
    
    for (uint256 i = 0; i < ids.length; i++) {
      require(_propertyExists[ids[i]], "Property does not exist");
    }
    
    _safeBatchTransferFrom(from, to, ids, amounts, data);
  }

  // Override supportsInterface to combine ERC1155 and ERC1155Receiver interfaces
  function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, ERC1155Receiver) returns (bool) {
    return super.supportsInterface(interfaceId);
  }
}
// Thorough Explanation:
// RealEstate.sol is a smart contract that tokenizes real estate properties as ERC-1155 NFTs, enabling fractional ownership with a fixed supply of 100
// shares per property. It uses OpenZeppelin's ERC1155 for multi-token support and Counters for ID management. The mint function creates new properties,
// assigning 100 shares to the caller and storing metadata URIs. This allows properties to be divided into affordable fractions, suitable for retail investors.
// The contract is minimal, focusing on minting and URI retrieval, with inheritance providing standard ERC-1155 functions like balanceOf and safeTransferFrom.
// The constructor sets an empty base URI, making it flexible for external metadata. Shares are minted atomically, ensuring fixed supply, and the uri function
//overrides the parent to use the mapping, mimicking ERC721URIStorage behavior.
// For production, consider adding access control to mint (e.g., onlyOwner) and events for minting. It integrates with escrow contracts via IERC1155,
// supporting transfers in finalizeSale. This ERC-1155 approach enhances the original ERC-721 version by natively handling fractions, aligning with tokenization
// trends like RealT, where properties are split into $1,000 shares for accessibility.3.7s
