/**
 * User: ggarrido
 * Date: 15/07/19 13:41
 * Copyright 2019 (c) Lightstreams, Granada
 */

const Csv = require('csvtojson');

const {
  categoryHasScheduledVesting,
  isPublicSale,
  isPrivateSale,
} = require('./contract');

// Public and private sale people pull for the sales pool. In the remaining cases it pools from the
// project pool.
const isPrivateOrPublicSale = (category) => {
  return isPublicSale(category) || isPrivateSale(category);
};

// Source pool MUST be the same in order to allow aggregation.
const validateAggregation = (categoryOne, categoryTwo) => {
  return isPrivateOrPublicSale(categoryOne) === isPrivateOrPublicSale(categoryTwo);
};

module.exports = async (csvPath, logger) => {
  const csvData = await Csv().fromFile(csvPath);
  logger.info(`---------`);
  logger.info(`Csv ${csvPath} loaded correctly: ${csvData.length} rows`);

  return {
    getAggregatedData: () => {
      logger.info(`---------`);
      logger.info(`Staring distribution aggregation...`);
      const data = {};
      const notVestingData = Array();
      for ( let i = 0; i < csvData.length; i++ ) {
        const distributionItem = csvData[i];
        if (!categoryHasScheduledVesting(distributionItem.category)){
          notVestingData.push(distributionItem);
        } else if (typeof data[distributionItem.to] === 'undefined') {
          data[distributionItem.to] = distributionItem;
        } else if(validateAggregation(data[distributionItem.to].category, distributionItem.category)) {
          logger.info(`Aggregated ${distributionItem.to}: ${data[distributionItem.to].category}, ${distributionItem.category}`);
          data[distributionItem.to].purchased_pht = parseInt(data[distributionItem.to].purchased_pht) + parseInt(distributionItem.purchased_pht);
          data[distributionItem.to].bonus_pht = parseInt(data[distributionItem.to].bonus_pht) + parseInt(distributionItem.bonus_pht);
        } else {
          logger.error(`Invalid duplicated account aggregation for ${distributionItem.to}: ${data[distributionItem.to].category}, ${distributionItem.category}`)
        }
      }

      return Object.values(data).concat(notVestingData);
    }
  }
};