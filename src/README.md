# Lightstreams TGE Distribution Script

## Install

```
npm i
```

## Usage


Initial setup of environment:
1. Copy `.env.sample` to `.env` and configure the values
1. Compile the smart contracts `cd ..; npm run compile`
1. Update the **CONTRACT_ADDR**
1. Unlock the **DISTRIBUTION_WALLET** `personal.unlockAccount("ACC", "PWD", TIME_SECONDS);`

### Distribution

Execute:
```
$> node ./bin/distribute.js ${CSV_PATH}
```

### Vesting beneficiary update

Execute:
```
$> node ./bin/update_vesting.js ${CSV_PATH}
```

### Transfer Distribution SC ownership

Execute:
```
$> node ./bin/transfer_ownership.js ${NEW_OWNER}
```