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

## Statics

### Sirius
```
2_deploy_all.js
===============

   Deploying 'Distribution'
   ------------------------
   > transaction hash:    0x6c386b7431fa1e196d3aa014d5e820f4b4e9032c9e78292ade427126c65f8d98
   > Blocks: 0            Seconds: 0
   > contract address:    0xD852835B5d3A7CA36AAe42721aCaB587978a4570
   > account:             0xD119b8B038d3A67d34ca1D46e1898881626a082b
   > balance:             864.846313136
   > gas used:            3093821
   > gas price:           500 gwei
   > value sent:          0 PHT
   > total cost:          1.5469105 PHT

Distribution contract deployed!

   > Saving migration to chain.
   > Saving artifacts
   -------------------------------------
   > Total cost:           1.5469105 PHT
```

##