# Lightstreams TGE

## Install
```bash
npm i
```

## Running tests

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

## Test script
```bash
npm run test
```
it uses Ganache

## Deploy static version

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
   > transaction hash:    0x5ff51102b7e32a3fa1f09769db020b337021324e71bdbf6e10218cb637d6f21d
   > Blocks: 0            Seconds: 0
   > contract address:    0x38B7a4E113A284C6894DB745498D5726C7087581
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

##