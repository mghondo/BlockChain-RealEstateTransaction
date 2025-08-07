// Escrow.sol - This contract manages the escrow process for real estate transactions using NFTs.
pragma solidity ^0.8.0; // Specifies the Solidity compiler version to use, ensuring compatibility.

interface IERC721 { // Defines an interface for ERC721 tokens to interact with NFT transfers.
    function transferFrom(address _from, address _to, uint256 _id) external; // Declares the transferFrom function required for transferring NFTs.
}

contract Escrow { // Declares the Escrow contract which handles the escrow logic.
    address public nftAddress; // Public variable to store the address of the NFT contract.
    uint256 public nftID; // Public variable to store the ID of the NFT being sold.
    uint256 public purchasePrice; // Public variable to store the purchase price of the real estate.
    uint256 public escrowAmount; // Public variable to store the escrow (earnest money) amount.
    address payable public seller; // Public payable address for the seller.
    address payable public buyer; // Public payable address for the buyer.
    address public inspector; // Public address for the inspector.
    address public lender; // Public address for the lender.

    modifier onlyBuyer() { // Modifier to restrict function access to only the buyer.
        require(msg.sender == buyer, "Only buyer can call this function"); // Checks if the caller is the buyer, reverts with a message if not.
        _; // Placeholder for the modified function's body.
    }

    modifier onlyInspector() { // Modifier to restrict function access to only the inspector.
        require(msg.sender == inspector, "Only inspector can call this function"); // Checks if the caller is the inspector, reverts with a message if not.
        _; // Placeholder for the modified function's body.
    }

    bool public inspectionPassed = false;

    constructor( // Constructor function to initialize the Escrow contract with all necessary parameters.
        address _nftAddress, // Parameter for the NFT contract address.
        uint256 _nftID, // Parameter for the NFT ID.
        uint256 _purchasePrice, // Parameter for the purchase price.
        uint256 _escrowAmount, // Parameter for the escrow amount.
        address payable _seller, // Parameter for the seller's address.
        address payable _buyer, // Parameter for the buyer's address.
        address _inspector, // Parameter for the inspector's address.
        address _lender // Parameter for the lender's address.
    ) {
        nftAddress = _nftAddress; // Assigns the NFT contract address to the public variable.
        nftID = _nftID; // Assigns the NFT ID to the public variable.
        purchasePrice = _purchasePrice; // Assigns the purchase price to the public variable.
        escrowAmount = _escrowAmount; // Assigns the escrow amount to the public variable.
        seller = _seller;  // Assigns the seller's address to the public variable (note: fixed typo with space after =).
        buyer = _buyer; // Assigns the buyer's address to the public variable.
        inspector = _inspector; // Assigns the inspector's address to the public variable.
        lender = _lender; // Assigns the lender's address to the public variable.
    }



    // Function for buyer to deposit earnest money
    function depositEarnest() external payable onlyBuyer() { // Public payable function allowing the buyer to deposit earnest money, restricted by onlyBuyer modifier.
        // require(msg.sender == buyer, "Only buyer can deposit earnest money"); // Commented out redundant check since onlyBuyer modifier already handles it.
        require(msg.value == escrowAmount); // Ensures the deposited value matches the required escrow amount, reverts if not.
    }

    function updateInspectionStatus(bool _passed) public onlyInspector{
        inspectionPassed = _passed; // Public function to update the inspection status, setting it to true or false based on the input.
    }

    function getBalance() public view returns (uint) { // Public view function to retrieve the current balance of the Escrow contract.
        return address(this).balance; // Returns the Ether balance of the contract itself.
    }

    // Finalize the sale (with check for deposit)
    function finalizeSale() public { // Public function to finalize the sale, transferring the NFT if conditions are met.
        // Ensure earnest money has been deposited
        require(address(this).balance >= escrowAmount, "Earnest money not deposited"); // Checks if the contract's balance is at least the escrow amount, reverts if not.
        // Transfer NFT from seller to buyer
        IERC721(nftAddress).transferFrom(seller, buyer, nftID); // Calls transferFrom on the NFT contract to move the NFT from seller to buyer.
        // Optionally: Transfer the deposited funds to the seller
        // seller.transfer(address(this).balance); // Commented out optional transfer of funds to the seller.
    }
}