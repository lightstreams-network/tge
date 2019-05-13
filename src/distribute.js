const env = require('dotenv');
const web3lib = require('web3');
const csv = require('csvtojson');
const fs = require('fs');

env.config({ path: `${process.env.PWD}/.env` });

const web3 = new web3lib(process.env.RPC_URL, null, {});
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

const pht2Wei = (pht) => {
    return web3.utils.toBN(web3.utils.toWei(pht.toString(), 'ether'));
};

const waitFor = (waitInSeconds) => {
    return new Promise((resolve) => {
        setTimeout(resolve, waitInSeconds * 1000);
    });
};

const initContract = () => {
    return web3.eth.Contract(
        parseContractAbi(CONTRACT_PATH),
        CONTRACT_ADDRESS,
        {
            defaultGasPrice: '500000000000'
        }
    )
};

const isProject = (csvCategory) => {
    return !(isPrivateSale(csvCategory) || isPublicSale(csvCategory))
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

const logDeposit = (wallet, to, value, category) => {
    console.log("Depositing:");
    console.log(`   from: ${wallet}`);
    console.log(`   to: ${to}`);
    console.log(`   value: ${value}`);
    console.log(`   category: ${category}`);
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

const getMinedTxReceipt = (hash) => {
  return new Promise((resolve, reject) => {
    web3.eth.getTransactionReceipt(hash).then((receipt) => {
      if (receipt === null) {
        setTimeout(() => {
          getMinedTxReceipt(hash).then((receipt) => {
            resolve(receipt);
          });
        }, 500);
      } else {
        resolve(receipt);
      }
    });
  });
};

const handleReceipt = (resolve, reject, err, hash) => {
  if (err !== false) {
    reject(err);
  }

  getMinedTxReceipt(hash)
    .then((receipt) => {
      logReceipt(receipt);

      if (receipt.status !== true) {
        return reject(new Error("TX failed! Duplicated distribution?"));
      }

      resolve(receipt);
    })
    .catch((e) => {
      reject(e);
    });
};

const transfer1PhtSeq = (distribution) => {
  return new Promise((resolve, reject) => {
    console.log(` Transferring 1 PHT to ${distribution.to}...`);

    try {
      web3.eth.sendTransaction({
        from: WALLET_PROJECT,
        to: distribution.to,
        value: pht2Wei('1'),
        gas: 21000
      }, function (err, hash) {
        if (err !== false) {
          reject(err);
        }

        getMinedTxReceipt(hash)
          .then((receipt) => {
            logReceipt(receipt);

            if (receipt.status !== true) {
              return reject(new Error("TX failed! Duplicated distribution?"));
            }

            resolve(distribution);
          })
          .catch((e) => {
            reject(e);
          });
      });
    } catch (e) {
      reject(new Error(e.toString()));
    }
  });
};

const scheduleProjectVesting = (contract, to, value, category) => {
  return new Promise((resolve, reject) => {
    try {
      const solidityCategory = csvCategoryToSolidityEnumValue(category);
      const fromWallet = WALLET_PROJECT;

      logScheduleProject(fromWallet, to, value, category, solidityCategory);

      contract
        .methods
        .scheduleProjectVesting(to, solidityCategory)
        .send(
          {from: fromWallet, value: value, gas: gasLimit},
          function (err, hash) {
            handleReceipt(resolve, reject, err, hash);
        });
    } catch (e) {
      console.log(e.toString());
      reject(new Error(e.toString()));
    }
  });
};

const schedulePrivateSaleVesting = (contract, to, value, bonus, category) => {
  return new Promise((resolve, reject) => {
    try {
      const fromWallet = WALLET_SALE;

      logScheduleSale(fromWallet, to, value, category);

      contract
        .methods
        .schedulePrivateSaleVesting(to, bonus.toString())
        .send(
          {from: fromWallet, value: value, gas: gasLimit},
          function (err, hash) {
            handleReceipt(resolve, reject, err, hash);
        });
    } catch (e) {
      reject(new Error(e.toString()));
    }
  });
};

const schedulePublicSaleVesting = (contract, to, value, bonus, category) => {
  return new Promise((resolve, reject) => {
    try {
      const fromWallet = WALLET_SALE;

      logScheduleSale(fromWallet, to, value, category);

      contract
        .methods
        .schedulePublicSaleVesting(to, bonus.toString())
        .send(
          {from: fromWallet, value: value, gas: gasLimit},
          function (err, hash) {
            handleReceipt(resolve, reject, err, hash);
        });
    } catch (e) {
      reject(new Error(e.toString()));
    }
  });
};

const scheduleDistribution = (contract, distribution) => {
  return new Promise((resolve, reject) => {
    const to = distribution.to;
    const purchased = pht2Wei(distribution.purchased_pht);
    const bonus = pht2Wei(distribution.bonus_pht);
    const category = distribution.category;
    const value = calculateDepositValue(purchased, bonus);

    if (isProject(category)) {
      scheduleProjectVesting(contract, to, value, category)
        .then(() => {
          resolve();
        })
        .catch((e) => {
          reject(e);
        });
    } else if (isPrivateSale(category)) {
      schedulePrivateSaleVesting(contract, to, value, bonus, category)
        .then(() => {
          resolve();
        })
        .catch((e) => {
          reject(e);
        });
    } else if (isPublicSale(category)) {
      schedulePublicSaleVesting(contract, to, value, bonus, category)
        .then(() => {
          resolve();
        })
        .catch((e) => {
          reject(e);
        });
    } else {
      reject(new Error(`category ${category} not supported`));
    }
  });
};

csv()
.fromFile(CSV_FILEPATH)
.then(async (data) => {
    const contract = initContract();

      for (let i = 0, p = Promise.resolve(); i < data.length; i++) {
        p = p.then(_ => new Promise((resolve, reject) => {
            console.log(`[Distribution #${i}]`);

            transfer1PhtSeq(data[i])
              .then((distribution) => {
                scheduleDistribution(contract, distribution)
                  .then(_ => {
                    resolve();
                  })
                  .catch((e) => {
                    console.log(e.toString());
                    process.exit(1);
                  });
              })
              .catch((e) => {
                console.log(e.toString());
                process.exit(1);
              })
          }
        ));
      }
});