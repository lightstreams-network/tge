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
   > transaction hash:    0x8182a87e3505b68d607c88bb331f01a50574108eb53e00bdf128b379bb813c3f
   > Blocks: 0            Seconds: 0
   > contract address:    0x0D53ad46A37A99b60240a08C5493aB5C83C2d70F
   > account:             0xD119b8B038d3A67d34ca1D46e1898881626a082b
   > balance:             858.195597136
   > gas used:            3079406
   > gas price:           500 gwei
   > value sent:          0 ETH
   > total cost:          1.539703 ETH

Distribution contract deployed!

   > Saving migration to chain.
   > Saving artifacts
   -------------------------------------
   > Total cost:            1.539703 ETH

```

##