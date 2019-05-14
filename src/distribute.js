const env = require('dotenv');
const web3lib = require('web3');
const csv = require('csvtojson');
const fs = require('fs');

env.config({ path: `${process.env.PWD}/.env` });

const web3 = new web3lib(process.env.RPC_URL, null, {
  defaultGasPrice: '500000000000'
});
const gasLimit = '300000';

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDR;
const CONTRACT_PATH = process.env.CONTRACT_PATH;

const CSV_FILEPATH = process.env.CSV_FILEPATH;

const WALLET_PROJECT = process.env.WALLET_PROJECT;
const WALLET_SALE = process.env.WALLET_SALE;

const CATEGORY_CSV_PROJECT_TEAM = "TEAM";
const CATEGORY_CSV_PROJECT_SEED_CONTRIBUTORS = "SEED_CONTRIBUTORS";
const CATEGORY_CSV_PROJECT_CONSULTANTS = "CONSULTANTS";
const CATEGORY_CSV_PROJECT_OTHER = "OTHER";
const CATEGORY_CSV_PROJECT_FUTURE_OFFERING = "FUTURE_OFFERING";
const CATEGORY_CSV_SALE_PRIVATE = "PRIVATE_SALE";
const CATEGORY_CSV_SALE_PUBLIC = "PUBLIC_SALE";

// MUST match the order in contracts/Distribution.sol
//    enum Category {TEAM, SEED_CONTRIBUTORS, CONSULTANTS, OTHER, FUTURE_OFFERING}
const CATEGORY_SOLIDITY_ENUM_TEAM = 0;
const CATEGORY_SOLIDITY_ENUM_SEED_CONTRIBUTORS = 1;
const CATEGORY_SOLIDITY_ENUM_CONSULTANTS = 2;
const CATEGORY_SOLIDITY_ENUM_OTHER = 3;
const CATEGORY_SOLIDITY_ENUM_FUTURE_OFFERING = 4;

const parseContractAbi = (contractPath) => {
    return JSON.parse(fs.readFileSync(contractPath, 'utf8')).abi;
};

const waitFor = (waitInSeconds) => {
  return new Promise((resolve) => {
    setTimeout(resolve, waitInSeconds * 1000);
  });
};

const pht2Wei = (pht) => {
    return web3.utils.toBN(web3.utils.toWei(pht.toString(), 'ether'));
};

const initContract = () => {
    return web3.eth.Contract(
        parseContractAbi(CONTRACT_PATH),
        CONTRACT_ADDRESS
    )
};

const isPrivateSale = (csvCategory) => {
    return csvCategory === CATEGORY_CSV_SALE_PRIVATE;
};

const isPublicSale = (csvCategory) => {
    return csvCategory === CATEGORY_CSV_SALE_PUBLIC;
};

const calculateDepositValue = (purchasedBn, bonusBn) => {
    return purchasedBn.add(bonusBn);
};

const logReceipt = (receipt) => {
    console.log("   -----------");
    console.log("   TX Receipt:");
    console.log(`     status: ${receipt.status}`);
    console.log(`     hash: ${receipt.transactionHash}`);
};

const logScheduleProject = (fromWallet, to, value, category, solidityCategory) => {
    console.log(" New Distribution:");
    console.log(`   from: ${fromWallet}`);
    console.log(`   to: ${to}`);
    console.log(`   value: ${value}`);
    console.log(`   csvCategory: ${category}`);
    console.log(`   solcCategory: ${solidityCategory}`);
};

const logScheduleSale = (fromWallet, to, value, category) => {
    console.log(" New Distribution:");
    console.log(`   from: ${fromWallet}`);
    console.log(`   to: ${to}`);
    console.log(`   value: ${value}`);
    console.log(`   csvCategory: ${category}`);
};

const csvCategoryToSolidityEnumValue = (csvCategory) => {
    switch (csvCategory) {
        case CATEGORY_CSV_PROJECT_TEAM:
            return CATEGORY_SOLIDITY_ENUM_TEAM;
        case CATEGORY_CSV_PROJECT_SEED_CONTRIBUTORS:
            return CATEGORY_SOLIDITY_ENUM_SEED_CONTRIBUTORS;
        case CATEGORY_CSV_PROJECT_CONSULTANTS:
            return CATEGORY_SOLIDITY_ENUM_CONSULTANTS;
        case CATEGORY_CSV_PROJECT_OTHER:
            return CATEGORY_SOLIDITY_ENUM_OTHER;
        case CATEGORY_CSV_PROJECT_FUTURE_OFFERING:
            return CATEGORY_SOLIDITY_ENUM_FUTURE_OFFERING;
        case CATEGORY_CSV_SALE_PRIVATE:
            throw 'CSV_CATEGORY_PRIVATE_SALE_HAS_NO_SOLIDITY_ENUM_VALUE';
        case CATEGORY_CSV_SALE_PUBLIC:
            throw 'CSV_CATEGORY_PUBLIC_SALE_HAS_NO_SOLIDITY_ENUM_VALUE';
        default:
            throw 'CSV_CATEGORY_UNKNOWN';
    }
};

