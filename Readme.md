# Lightstreams TGE

## Install
```bash
npm i
```

## Running tests

### Ganache Manually
Boot Ganache UI, configure port in truffle.js, put balance for every account to `100000000` PHTs and execute tests.
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