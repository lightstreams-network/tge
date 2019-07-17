# Lightstreams TGE Distribution Script

## Usage


1. Copy `.env.sample` to `.env` and configure the values
1. Compile the smart contracts `cd ..; npm run compile`
1. Update the **CONTRACT_ADDR**
1. Unlock the **DISTRIBUTION_WALLET** `personal.unlockAccount("ACC", "PWD", TIME_SECONDS);`

### Distribution

Execute:
```
$> node distribute.js ${CSV_PATH}
```

### Vesting beneficiary update

Execute:
```
$> node update_vesting.js ${CSV_PATH}
```

## Install

```
npm i
```