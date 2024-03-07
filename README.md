# Return Finance V2 Contracts

This repository contains set of ERC-4626 smart contracts for Return Finance. ERC4626 is the "Tokenized Vault Standard" as defined in https://eips.ethereum.org/EIPS/eip-4626

## Deployments

- [Aave V3 on Polygon](https://polygonscan.com/address/0x3B6385493a1d4603809dDbaE647200eF8baA53F5)
- [Aave V3 on Avalanche](https://snowtrace.io/address/0x3B6385493a1d4603809dDbaE647200eF8baA53F5)
- [Compound V3 on Base](https://basescan.org/address/0x3B6385493a1d4603809dDbaE647200eF8baA53F5)
- [Spark on Ethereum Mainnet](https://etherscan.io/address/0x201254227f9fE57296C257397Be6c617389a8cCb)
- [Convex Finance on Ethereum Mainnet](https://etherscan.io/address/0xFD360A096E4a4c3C424fc3aCd85da8010D0Db9a5)
- Curve DEX on Ethereum Mainnet - Coming soon

### Installation

```console
$ yarn
```

### Compile

```console
$ yarn compile
```

This task will compile all smart contracts in the `contracts` directory.
ABI files will be automatically exported in `artifacts` directory.

### Testing

```console
$ yarn test
```

### Code coverage

```console
$ yarn coverage
```

The report will be printed in the console and a static website containing full report will be generated in `coverage` directory.

### Code style

```console
$ yarn prettier
```

### Verify & Publish contract source code

```console
$ npx hardhat  verify --network mainnet $CONTRACT_ADDRESS $CONSTRUCTOR_ARGUMENTS
```
