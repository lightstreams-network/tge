# Lightstreams TGE Distribution Script

## Usage

1. Configure the `.env` file
1. Compile the smart contracts `cd ..; npm run compile`
1. Unlock the **WALLET_PROJECT** `personal.unlockAccount("ACC", "PWD", TIME_SECONDS);`
1. Unlock the **WALLET_SALE** `personal.unlockAccount("ACC", "PWD", TIME_SECONDS);`
1. Execute: `node distribute.js`

## Install

```
npm i
```