const getMinedTxReceipt = (hash, startedAt = Date.now()) => {
  return new Promise(async (resolve, reject) => {
    if (startedAt + (30 * 1000) < Date.now()) { // Max 30 minute wait
      resolve(null);
    }

    let receipt = await web3.eth.getTransactionReceipt(hash);
    if (receipt === null) {
      console.log(`Waiting for txReceipt ${hash}`);
      await waitFor(0.5);
      receipt = await getMinedTxReceipt(hash, startedAt)
    }

    if (receipt === null) {
      reject(`Tx ${hash} not found`);
    } else {
      resolve(receipt);
    }
  });
};

const handleReceipt = async (err, hash) => {
  if (err !== false) {
    throw err;
  }

  const receipt = await getMinedTxReceipt(hash);
  if (receipt.status === "0x1" || receipt.status === true) {
    return receipt;
  }

  logReceipt(receipt);
  throw new Error("TX failed! Duplicated distribution?")
};

const transfer1PhtSeq = (distribution) => {
  console.log(` Transferring 1 PHT to ${distribution.to}...`);
  return new Promise((resolve, reject) => {
    web3.eth.sendTransaction({
      from: WALLET_PROJECT,
      to: distribution.to,
      value: pht2Wei('1'),
      gas: 21000
    }, async (err, hash) => {
      try {
        const receipt = await handleReceipt(err, hash);
        resolve(receipt)
      } catch ( e ) {
        reject(e);
      }
    });
  })
};

const scheduleProjectVesting = (contract, to, value, category) => {
  const solidityCategory = csvCategoryToSolidityEnumValue(category);
  const fromWallet = WALLET_PROJECT;

  logScheduleProject(fromWallet, to, value, category, solidityCategory);

  return new Promise((resolve, reject) => {
    contract
      .methods
      .scheduleProjectVesting(to, solidityCategory)
      .send(
        { from: fromWallet, value: value, gas: gasLimit },
        async (err, hash) => {
          try {
            const receipt = await handleReceipt(err, hash);
            resolve(receipt)
          } catch(e) {
            reject(e);
          }
        }
      );
  });
};

const schedulePrivateSaleVesting = (contract, to, value, bonus, category) => {
  const fromWallet = WALLET_SALE;

  logScheduleSale(fromWallet, to, value, category);

  return new Promise((resolve, reject) => {
    contract
      .methods
      .schedulePrivateSaleVesting(to, bonus.toString())
      .send(
        { from: fromWallet, value: value, gas: gasLimit },
        async (err, hash) => {
          try {
            const receipt = await handleReceipt(err, hash);
            resolve(receipt);
          } catch ( e ) {
            reject(e);
          }
        });
  });
};

const schedulePublicSaleVesting = async (contract, to, value, bonus, category) => {
  const fromWallet = WALLET_SALE;

  logScheduleSale(fromWallet, to, value, category);

  return new Promise((resolve, reject) => {
    contract
      .methods
      .schedulePublicSaleVesting(to, bonus.toString())
      .send(
        { from: fromWallet, value: value, gas: gasLimit },
        async (err, hash) => {
          try {
            const receipt = await handleReceipt(err, hash);
            resolve(receipt);
          } catch ( e ) {
            reject(e);
          }
        });
  });
};

const scheduleDistribution = async (contract, distribution) => {
  const to = distribution.to;
  const purchased = pht2Wei(distribution.purchased_pht);
  const bonus = pht2Wei(distribution.bonus_pht);
  const category = distribution.category;
  const value = calculateDepositValue(purchased, bonus);

  if (isPrivateSale(category)) {
    await schedulePrivateSaleVesting(contract, to, value, bonus, category)
  } else if (isPublicSale(category)) {
    await schedulePublicSaleVesting(contract, to, value, bonus, category)
  } else {
    await scheduleProjectVesting(contract, to, value, category)
  }
};

csv()
  .fromFile(CSV_FILEPATH)
  .then(async (data) => {
    const contract = initContract();
    for ( let i = 0; i < data.length; i++ ) {
      console.log(`[Distribution #${i}]`);
      try {
        const distribution = data[i];
        await transfer1PhtSeq(distribution);
        await scheduleDistribution(contract, distribution);
      } catch(err) {
        console.error(err);
        process.exit(1);
      }
    }
  });