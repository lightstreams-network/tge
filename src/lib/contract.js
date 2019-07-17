/**
 * User: ggarrido
 * Date: 11/07/19 11:25
 * Copyright 2019 (c) Lightstreams, Granada
 */

const fs = require('fs');

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
  console.log(`Loading contract abi: ${contractPath}`);
  return JSON.parse(fs.readFileSync(contractPath, 'utf8')).abi;
};

const csvCategoryToSolidityEnumValue = (csvCategory) => {
  switch ( csvCategory ) {
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

const handleTxReceipt = (tx, logger, resolve, reject) => {
  tx.on('transactionHash', (transactionHash) => {
    logger.info(`\tTransaction Executed: ${transactionHash}`);
  }).on('confirmation', (confirmationNumber, txReceipt) => {
    if (typeof txReceipt.status !== 'undefined') {
      if (txReceipt.status === true || txReceipt.status === '0x1') {
        logger.logReceipt(txReceipt);
        resolve(txReceipt);
      } else {
        logger.logReceipt(txReceipt);
        reject(new Error("Transaction failed"));
      }
    } else {
      resolve(txReceipt);
    }
  }).on('error', (err) => {
    reject(err);
  }).catch(err => {
    reject(err);
  })
};

module.exports.categoryHasScheduledVesting = (categoryOne) => {
  return [CATEGORY_CSV_PROJECT_TEAM, CATEGORY_CSV_PROJECT_SEED_CONTRIBUTORS, CATEGORY_CSV_SALE_PRIVATE, CATEGORY_CSV_SALE_PUBLIC].indexOf(categoryOne) !== -1;
};

module.exports.isPrivateSale = (csvCategory) => {
  return csvCategory === CATEGORY_CSV_SALE_PRIVATE;
};

module.exports.isPublicSale = (csvCategory) => {
  return csvCategory === CATEGORY_CSV_SALE_PUBLIC;
};

module.exports.Contract = async (web3, logger, { contractAddress, contractPath, distributionOwner }) => {
  const gasLimit = '1000000';
  const contractInstance = web3.eth.Contract(
    parseContractAbi(contractPath),
    contractAddress
  );

  const owner = await contractInstance.methods.owner.call();
  if (!owner || owner === '0x0000000000000000000000000000000000000000') {
    throw new Error(`Contract not found at ${contractAddress}`);
  }

  logger.info(`Distribution contract loaded correctly at ${contractAddress}`);
  logger.info(`\t Address: ${contractAddress}`);
  logger.info(`\t Owner: ${owner}`);

  return {
    vestingExists: (address) => {
      return new Promise((resolve, reject) => {
        contractInstance.methods.vestings(address).call({}, (err, result) => {
          if(err) {
            reject(err);
          }
          resolve(result);
        });
      });
    },
    schedulePrivateSaleVesting: (to, value, bonus, category) => {
      logger.logScheduleSale(distributionOwner, to, value, category);
      return new Promise((resolve, reject) => {
        const tx = contractInstance.methods.schedulePrivateSaleVesting(to, bonus.toString())
          .send({ from: distributionOwner, value: value, gas: gasLimit });

        handleTxReceipt(tx, logger, resolve, reject);
      });
    },
    schedulePublicSaleVesting: (to, value, bonus, category) => {
      logger.logScheduleSale(distributionOwner, to, value, category);
      return new Promise((resolve, reject) => {
        const tx = contractInstance.methods.schedulePublicSaleVesting(to, bonus.toString())
          .send({ from: distributionOwner, value: value, gas: gasLimit });

        handleTxReceipt(tx, logger, resolve, reject);
      });
    },
    scheduleProjectVesting: (to, value, category) => {
      const solidityCategory = csvCategoryToSolidityEnumValue(category);
      logger.logScheduleProject(distributionOwner, to, value, category, solidityCategory);
      return new Promise((resolve, reject) => {
        const tx = contractInstance.methods.scheduleProjectVesting(to, solidityCategory)
          .send({ from: distributionOwner, value, gas: gasLimit });

        handleTxReceipt(tx, logger, resolve, reject);
      });
    },
    updateVestingBeneficiary: (from, to) => {
      logger.info(`Updating vesting beneficiary ${from} -> ${to}...`);
      return new Promise((resolve, reject) => {
        const tx = contractInstance.methods.updateVestingBeneficiary(from, to)
          .send({ from: distributionOwner, gas: gasLimit });

        handleTxReceipt(tx, logger, resolve, reject);
      });
    },
    transferOwnership: (newOwner) => {
      logger.info(`Updating smart contract ownership from ${distributionOwner} to ${newOwner}...`);
      return new Promise((resolve, reject) => {
        const tx = contractInstance.methods.transferOwnership(newOwner)
          .send({ from: distributionOwner, gas: gasLimit });

        handleTxReceipt(tx, logger, resolve, reject);
      });
    },
  }
};