const dotenv = require('dotenv');
dotenv.config({ path: `${process.env.PWD}/.env` });

const Web3 = require('web3');
const Csv = require('./lib/csv');
const Logger = require('./lib/logger');
const { Contract } = require('./lib/contract');

const pht2Wei = (web3, pht) => {
  return web3.utils.toBN(web3.utils.toWei(pht.toString(), 'ether'));
};

const transferTo = (web3, logger, { from, to, amountInWei }) => {
  return new Promise((resolve, reject) => {
    web3.eth.sendTransaction({
      from,
      to,
      value: amountInWei,
      gas: 21000
    }).on('transactionHash', (transactionHash) => {
      logger.info(`\t\tTransaction Executed: ${transactionHash}`);
    }).on('confirmation', (confirmationNumber, txReceipt) => {
      if (typeof txReceipt.status !== 'undefined') {
        if (txReceipt.status === true || txReceipt.status === '0x1') {
          logger.logReceipt(txReceipt);
          resolve(txReceipt);
        } else {
          logger.logReceipt(txReceipt);
          logger.error(new Error("Transaction failed"));
        }
      } else {
        resolve(txReceipt);
      }
    }).on('error', (err) => {
      logger.error(err);
      reject(err);
    }).catch(err => {
      logger.error(err);
      reject(err);
    });
  });
};

const scheduleDistribution = async (contract, { to, purchased, bonus, category }) => {
  const depositedValue = purchased.add(bonus);
  if (contract.isPrivateSale(category)) {
    await contract.schedulePrivateSaleVesting(to, depositedValue, bonus, category)
  } else if (contract.isPublicSale(category)) {
    await contract.schedulePublicSaleVesting(to, depositedValue, bonus, category)
  } else {
    await contract.scheduleProjectVesting(to, depositedValue, category)
  }
};

const startDistribution = async (config, logger) => {
  let totalDistributedPurchasedPht = 0;
  let totalDistributedBonus = 0;

  const web3 = new Web3(config.rpcUrl, null, {
    defaultGasPrice: '500000000000',
    transactionConfirmationBlocks: 1,
    transactionBlockTimeout: 5,
    defaultBlock: "latest",
  });

  const csv = await Csv(config.csvPath, logger);
  const contract = await Contract(web3, logger, {
    projectWallet: config.projectWallet,
    salesWallet: config.saleWallet,
  }, {
    contractAddress: config.contractAddress,
    contractPath: config.contractPath
  });

  const data = csv.getAggregatedData();
  for ( let i = 0; i < data.length; i++ ) {
    const distributionItem = data[i];
    logger.logDistribution(i, distributionItem);
    if (!web3.utils.isAddress(distributionItem.to)) {
      logger.error(`\tInvalid ethereum address ${distributionItem.to}`);
      continue;
    }

    const existingVestingData = await contract.vestingExists(distributionItem.to);
    if(existingVestingData && existingVestingData.startTimestamp.toString() !== "0") {
      logger.logVesting(existingVestingData);
      logger.error(`\tAddress ${distributionItem.to} already got an active vesting`);
      continue;
    }

    logger.info("\t-----------");
    logger.info(`\tTransferring 1 PHT to ${distributionItem.to}...`);
    await transferTo(web3, logger, {
      from: config.projectWallet,
      to: distributionItem.to,
      amountInWei: pht2Wei(web3, '1')
    });

    try {
      await scheduleDistribution(contract, {
        to: distributionItem.to,
        purchased: pht2Wei(web3, distributionItem.purchased_pht),
        bonus: pht2Wei(web3, distributionItem.bonus_pht),
        category: distributionItem.category
      });

      const vestingData = await contract.vestingExists(distributionItem.to);
      logger.logVesting(vestingData);

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

const config = {
  contractAddress: process.env.CONTRACT_ADDR,
  contractPath: process.env.CONTRACT_PATH,
  csvPath: process.env.CSV_FILEPATH,
  projectWallet: process.env.WALLET_PROJECT,
  saleWallet: process.env.WALLET_SALE,
  rpcUrl: process.env.RPC_URL
};

const logger = Logger();

startDistribution(config, logger)
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
