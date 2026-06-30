# GG Bounty

A decentralized bounty marketplace on Canopy Network. Users create bounties, join challenges,
submit work, and earn CNPY rewards through real on-chain transactions.

## Project layout

```
gg-bounty/
├── plugin/        # Canopy TypeScript plugin template, extended with GG Bounty's custom
│                  # transactions (CreateProfile, CreateBounty, JoinBounty, SubmitWork,
│                  # SelectWinner) and custom read-only RPC endpoints. Runs as a Node.js
│                  # process alongside the Go `canopy` node, talking to it over a Unix socket.
└── frontend/      # React + Vite + TypeScript dApp. Generates its own wallet client-side,
                   # signs transactions locally, and talks to:
                     - the Canopy node's query/tx RPC (default :50002)
                     - the GG Bounty plugin's custom read RPC (default :50010)
```

These are three independent runtime processes. The frontend never holds a private key on a
server and never depends on the Canopy node's admin/keystore RPC (:50003) - wallets are
generated and held entirely client-side (see `frontend/src/wallet/`).

## Status: Feature 1 (Wallet) implemented

- BLS12-381 keypair generation in-browser (`frontend/src/wallet/bls.ts`)
- Address derivation: `sha256(publicKey)[:20]`, matching the plugin's documented scheme
- AES-256-GCM + PBKDF2 encrypted keystore, persisted in IndexedDB
  (`frontend/src/wallet/keystore.ts`, `storage.ts`)
- Create wallet / import wallet (raw private key) / unlock / lock / switch / remove
  (`frontend/src/wallet/WalletContext.tsx`, `frontend/src/components/WalletPanel.tsx`)
- Local signing primitive (`useWallet().sign(messageBytes)`) ready for the transaction-builder
  layer that lands in the next feature (on-chain Profile/Bounty transactions)

Not yet implemented: bounty/profile transactions, the plugin's custom transaction types, RPC
client for broadcasting/querying, and the rest of the UI. These come next, one feature at a time,
per the agreed workflow.

## Setup

This sandbox has no outbound network access, so none of the following has been run or verified
here - please run it locally and paste back any errors so I can fix them immediately.

### 1. Plugin (unchanged so far - Feature 1 didn't touch it)

```bash
cd plugin
npm install
npm run build:all   # proto codegen + descriptors + tsc
```

### 2. Frontend

```bash
cd frontend
npm install
npm run build:proto  # generates src/proto/generated.{js,d.ts} from ../plugin/proto/*.proto
npm run dev
```

Open the printed local URL. You should be able to:
1. Create a wallet (name + password) -> see a new address appear
2. Lock it, then unlock it with the same password
3. Get "incorrect password" on a wrong password
4. Import a wallet from a raw 32-byte hex private key
5. Refresh the page -> wallet list persists (IndexedDB), still locked until you unlock

### If `npm run build:proto` or `npm run dev` errors

Most likely causes, given I couldn't execute this myself:
- `@noble/curves`'s actual exported API differs slightly from what `bls.ts` assumes
  (`bls12_381.longSignatures.getPublicKey` / `.PublicKey.toBytes`) - the `hash`/`sign`/
  `Signature.toBytes` calls are copied verbatim from the working tutorial test, but
  `getPublicKey`/`PublicKey` were inferred as the standard counterparts in the same namespace.
- A TypeScript strict-mode complaint I couldn't catch without the real compiler running.

Paste me the exact error and I'll fix it in the next message - that's expected at this stage.
