// Filename: EscrowWithStableAndYield.sol
// Description at the bottom of this file.

// SPDX-License-Identifier: Unlicense
// Specifies the Solidity compiler version for the contract.
pragma solidity ^0.8.0;

// Import OpenZeppelin's ReentrancyGuard for security against reentrancy attacks.
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
// Import OpenZeppelin's IERC20 interface for USDC token interactions.
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Aave v3 interfaces
// Interface for Aave's lending pool to handle supply and withdraw operations.
interface IPool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

// Interface for Aave's yield-bearing token to check balances.
interface IAaveToken {
    function balanceOf(address account) external view returns (uint256);
}

// ERC721 interface for NFT transfers.
interface IERC721 {
    function transferFrom(address _from, address _to, uint256 _id) external;
}

// Escrow contract with USDC and Aave yield for real estate transactions, inheriting ReentrancyGuard.
contract EscrowWithStableAndYield is ReentrancyGuard {
    // Immutable state variables for contract configuration.
    address public immutable nftAddress; // Address of the NFT contract.
    uint256 public immutable nftID; // ID of the NFT representing the property.
    uint256 public immutable purchasePrice; // Total price in USDC units (6 decimals).
    uint256 public immutable escrowAmount; // Earnest money in USDC units.
    address payable public immutable seller; // Seller's address.
    address payable public immutable buyer; // Buyer's address.
    address public immutable inspector; // Inspector's address.
    address public immutable lender; // Lender's address.
    IERC20 public immutable usdc; // USDC token interface.
    IPool public immutable aavePool; // Aave lending pool interface.
    address public immutable aUsdc; // Aave yield-bearing USDC token.

    // Custom errors for efficient reverts.
    error Unauthorized(string role);
    error InvalidPhase(uint8 requiredPhase, uint8 currentPhase);
    error InsufficientDeposit(uint256 required, uint256 provided);
    error InspectionNotPassed();
    error NotAllApproved();
    error TransferFailed();

    // Struct to track transaction phase and timestamp.
    struct Phase {
        uint8 id; // Phase ID (0-5).
        uint256 timestamp; // Timestamp when phase was entered.
    }
    // Initializes the current phase to Created.
    Phase public currentPhase = Phase(0, block.timestamp);

    // Mapping for approval status of each party.
    mapping(address => bool) public approvals;

    // Inspection status flag.
    bool public inspectionPassed;

    // Events for tracking transaction events.
    event EarnestMoneyDeposited(address indexed buyer, uint256 amount, uint256 timestamp);
    event InspectionStatusUpdated(address indexed inspector, bool passed, uint256 timestamp);
    event ApprovalGranted(address indexed approver, string role, uint256 timestamp);
    event FullPriceFunded(address indexed funder, uint256 amount, uint256 timestamp);
    event TransactionFinalized(address indexed buyer, address indexed seller, uint256 amount, uint256 timestamp);
    event TransactionCancelled(bool inspectionFailed, uint256 refundedAmount, address indexed recipient, uint256 timestamp);
    event YieldEarned(uint256 amount, uint256 timestamp);

    // Constructor to initialize all immutable variables.
    constructor(
        address _nftAddress,
        uint256 _nftID,
        uint256 _purchasePrice,
        uint256 _escrowAmount,
        address payable _seller,
        address payable _buyer,
        address _inspector,
        address _lender,
        address _usdc,
        address _aavePool,
        address _aUsdc
    ) {
        nftAddress = _nftAddress;
        nftID = _nftID;
        purchasePrice = _purchasePrice;
        escrowAmount = _escrowAmount;
        seller = _seller;
        buyer = _buyer;
        inspector = _inspector;
        lender = _lender;
        usdc = IERC20(_usdc);
        aavePool = IPool(_aavePool);
        aUsdc = _aUsdc;
    }

    // Modifier to restrict access to specific roles.
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

    // Modifier to restrict functions to specific phases.
    modifier atPhase(uint8 _phase) {
        if (currentPhase.id != _phase) {
            revert InvalidPhase(_phase, currentPhase.id);
        }
        _;
    }

    // Function for buyer to deposit earnest money in USDC.
    function depositEarnest(uint256 _amount) external onlyRole("buyer") atPhase(0) {
        if (_amount < escrowAmount) revert InsufficientDeposit(escrowAmount, _amount);
        bool success = usdc.transferFrom(msg.sender, address(this), _amount);
        if (!success) revert TransferFailed();
        usdc.approve(address(aavePool), _amount);
        aavePool.supply(address(usdc), _amount, address(this), 0);
        currentPhase = Phase(1, block.timestamp);
        emit EarnestMoneyDeposited(msg.sender, _amount, block.timestamp);
    }

    // Function for inspector to update inspection status.
    function updateInspectionStatus(bool _passed) external onlyRole("inspector") atPhase(1) {
        inspectionPassed = _passed;
        emit InspectionStatusUpdated(msg.sender, _passed, block.timestamp);
    }

    // Function for parties to approve by role.
    function approveByRole(string memory _role) external onlyRole(_role) atPhase(1) {
        approvals[msg.sender] = true;
        emit ApprovalGranted(msg.sender, _role, block.timestamp);
        if (approvals[buyer] && approvals[seller] && approvals[lender]) {
            currentPhase = Phase(2, block.timestamp);
        }
    }

    // Function for buyer or lender to deposit remaining funds in USDC.
    function depositFullPrice(uint256 _amount) external atPhase(2) {
        if (msg.sender != buyer && msg.sender != lender) revert Unauthorized("buyer or lender");
        bool success = usdc.transferFrom(msg.sender, address(this), _amount);
        if (!success) revert TransferFailed();
        usdc.approve(address(aavePool), _amount);
        aavePool.supply(address(usdc), _amount, address(this), 0);
        emit FullPriceFunded(msg.sender, _amount, block.timestamp);
        if (getBalance() >= purchasePrice) {
            currentPhase = Phase(3, block.timestamp);
        }
    }

    // Function to finalize the sale, transferring NFT and funds.
    function finalizeSale() external nonReentrant atPhase(3) {
        if (!inspectionPassed) revert InspectionNotPassed();
        if (!approvals[buyer] || !approvals[seller] || !approvals[lender]) revert NotAllApproved();
        uint256 totalBalance = getBalance();
        if (totalBalance < purchasePrice) revert InsufficientDeposit(purchasePrice, totalBalance);
        aavePool.withdraw(address(usdc), type(uint256).max, address(this));
        bool success = usdc.transfer(seller, totalBalance);
        if (!success) revert TransferFailed();
        IERC721(nftAddress).transferFrom(seller, buyer, nftID);
        currentPhase = Phase(4, block.timestamp);
        emit TransactionFinalized(buyer, seller, totalBalance, block.timestamp);
        emit YieldEarned(totalBalance > purchasePrice ? totalBalance - purchasePrice : 0, block.timestamp);
    }

    // Function to cancel the sale, refunding or forfeiting funds.
    function cancelSale() external nonReentrant {
        if (currentPhase.id == 4 || currentPhase.id == 5) revert InvalidPhase(3, currentPhase.id);
        uint256 totalBalance = getBalance();
        address payable recipient = inspectionPassed ? seller : buyer;
        aavePool.withdraw(address(usdc), type(uint256).max, address(this));
        bool success = usdc.transfer(recipient, totalBalance);
        if (!success) revert TransferFailed();
        currentPhase = Phase(5, block.timestamp);
        emit TransactionCancelled(!inspectionPassed, totalBalance, recipient, block.timestamp);
    }

    // View function to get the current balance, including yield from Aave.
    function getBalance() public view returns (uint256) {
        return IAaveToken(aUsdc).balanceOf(address(this));
    }
}

// Thorough Explanation:
// EscrowWithStableAndYield.sol is an advanced escrow contract that builds on the basic escrow logic by incorporating USDC stablecoin for payments and Aave v3 for earning yield on escrowed funds. It manages real estate transactions where the property is represented as an NFT, ensuring a structured process with phases, role-based approvals, inspection, and fund handling. The contract uses immutable variables for efficiency, custom errors for gas savings, and interfaces for USDC, Aave, and ERC721 interactions. Deposits are supplied to Aave's lending pool to accrue interest automatically, with withdrawals including principal and yield upon finalization or cancellation.

// The constructor initializes all parameters, including mainnet addresses for USDC and Aave. Modifiers enforce role and phase restrictions, preventing unauthorized access or out-of-order actions. Events provide transparency for off-chain monitoring. The contract addresses volatility by using USDC and adds value through Aave yield, making it suitable for long-term escrows like real estate.

// This version enhances the original Escrow.sol by shifting from ETH to USDC/Aave, improving stability and profitability. For production, consider audits, as Aave integrations carry risks like liquidity shortages. Future extensions could include yield splitting or oracle-based adjustments.