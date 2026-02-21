// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

interface IBlueCarbonRegistry {
    function isVerified(string calldata projectId) external view returns (bool);
}

/**
 * @title CarbonCreditToken
 * @dev ERC-20 token representing carbon credits (1 credit = 1 tCO2e).
 */
contract CarbonCreditToken is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    IBlueCarbonRegistry public registry;
    address public nationalBufferPool;

    event CreditsMinted(string indexed projectId, uint256 amount, address developerWallet);
    event CreditsRetired(
        address company,
        uint256 amount,
        uint256 timestamp
    );

    constructor(address _registry, address _bufferPool, address admin) ERC20("Carbon Credit Token", "CCT") {
        registry = IBlueCarbonRegistry(_registry);
        nationalBufferPool = _bufferPool;
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    /**
     * @dev 1 token = 1 tCO2e. Decimals = 0 as per requirements.
     */
    function decimals() public view virtual override returns (uint8) {
        return 0;
    }

    /**
     * @dev Mint credits for a verified project.
     * 90% goes to the developer, 10% to the national buffer pool.
     */
    function mintCredits(
        string calldata projectId,
        uint256 amount,
        address developerWallet
    ) external onlyRole(MINTER_ROLE) {
        require(registry.isVerified(projectId), "Project not verified on-chain");
        
        uint256 bufferAmount = amount / 10;
        uint256 developerAmount = amount - bufferAmount;

        _mint(developerWallet, developerAmount);
        _mint(nationalBufferPool, bufferAmount);

        emit CreditsMinted(projectId, amount, developerWallet);
    }

    /**
     * @dev Retire credits by burning them.
     */
    function retireCredits(uint256 amount) external {
        burn(amount);
        emit CreditsRetired(msg.sender, amount, block.timestamp);
    }

    /**
     * @dev Admin can update registry or buffer pool if necessary.
     */
    function updateRegistry(address _registry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        registry = IBlueCarbonRegistry(_registry);
    }

    function updateBufferPool(address _bufferPool) external onlyRole(DEFAULT_ADMIN_ROLE) {
        nationalBufferPool = _bufferPool;
    }
}
