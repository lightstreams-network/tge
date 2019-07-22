/**
 * User: ggarrido
 * Date: 17/07/19 14:09
 * Copyright 2019 (c) Lightstreams, Granada
 */

const dotenv = require('dotenv');
dotenv.config({ path: `${process.env.PWD}/.env` });

const Web3 = require('web3');
const Logger = require('../lib/logger');
const Csv = require('../lib/csv');
const { Contract } = require('../lib/contract');
const { transferTo, pht2Wei, LoadConfig, web3Cfg } = require('../lib/utils');

const updateVesting = async (config, logger, csvPath) => {
  const web3 = new Web3(config.rpcUrl, null, web3Cfg);

  const csv = await Csv(csvPath, logger);
  csv.validateUpdateVestingData();

  const contract = await Contract(web3, logger, {
    distributionOwner: config.distributionWallet,
    contractAddress: config.contractAddress,
    contractPath: config.contractPath
  });

  const data = csv.getCsvData();
  for ( let i = 0; i < data.length; i++ ) {
    const item = data[i];
    logger.logUpdateBeneficiary(i, item);
    if (!web3.utils.isAddress(item.from)) {
      throw new Error(`Invalid ethereum address ${item.from}`);
    }

    if (!web3.utils.isAddress(item.to)) {
      throw new Error(`Invalid ethereum address ${item.to}`);
    }

    const existingFromVestingData = await contract.vestingExists(item.from);
    if (existingFromVestingData.startTimestamp.toString() === "0") {
      logger.error(`There is not active vesting schedule for ${item.from}`);
      continue;
    } else {
      logger.logVesting(existingFromVestingData);
    }

    const existingToVestingData = await contract.vestingExists(item.to);
    if (existingToVestingData.startTimestamp.toString() !== "0") {
      logger.error(`There is already a vesting schedule for ${item.to}`);
      logger.logVesting(existingToVestingData);
      continue;
    }

    try {
      await transferTo(web3, logger, {
        from: config.distributionWallet,
        to: item.to,
        amountInWei: pht2Wei(web3, '1')
      });
    } catch ( err ) {
      logger.error(err);
    }

    try {
      await contract.updateVestingBeneficiary(item.from, item.to)
    } catch ( err ) {
      logger.error(err);
    }
  }
};


const logger = Logger('UpdateVesting');

if (process.argv.length !== 3) {
  logger.info("Invalid argument number: node update_vesting.js ${CSV_PATH}");
}

const csvPath = process.argv[2];
const config = LoadConfig();

updateVesting(config, logger, csvPath)
  .then(() => {
    logger.info("Update vesting beneficiaries completed!");
  })
  .catch(err => {
    logger.error(err);
  })
  .finally(() => {
    process.exit(1);
  });