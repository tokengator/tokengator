# @tokengator/indexer

Pluggable Solana ownership indexer core for TokenGator.

## Features

- Resolver orchestration via `createIndexer` and `defineResolver`
- Helius resolver definitions for collection assets and token accounts
- Helius SDK adapter with retry and rate-limit controls
- Ownership normalization and user-to-wallet matching utilities
- Typed provider error model via `ProviderError`

## Install (workspace)

```bash
bun add @tokengator/indexer --filter <your-package>
```

## Check Types

```bash
bun run check-types --filter @tokengator/indexer
```

## Exports

- `createHeliusResolvers`
- `createHeliusSdkAdapter`
- `createIndexer`
- `defineResolver`
- `hasPositiveAmount`
- `matchUsersToOwnershipRows`
- `normalizeAmountToBigInt`
- `normalizeAmountToNumber`
- `normalizeAmountToString`
- `normalizeOwnershipRows`
- `ProviderError`

## Ownership Amounts

Normalized `OwnershipRow.amount` values are raw on-chain quantity strings. Use `normalizeAmountToString`, `normalizeAmountToBigInt`, `normalizeAmountToNumber`, and `hasPositiveAmount` when you need parsing, safe numeric conversion, or zero checks at the use site.
