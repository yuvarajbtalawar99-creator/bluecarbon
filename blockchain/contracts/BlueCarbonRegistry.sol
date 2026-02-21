// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title BlueCarbonRegistry
 * @dev Immutable registry for project verification proof (hashes).
 */
contract BlueCarbonRegistry is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    struct PlantationRecord {
        string projectId;
        bytes32 evidenceHash;
        address verifier;
        uint256 verificationDate;
        string methodology;
        bool verified;
    }

    // Mapping from project ID to its record
    mapping(string => PlantationRecord) private _records;
    
    event ProjectVerified(string indexed projectId, bytes32 evidenceHash, address verifier);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    /**
     * @dev Stores a verification record. Once verified, it cannot be changed.
     */
    function storeVerification(
        string memory projectId,
        bytes32 evidenceHash,
        address verifier,
        uint256 verificationDate,
        string memory methodology
    ) external onlyRole(ADMIN_ROLE) {
        require(!_records[projectId].verified, "Project already verified");
        
        _records[projectId] = PlantationRecord({
            projectId: projectId,
            evidenceHash: evidenceHash,
            verifier: verifier,
            verificationDate: verificationDate,
            methodology: methodology,
            verified: true
        });

        emit ProjectVerified(projectId, evidenceHash, verifier);
    }

    function getVerification(string memory projectId) external view returns (PlantationRecord memory) {
        return _records[projectId];
    }

    function isVerified(string memory projectId) external view returns (bool) {
        return _records[projectId].verified;
    }
}
