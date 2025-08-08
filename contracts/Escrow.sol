// Filename: Escrow.sol
// Description at the bottom of this file.

// SPDX-License-Identifier: Unlicense
// Specifies the Solidity compiler version for the contract.
pragma solidity ^0.8.0;

// Import OpenZeppelin's ReentrancyGuard for security against reentrancy attacks
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// Interface for ERC721 to handle NFT transfers
interface IERC721 {
    // Declares the transferFrom function for moving NFTs between addresses
    function transferFrom(address _from, address _to, uint256 _id) external;
}

// Escrow contract for managing real estate transactions with NFTs
contract Escrow is ReentrancyGuard {
    // State variables for contract configuration
    address public immutable nftAddress; // Address of the NFT contract (immutable for gas savings)
    uint256 public immutable nftID; // ID of the NFT representing the property
    uint256 public immutable purchasePrice; // Total price of the property (e.g., 100 ETH)
    uint256 public immutable escrowAmount; // Earnest money deposit required (e.g., 20 ETH)
    address payable public immutable seller; // Seller's address for receiving funds
    address payable public immutable buyer; // Buyer's address for purchasing the NFT
    address public immutable inspector; // Inspector's address for updating inspection status
    address public immutable lender; // Lender's address for funding the remaining amount

    // Custom errors for gas-efficient reverts
    error Unauthorized(string role); // Thrown when an unauthorized party calls a function
    error InvalidPhase(uint8 requiredPhase, uint8 currentPhase); // Thrown for wrong transaction phase
    error InsufficientDeposit(uint256 required, uint256 provided); // Thrown for insufficient funds
    error InspectionNotPassed(); // Thrown if inspection hasn't passed
    error NotAllApproved(); // Thrown if approvals are incomplete
    error TransferFailed(); // Thrown if fund transfer fails

    // Struct to track transaction phase and timestamp for transparency
    struct Phase {
        uint8 id; // Phase ID (0: Created, 1: EarnestDeposited, 2: Approved, 3: FullyFunded, 4: Completed, 5: Cancelled)
        uint256 timestamp; // Timestamp when phase was entered
    }
    Phase public currentPhase = Phase(0, block.timestamp); // Initialize to Created phase

    // Approval status for each party (true if approved)
    mapping(address => bool) public approvals;

    // Inspection status (true if passed)
    bool public inspectionPassed;

    // Events for off-chain tracking and user interface updates
    event EarnestMoneyDeposited(address indexed buyer, uint256 amount, uint256 timestamp);
    event InspectionStatusUpdated(address indexed inspector, bool passed, uint256 timestamp);
    event ApprovalGranted(address indexed approver, string role, uint256 timestamp);
    event FullPriceFunded(address indexed funder, uint256 amount, uint256 timestamp);
    event TransactionFinalized(address indexed buyer, address indexed seller, uint256 amount, uint256 timestamp);
    event TransactionCancelled(bool inspectionFailed, uint256 refundedAmount, address indexed recipient, uint256 timestamp);

    // Constructor to initialize the escrow with transaction details
    constructor(
        address _nftAddress, // Address of the RealEstate NFT contract
        uint256 _nftID, // NFT ID for the property
        uint256 _purchasePrice, // Full purchase price
        uint256 _escrowAmount, // Earnest money required
        address payable _seller, // Seller's address
        address payable _buyer, // Buyer's address
        address _inspector, // Inspector's address
        address _lender // Lender's address
    ) {
        nftAddress = _nftAddress;
        nftID = _nftID;
        purchasePrice = _purchasePrice;
        escrowAmount = _escrowAmount;
        seller = _seller;
        buyer = _buyer;
        inspector = _inspector;
        lender = _lender;
    }

    // Modifier to restrict functions to specific roles
    modifier onlyRole(string memory _role) {
        if (keccak256(abi.encodePacked(_role)) == keccak256(abi.encodePacked("buyer")) && msg.sender != buyer) {
            revert Unauthorized("buyer");
        } else if (keccak256(abi.encodePacked(_role)) == keccak256(abi.encodePacked("inspector")) && msg.sender != inspector) {
            revert Unauthorized("inspector");
        } else if (keccak256(abi.encodePacked(_role)) == keccak256(abi.encodePacked("lender")) && msg.sender != lender) {
            revert Unauthorized("lender");
        } else if (keccak256(abi.encodePacked(_role)) == keccak256(abi.encodePacked("seller")) && msg.sender != seller) {
            revert Unauthorized("seller");
        }
        _;
    }

    // Modifier to restrict functions to specific transaction phases
    modifier atPhase(uint8 _phase) {
        if (currentPhase.id != _phase) {
            revert InvalidPhase(_phase, currentPhase.id);
        }
        _;
    }

    // Deposit earnest money (buyer only, first step, advances to EarnestDeposited)
    function depositEarnest() external payable onlyRole("buyer") atPhase(0) {
        // Ensure the deposit meets or exceeds the required earnest amount
        if (msg.value < escrowAmount) {
            revert InsufficientDeposit(escrowAmount, msg.value);
        }
        // Update phase to EarnestDeposited and record timestamp
        currentPhase = Phase(1, block.timestamp);
        // Emit event for tracking
        emit EarnestMoneyDeposited(msg.sender, msg.value, block.timestamp);
    }

    // Update inspection status (inspector only, after earnest deposit)
    function updateInspectionStatus(bool _passed) external onlyRole("inspector") atPhase(1) {
        // Set inspection status based on inspector's input
        inspectionPassed = _passed;
        // Emit event for tracking
        emit InspectionStatusUpdated(msg.sender, _passed, block.timestamp);
    }

    // Approve transaction by role (buyer, seller, lender, after earnest deposit, advances to Approved if all done)
    function approveByRole(string memory _role) external onlyRole(_role) atPhase(1) {
        // Record approval for the caller
        approvals[msg.sender] = true;
        // Emit event with role for clarity
        emit ApprovalGranted(msg.sender, _role, block.timestamp);
        // Check if all required parties have approved
        if (approvals[buyer] && approvals[seller] && approvals[lender]) {
            // Advance to Approved phase
            currentPhase = Phase(2, block.timestamp);
        }
    }

    // Deposit remaining funds to reach full purchase price (buyer or lender, after approvals, advances to FullyFunded)
    function depositFullPrice() external payable atPhase(2) {
        // Allow buyer or lender to deposit (flexible for real-world scenarios)
        if (msg.sender != buyer && msg.sender != lender) {
            revert Unauthorized("buyer or lender");
        }
        // Emit event for tracking
        emit FullPriceFunded(msg.sender, msg.value, block.timestamp);
        // Advance to FullyFunded if total balance meets or exceeds purchase price
        if (address(this).balance >= purchasePrice) {
            currentPhase = Phase(3, block.timestamp);
        }
    }

    // Finalize the sale (anyone can trigger, after full funding, non-reentrant)
    function finalizeSale() external nonReentrant atPhase(3) {
        // Ensure inspection has passed
        if (!inspectionPassed) {
            revert InspectionNotPassed();
        }
        // Ensure all parties have approved
        if (!approvals[buyer] || !approvals[seller] || !approvals[lender]) {
            revert NotAllApproved();
        }
        // Ensure full purchase price is deposited
        if (address(this).balance < purchasePrice) {
            revert InsufficientDeposit(purchasePrice, address(this).balance);
        }

        // Transfer all funds to seller
        (bool success, ) = seller.call{value: address(this).balance}("");
        if (!success) {
            revert TransferFailed();
        }

        // Transfer NFT to buyer
        IERC721(nftAddress).transferFrom(seller, buyer, nftID);

        // Update phase to Completed
        currentPhase = Phase(4, block.timestamp);
        // Emit event for tracking
        emit TransactionFinalized(buyer, seller, address(this).balance, block.timestamp);
    }

    // Cancel the sale (before completion, non-reentrant)
    function cancelSale() external nonReentrant {
        // Ensure sale isn't already finalized or cancelled
        if (currentPhase.id == 4 || currentPhase.id == 5) {
            revert InvalidPhase(3, currentPhase.id); // Use 3 as a generic "active" phase
        }

        uint256 balance = address(this).balance;
        address payable recipient;
        bool inspectionFailed = !inspectionPassed;

        // Refund to buyer if inspection failed, otherwise forfeit to seller
        if (inspectionFailed) {
            recipient = buyer;
        } else {
            recipient = seller;
        }

        // Transfer funds to appropriate party
        (bool success, ) = recipient.call{value: balance}("");
        if (!success) {
            revert TransferFailed();
        }

        // Update phase to Cancelled
        currentPhase = Phase(5, block.timestamp);
        // Emit event for tracking
        emit TransactionCancelled(inspectionFailed, balance, recipient, block.timestamp);
    }

    // Fallback to accept direct Ether deposits (for flexibility, but prefer depositFullPrice)
    receive() external payable {
        // No phase advancement here to encourage use of depositFullPrice
    }

    // View function to check contract balance
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

// Thorough Explanation:
// Escrow.sol is the original version of the escrow contract designed for managing real estate transactions using native ETH on Ethereum. It handles a multi-step process for a property sale represented as an NFT, including earnest money deposit, inspection, approvals from buyer, seller, and lender, full funding, finalization with NFT transfer, and cancellation logic. The contract uses immutable variables for gas efficiency, custom errors for cost-effective reverts, and a phase struct to track transaction progress with timestamps. Security is enhanced with ReentrancyGuard to prevent reentrancy attacks, and events are emitted for off-chain tracking.

//The contract ensures only authorized roles can perform actions via the `onlyRole` modifier, and phases are enforced with the `atPhase` modifier to maintain sequence. Deposits are checked for sufficiency, and funds are transferred securely using low-level calls. Cancellation refunds or forfeits funds based on inspection status, making it suitable for real-world escrow scenarios where trust and transparency are key. This version does not include stablecoin or yield features, focusing on basic ETH handling.

// This basic implementation provides a foundation for the advanced EscrowWithStableAndYield.sol, which adds USDC stability and Aave yield. It's ideal for learning Solidity patterns like interfaces, modifiers, and events, but for production, consider audits and upgrades for volatility mitigation. The code is concise yet comprehensive, with room for expansions like time-locks or oracle integrations.