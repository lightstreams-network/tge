/**
 * User: ggarrido
 * Date: 17/07/19 14:09
 * Copyright 2019 (c) Lightstreams, Granada
 */

const dotenv = require('dotenv');
dotenv.config({ path: `${process.env.PWD}/.env` });

const Web3 = require('web3');
const Logger = require('../lib/logger');
const { Contract } = require('../lib/contract');
const { web3Cfg, LoadConfig } = require('../lib/utils');

const transferOwnership = async (config, logger, newOwner) => {
  const web3 = new Web3(config.rpcUrl, null, web3Cfg);

  const contract = await Contract(web3, logger, {
    distributionOwner: config.distributionWallet,
    contractAddress: config.contractAddress,
    contractPath: config.contractPath
  });

  if (!web3.utils.isAddress(newOwner)) {
    throw new Error(`Invalid newOwner ethereum address ${newOwner}`);
  }

  try {
    await contract.transferOwnership(newOwner)
  } catch ( err ) {
    logger.error(err);
  }
};

const logger = Logger('UpdateVesting');

if (process.argv.length !== 3) {
  logger.info("Invalid argument number: node transfer_ownership.js ${NEW_OWNER}");
}

const newOwner = process.argv[2];
const config = LoadConfig();

transferOwnership(config, logger, newOwner)
  .then(() => {
    logger.info("Update vesting beneficiaries completed!");
  })
  .catch(err => {
    logger.error(err);
  })
  .finally(() => {
    process.exit(1);
  });