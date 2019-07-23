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

## Update receiving address
1. Copy `.env.sample` to `.env`
2. Add a new .csv file in the **input** folder which should only have two colums (**from** and **to**)
```csv
from,to
0xe4e70C102512365Cf7325c39170E33eA14abB000,0xAd91f5d5159A0d40eAFc492E7f98928Bc8236000
0x8B6E6D75E2e47350067dA750BDe492AE1d0c7000,0x3bB40079634Ccc021B44e0D927Ed503B72F87000
```
3. Get the private key stored in Secret manager for the **Distribution account** and save it under **database/keystore**
4. The passphrase is stored in passbolt (VPN connection needed)
5. Run geth attach

``` shell

geth attach http://localhost:8545
```
6. Unlock the distribution account, replacing **DISTRIBUTION_ACCOUNT** with its address.

``` shell
personal.unlockAccount('DISTRIBUTION_ACCOUNT')
```
7. Run the update script, replacing **CSV_FILE** with the name of the file created in the step #2.

``` shell
node bin/update_vesting.js CSV_FILE
```
8. Lock the distribution account, replacing **DISTRIBUTION_ACCOUNT** with its address.
``` shell
personal.lockAccount('DISTRIBUTION_ACCOUNT')
```
9. A new log file will be generated under the **logs** folder.
