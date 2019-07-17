const dotenv = require('dotenv');
dotenv.config({ path: `${process.env.PWD}/.env` });

const Web3 = require('web3');
const Csv = require('../lib/csv');
const Logger = require('../lib/logger');
const { Contract, isPrivateSale, isPublicSale, categoryHasScheduledVesting } = require('../lib/contract');
const { transferTo, pht2Wei, LoadConfig, web3Cfg } = require('../lib/utils');

const scheduleDistribution = async (contract, { to, purchased, bonus, category }) => {
  const depositedValue = purchased.add(bonus);
  if (isPrivateSale(category)) {
    await contract.schedulePrivateSaleVesting(to, depositedValue, bonus, category)
  } else if (isPublicSale(category)) {
    await contract.schedulePublicSaleVesting(to, depositedValue, bonus, category)
  } else {
    await contract.scheduleProjectVesting(to, depositedValue, category)
  }
};

const startDistribution = async (config, logger, csvPath) => {
  let totalDistributedPurchasedPht = 0;
  let totalDistributedBonus = 0;

  const web3 = new Web3(config.rpcUrl, null, web3Cfg);

  const csv = await Csv(csvPath, logger);
  csv.validateDistributionData();

  const contract = await Contract(web3, logger, {
    contractAddress: config.contractAddress,
    contractPath: config.contractPath,
    distributionOwner: config.distributionWallet
  });

  const data = csv.getAggregatedDistributionData();

  for ( let i = 0; i < data.length; i++ ) {
    const distributionItem = data[i];
    logger.logDistribution(i, distributionItem);
    if (!web3.utils.isAddress(distributionItem.to)) {
      logger.error(`\tInvalid ethereum address ${distributionItem.to}`);
      continue;
    }

    const existingVestingData = await contract.vestingExists(distributionItem.to);
    if (categoryHasScheduledVesting(distributionItem.category)) {
      if (existingVestingData.startTimestamp.toString() !== "0") {
        logger.logVesting(existingVestingData);
        logger.error(`\tAddress ${distributionItem.to} already got an active vesting`);
        continue;
      }

      try {
        await transferTo(web3, logger, {
          from: config.distributionWallet,
          to: distributionItem.to,
          amountInWei: pht2Wei(web3, '1')
        });
      } catch ( err ) {
        logger.error(err);
      }
    }

    try {
      await scheduleDistribution(contract, {
        to: distributionItem.to,
        purchased: pht2Wei(web3, distributionItem.purchased_pht),
        bonus: pht2Wei(web3, distributionItem.bonus_pht),
        category: distributionItem.category
      });

      if (categoryHasScheduledVesting(distributionItem.category)) {
        const vestingData = await contract.vestingExists(distributionItem.to);
        logger.logVesting(vestingData);
      }

      totalDistributedPurchasedPht += parseInt(distributionItem.purchased_pht);
      totalDistributedBonus += parseInt(distributionItem.bonus_pht);
    } catch (err) {
      logger.error(err);
    }
  }

  return {
    totalPurchased: totalDistributedPurchasedPht,
    totalBonus: totalDistributedBonus
  }
};


const logger = Logger('Distribution');

if (process.argv.length !== 3) {
  logger.info("Invalid argument number: node distribute.js ${CSV_PATH}");
}

const config = LoadConfig();
const csvPath = process.argv[2];

startDistribution(config, logger, csvPath)
  .then(({ totalPurchased, totalBonus }) => {
    logger.logFinalOutput(totalPurchased, totalBonus);
    logger.info(`Distribution completed`);
  })
  .catch(err => {
    console.error(err);
    logger.error(err.message());
  })
  .finally(() => {
    logger.info(`Logged in ${logger.filepath()} at ${(new Date().toISOString())}`);
    process.exit(1);
    logger.close();
  });
