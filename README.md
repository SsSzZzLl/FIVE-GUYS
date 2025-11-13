# Interstellar Salvage Corps – Full Stack Web3 Project

This repository contains the complete “Interstellar Salvage Corps” game prototype: Solidity smart contracts, a Hardhat Ignition deployment flow, an event-driven Express backend, a React/Vite frontend, and IPFS tooling for card assets. The experience covers:

- Drawing cards from the on-chain `BlindBox` contract and loading metadata directly from IPFS.
- Fusing cards via `CardSynthesis` with GTK token fees and probability mechanics.
- Listing and purchasing NFTs in the `Marketplace`; ownership transfers on-chain while the backend mirrors events in real time.
- Maintaining a player leaderboard (draws, purchases, sales, fusions, rarity score) synchronised from blockchain activity.

All shell snippets below use **Windows PowerShell** syntax. Replace commands as needed on other platforms.

---

## Directory Overview

```
BlockChainGroupAssignment/
├─ contracts/                 # Solidity sources
├─ ignition/                  # Hardhat Ignition deployments & address cache
├─ scripts/                   # Utility scripts (metadata, checks, deployments)
├─ backend/                   # Express + ethers event listener API
├─ frontend/                  # React + Vite application
├─ ipfs/                      # Local IPFS assets (images, metadata, manifest)
├─ test/                      # Hardhat & Foundry-compatible tests
└─ README.md                  # Project documentation
```

---

## Tech Stack

- **Solidity 0.8.20** – ERC20/721, BlindBox, Marketplace, CardSynthesis, TokenVendor.
- **Hardhat 3 + Ignition** – compilation, deployment, verification, TypeChain bindings.
- **Ethers v6** – scripting, backend contract interactions.
- **React 18 + Vite + Wagmi + RainbowKit + TailwindCSS** – browser DApp.
- **Express + TypeScript** – REST API with blockchain event ingestion.
- **TanStack Query + Zustand** – frontend state management & caching.
- **IPFS (Kubo)** – card images and metadata hosting.

---

## Prerequisites

| Dependency        | Recommended Version      | Purpose                                             |
|-------------------|--------------------------|-----------------------------------------------------|
| Node.js           | ≥ 18.18 (LTS)            | Required for Hardhat, backend, frontend             |
| NPM               | ≥ 9                      | Dependency management (pnpm/yarn also work)         |
| Git               | Latest                    | Version control                                     |
| Kubo / go-ipfs    | Latest stable             | Host card media & metadata locally                  |
| Foundry (optional)| Latest (`forge`)         | Run Forge unit tests if desired                     |
| Ethereum wallet   | MetaMask or similar       | Interact with Sepolia, sign transactions            |

Additional notes:

- Windows users hitting `node-gyp` errors should install **Visual Studio Build Tools** or run `npm install --global --production windows-build-tools`.
- Secure a reliable **Sepolia RPC endpoint** (Infura, Alchemy, or public) plus sufficient test ETH and GTK tokens.

---

## Quick Start

1. Clone and enter the repository:
   ```powershell
   git clone <repo-url>
   cd BlockChainGroupAssignment
   ```
2. Install root/Hardhat dependencies:
   ```powershell
   npm install
   ```
3. Install backend dependencies:
   ```powershell
   cd backend
   npm install
   cd ..
   ```
4. Install frontend dependencies:
   ```powershell
   cd frontend
   npm install
   cd ..
   ```
5. Configure environment variables and IPFS assets as described below, then deploy and start the services.

---

## Smart Contract Deployment & Verification

### 1. Root `.env`

Create `BlockChainGroupAssignment/.env`:

```
SEPOLIA_URL=https://sepolia.infura.io/v3/<project-id>
PRIVATE_KEY=0x<your-testnet-private-key>
ETHERSCAN_API_KEY=<optional-for-verification>
```

The private key must be 0x-prefixed hex (no mnemonic). Treat it as secret and use a dedicated testnet wallet.

### 2. Compile & Deploy

```powershell
npx hardhat compile
npx hardhat ignition deploy ignition/modules/DeployAll.ts --network sepolia --reset
```

Deployment artifacts, including contract addresses, are written to `ignition/deployments/chain-11155111/deployed_addresses.json`. Both backend and frontend read from this file by default.

### 3. Verify on Etherscan (Optional)

```powershell
npx hardhat verify --network sepolia <MarketplaceAddress> <ERC20Address> <NFTCollectionAddress>
```

Or verify the entire Ignition deployment:

```powershell
npx hardhat ignition verify ignition/modules/DeployAll.ts --network sepolia
```

### 4. Utility Scripts

- Inspect on-chain NFT ownership/metadata:
  ```powershell
  node scripts/check-nfts.mjs
  ```
- Audit live marketplace listings:
  ```powershell
  node scripts/check-marketplace.mjs
  ```

Both scripts fall back to `deployed_addresses.json`. Override via environment variables as needed:

```
SEPOLIA_RPC_URL=https://...
NFT_COLLECTION_ADDRESS=0x...
MARKETPLACE_ADDRESS=0x...
```

---

## Backend Service (`backend/`)

### Environment Variables

Create `backend/.env` (example):

```
PORT=4100
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/<project-id>
MARKETPLACE_ADDRESS=0x...          # optional, defaults to deployed_addresses.json
NFT_COLLECTION_ADDRESS=0x...
ERC20_TOKEN_ADDRESS=0x...
LEADERBOARD_NAMESPACE=0x...        # optional logical namespace
MARKETPLACE_SYNC_FROM_BLOCK=5240000 # optional starting block for event replay
```

If addresses are omitted, the service loads them from Ignition deployment data.

### Run in Development

```powershell
cd backend
npm run dev
```

