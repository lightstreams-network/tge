# Lightstreams TGE Script

[Read more](./src/Readme.md)

# Lightstreams TGE Contract

## Audit

The TGE contract was audited and is now publicly available [here](./audit_report_20190424.pdf).

## Install
```bash
npm i
```

## Run tests

### Ganache Manually
Initialize Ganache GUI and configure it using same setting than `truffle.js`:
- Balance for every account to `310000000` PHTs
- Gas Price: 500000000000
- Port: 7545

Then, ready to run the test
```bash
npm run test
```

**Note:** Make sure to always reset the Ganache after each test run due to balances and time traveling.

## Ganache Test script
```bash
npm run test
```

## Deploy

### Sirius

Unlock sirius test account
```
geth attach http://localhost:8545
> personal.unlockAccount("0xd119b8b038d3a67d34ca1d46e1898881626a082b"
```

Deploy smart contract
```
npm run deploy-sirius
```

Output
```
2_deploy_all.js
===============

   Replacing 'Distribution'
   ------------------------
   > transaction hash:    0x9d08ad1196446fc41d5bbbac20bf2d9b15252cca742e4c507ea38ac42defdf8e
   > Blocks: 0            Seconds: 0
   > contract address:    0xe2E4d49f002B8427eb50236D246599a80b58Febc
   > account:             0xD119b8B038d3A67d34ca1D46e1898881626a082b
   > balance:             853.365715136
   > gas used:            2970349
   > gas price:           500 gwei
   > value sent:          0 PHT
   > total cost:          1.4851745 PHT

Distribution contract deployed!

   > Saving migration to chain.
   > Saving artifacts
   -------------------------------------
   > Total cost:           1.4851745 PHT


Summary
=======
> Total deployments:   2
> Final cost:          1.6116285 PHT

```