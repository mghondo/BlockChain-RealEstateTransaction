// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ILayerZeroEndpoint {
    function estimateFees(
        uint16 _dstChainId,
        address _userApplication,
        bytes calldata _payload,
        bool _payInZRO,
        bytes calldata _adapterParam
    ) external view returns (uint256 nativeFee, uint256 zroFee);

    function send(
        uint16 _dstChainId,
        bytes calldata _destination,
        bytes calldata _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable;
}

contract MockLZEndpoint is ILayerZeroEndpoint {
    mapping(address => mapping(uint16 => mapping(bytes => address))) public trustedRemoteLookup;
    
    function estimateFees(
        uint16,
        address,
        bytes calldata,
        bool,
        bytes calldata
    ) external pure override returns (uint256 nativeFee, uint256 zroFee) {
        return (1000000000000000, 0); // 0.001 ETH
    }
    
    function send(
        uint16,
        bytes calldata,
        bytes calldata,
        address payable,
        address,
        bytes calldata
    ) external payable override {}
    
    function setTrustedRemote(uint16 _chainId, bytes calldata _trustedRemote) external {
        trustedRemoteLookup[msg.sender][_chainId][_trustedRemote] = msg.sender;
    }
    
    function getTrustedRemote(uint16 _chainId, bytes calldata _trustedRemote) external view returns (address) {
        return trustedRemoteLookup[msg.sender][_chainId][_trustedRemote];
    }
}

// Abstract contracts needed for LayerZero integration
abstract contract LzApp {
    address public lzEndpoint;
    
    constructor(address _endpoint) {
        lzEndpoint = _endpoint;
    }
    
    function _lzSend(
        uint16,
        bytes memory,
        address payable,
        address,
        bytes memory,
        uint256
    ) internal virtual {}
    
    modifier onlyOwner() {
        _;
    }
    
    function owner() public view virtual returns (address) {
        return msg.sender;
    }
}

abstract contract NonblockingLzApp is LzApp {
    constructor(address _endpoint) LzApp(_endpoint) {}
    
    function _nonblockingLzReceive(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload
    ) internal virtual;
}