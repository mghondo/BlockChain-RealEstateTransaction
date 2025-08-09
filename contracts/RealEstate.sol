// Filename: RealEstate.sol
// This file defines a RealEstate contract using ERC-1155 for fractional ownership of properties as NFTs with a fixed 100 shares per property.
// It includes minting functionality, token ID management, and URI storage for metadata.
// SPDX-License-Identifier: Unlicense  
// Specifies the license for the contract, allowing unrestricted use.
pragma solidity ^0.8.2;  // Sets the Solidity compiler version to 0.8.2 or higher for compatibility and security features.
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";  // Imports the ERC1155 contract from OpenZeppelin for multi-token standard support.
import "@openzeppelin/contracts/utils/Counters.sol";  // Imports the Counters library from OpenZeppelin for safe incrementing of token IDs.
contract RealEstate is ERC1155 {  // Declares the RealEstate contract inheriting from ERC1155 for fractional NFT functionality.
using Counters for Counters.Counter;  // Uses the Counters library for the _tokenIds counter.
Counters.Counter private _tokenIds;  // Private counter for generating unique token IDs.
// Optional: Mapping for per-ID URI (similar to ERC721URIStorage)  // Comment explaining the URI mapping.
mapping(uint256 => string) private _uris;  // Private mapping to store metadata URIs for each token ID.
constructor() ERC1155("") {}  // Constructor initializing the ERC1155 contract with an empty base URI; base URI can be set externally if needed.
function mint(string memory tokenURI) public returns (uint256) {  // Public function to mint a new property token with 100 shares.
_tokenIds.increment();  // Increments the token ID counter.
uint256 newItemId = _tokenIds.current();  // Gets the current token ID value.
_mint(msg.sender, newItemId, 100, "");  // Mints 100 shares of the new token ID to the caller (seller), with empty data.
_uris[newItemId] = tokenURI;  // Stores the provided URI in the mapping for the new token ID.
return newItemId;  // Returns the new token ID.
}
// Function to get URI per ID (overrides if needed)  // Comment explaining the URI function.
function uri(uint256 tokenId) public view override returns (string memory) {  // Overrides the uri function from ERC1155 to return stored URI.
return _uris[tokenId];  // Returns the URI from the mapping for the given token ID.
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