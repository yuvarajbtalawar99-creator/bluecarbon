# Blockchain-Based Blue Carbon MRV Proof-of-Trust

This directory contains the blockchain layer for the Blue Carbon MRV Platform, designed strictly as a trust and audit layer.

## Architecture

| Layer | Responsibility |
|-------|----------------|
| **Off-Chain (Supabase)** | Large data (images, GPS, videos), PII, user state. |
| **On-Chain (Polygon)** | Immutable proof hashes, credit minting (90/10 split), retirement. |

## Smart Contracts

### 1. `BlueCarbonRegistry.sol`
Stores `PlantationRecord` which includes a `projectId` and a `bytes32 evidenceHash`.
- **Purpose**: Auditors can verify that the data in the backend matches the proof locked at the time of verification.
- **Immutability**: Once a project ID is locked with a hash, it cannot be redefined.

### 2. `CarbonCreditToken.sol` (CCT)
An ERC-20 token for carbon credit life-cycle.
- **Decimals**: 0 (1 token = 1 tCO2e).
- **Issuance**: Only for verified projects. Automatically splits 90% to the developer and 10% to the National Buffer Pool.
- **Retirement**: Users can "burn" tokens to retire credits and emit an audit-ready `CreditsRetired` event.

## Why Blockchain is Minimal?
1. **Cost**: Storing data on-chain is expensive. Hashing keeps costs near zero while maintaining security.
2. **Speed**: High friction if every image upload requires a transaction.
3. **GDPR/Privacy**: Storing hashes protects sensitive project data while allowing validation.

## Usage for Auditors
Auditors can:
1. Fetch the `evidenceHash` from the blockchain for a `projectId`.
2. Compute the hash of the data (images, GPS) provided by the platform.
3. If they match, the data is verified to be untampered since the verification date.
