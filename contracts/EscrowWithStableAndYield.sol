// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Aave v3 interfaces
interface IPool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

interface IAaveToken {
    function balanceOf(address account) external view returns (uint256);
}

// ERC721 interface
interface IERC721 {
    function transferFrom(address _from, address _to, uint256 _id) external;
}

// Escrow with USDC and Aave yield for real estate transactions
contract EscrowWithStableAndYield is ReentrancyGuard {
    address public immutable nftAddress;
    uint256 public immutable nftID;
    uint256 public immutable purchasePrice; // In USDC units (6 decimals, e.g., 100,000,000 for $100,000)
    uint256 public immutable escrowAmount; // In USDC units (e.g., 20,000,000 for $20,000)
    address payable public immutable seller;
    address payable public immutable buyer;
    address public immutable inspector;
    address public immutable lender;
    IERC20 public immutable usdc; // Mainnet: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
    IPool public immutable aavePool; // Mainnet: 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4e2
    address public immutable aUsdc; // Mainnet: 0x98C23E9d8f34FEFb1B7BD6a91DeB971b0f2dD032

    error Unauthorized(string role);
    error InvalidPhase(uint8 requiredPhase, uint8 currentPhase);
    error InsufficientDeposit(uint256 required, uint256 provided);
    error InspectionNotPassed();
    error NotAllApproved();
    error TransferFailed();

    struct Phase {
        uint8 id; // 0: Created, 1: EarnestDeposited, 2: Approved, 3: FullyFunded, 4: Completed, 5: Cancelled
        uint256 timestamp;
    }
    Phase public currentPhase = Phase(0, block.timestamp);

    mapping(address => bool) public approvals;
    bool public inspectionPassed;

    event EarnestMoneyDeposited(address indexed buyer, uint256 amount, uint256 timestamp);
    event InspectionStatusUpdated(address indexed inspector, bool passed, uint256 timestamp);
    event ApprovalGranted(address indexed approver, string role, uint256 timestamp);
    event FullPriceFunded(address indexed funder, uint256 amount, uint256 timestamp);
    event TransactionFinalized(address indexed buyer, address indexed seller, uint256 amount, uint256 timestamp);
    event TransactionCancelled(bool inspectionFailed, uint256 refundedAmount, address indexed recipient, uint256 timestamp);
    event YieldEarned(uint256 amount, uint256 timestamp);

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

    modifier atPhase(uint8 _phase) {
        if (currentPhase.id != _phase) {
            revert InvalidPhase(_phase, currentPhase.id);
        }
        _;
    }

    function depositEarnest(uint256 _amount) external onlyRole("buyer") atPhase(0) {
        if (_amount < escrowAmount) revert InsufficientDeposit(escrowAmount, _amount);
        bool success = usdc.transferFrom(msg.sender, address(this), _amount);
        if (!success) revert TransferFailed();
        usdc.approve(address(aavePool), _amount);
        aavePool.supply(address(usdc), _amount, address(this), 0);
        currentPhase = Phase(1, block.timestamp);
        emit EarnestMoneyDeposited(msg.sender, _amount, block.timestamp);
    }

    function updateInspectionStatus(bool _passed) external onlyRole("inspector") atPhase(1) {
        inspectionPassed = _passed;
        emit InspectionStatusUpdated(msg.sender, _passed, block.timestamp);
    }

    function approveByRole(string memory _role) external onlyRole(_role) atPhase(1) {
        approvals[msg.sender] = true;
        emit ApprovalGranted(msg.sender, _role, block.timestamp);
        if (approvals[buyer] && approvals[seller] && approvals[lender]) {
            currentPhase = Phase(2, block.timestamp);
        }
    }

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

    function getBalance() public view returns (uint256) {
        return IAaveToken(aUsdc).balanceOf(address(this));
    }
}