The server listens on `http://localhost:4100` and provides:

- `GET /health` – health check.
- `GET /api/marketplace/listings` – marketplace feed; automatically reconciles against `Marketplace.isListed`.
- `GET /api/leaderboard` – aggregated player stats.

When running, the backend streams `Listed`, `Sold`, and `ListingCancelled` events, updates local storage (`backend/src/storage/marketplace.json`), and double-checks active status via `isListed` before responding.

To change storage locations, set `LEADERBOARD_STORAGE_PATH` or `MARKETPLACE_STORAGE_PATH` (defaults live under `backend/src/storage/`).

---

## Frontend DApp (`frontend/`)

### Environment Variables

Create `frontend/.env` (or `.env.local`):

```
VITE_API_BASE_URL=http://localhost:4100/api
VITE_RPC_URL=https://sepolia.infura.io/v3/<project-id>
VITE_WALLET_CONNECT_ID=<walletconnect-project-id>
VITE_IPFS_GATEWAY=http://127.0.0.1:8080/ipfs

# Optional overrides; otherwise use Ignition addresses
VITE_ERC20_TOKEN_ADDRESS=0x...
VITE_NFT_COLLECTION_ADDRESS=0x...
VITE_BLIND_BOX_ADDRESS=0x...
VITE_TOKEN_VENDOR_ADDRESS=0x...
VITE_CARD_SYNTHESIS_ADDRESS=0x...
VITE_MARKETPLACE_ADDRESS=0x...
```

If no overrides are provided, contract addresses are imported from `ignition/deployments/.../deployed_addresses.json`.

### Development Server

```powershell
cd frontend
npm run dev
```

Visit `http://localhost:5173`. On the first visit to the Marketplace:

1. Click **Approve GTK** to grant ERC20 allowance.
2. Click **Enable Marketplace** to approve NFT transfers.
3. Use **Sync listings** to refresh if you expect new events or just completed a transaction.

---

## IPFS Assets & Metadata

The repository ships with placeholder assets under `ipfs/`. Prepare a local IPFS node (Kubo) and add these folders so the CID matches your deployment.

### Generate Metadata

```powershell
node scripts/generate-metadata.mjs
```

The script reads `ipfs/manifest.json` for the current `imagesCID`, creates themed metadata (including `fusion/` variants), and writes JSON files under `ipfs/metadata/`.

### Upload Workflow

1. Start IPFS: `ipfs daemon`
2. Add assets:
   ```powershell
   ipfs add -r ipfs/images
   ipfs add -r ipfs/metadata
   ```
3. Update the resulting CIDs in `ipfs/manifest.json`.
4. Update contracts via Hardhat console:
   ```powershell
   npx hardhat console --network sepolia
   ```
   ```js
   const { ethers } = await import("hardhat");
   const blindBox = await ethers.getContractAt("BlindBox", "<address>");
   const cardSynthesis = await ethers.getContractAt("CardSynthesis", "<address>");
   await (await blindBox.setMetadataCID("<newCID>")).wait();
   await (await cardSynthesis.setMetadataCID("<newCID>")).wait();
   ```
5. If any scripts or environment files hard-code the CID, update them as well (e.g. frontend `.env`).

---

## Testing & Quality

- Run all contract tests:
  ```powershell
  npx hardhat test
  ```
- Execute a specific test file:
  ```powershell
  npx hardhat test test/marketplace-test.ts
  ```
- Backend lint & build:
  ```powershell
  cd backend
  npm run lint
  npm run build
  ```
- Frontend production build (type checking included):
  ```powershell
  cd frontend
  npm run build
  ```

---

## Troubleshooting

| Symptom                                                     | Resolution                                                                                          |
|-------------------------------------------------------------|------------------------------------------------------------------------------------------------------|
| Card remains visible in marketplace after purchase          | Ensure backend dev server is running; check `backend/src/storage/marketplace.json`; click **Sync listings**. |
| `Listing not active` / `This listing is already inactive`   | Someone already bought or delisted the item. Refresh the feed; front-end now guards against stale state.    |
| `ethers is not defined` inside Hardhat console              | Always run commands inside `npx hardhat console --network sepolia` and import with `const { ethers } = await import("hardhat");`. |
| `Identifier '<name>' has already been declared` (console)   | Variable names persist in the console session. Use another name or exit (`Ctrl+C`) and reopen.             |
| IPFS 404 / timeout                                          | Confirm your IPFS node is online and pinned to the latest CID; set `VITE_IPFS_GATEWAY` to an accessible endpoint. |
| GTK allowance / balance errors                              | Acquire GTK from the Token Vendor on the homepage, then complete **Approve GTK** and **Enable Marketplace**.  |

---

## Production Deployment Checklist

1. Generate dedicated production wallets; never reuse test keys.
2. Set `MARKETPLACE_SYNC_FROM_BLOCK` to the deployment block to speed up event backfill.
3. Immediately run `node scripts/check-marketplace.mjs` and `node scripts/check-nfts.mjs` against the live deployment.
4. Publish verified contract source via `npx hardhat verify` for auditability.
5. Inject production contract addresses, gateways, and WalletConnect IDs through environment variables or CI/CD secrets.
6. Run the backend under a process manager (PM2, systemd) and set up monitoring/log rotation.

---

## Suggested Enhancements

- Deploy the backend event listener as a long-lived service (PM2/Nodemon/Docker).
- Integrate The Graph or webhooks for redundant event ingestion.
- Add CI pipelines (GitHub Actions) covering Hardhat tests, frontend builds, linting.
- Expand contract test coverage around access control, re-entrancy, and failure cases.

---

For additional diagnostics, explore the scripts in the `scripts/` folder and review backend logs. Happy salvaging! 🚀
