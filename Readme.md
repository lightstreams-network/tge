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
npm run test-ganache
```

**Note:** Make sure to always reset the Ganache after each test run due to balances and time traveling.

### Ganache Using Script
```bash
make test-ganache
```

### Standalone
Todo: to be added