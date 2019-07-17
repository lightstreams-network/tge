/**
 * User: ggarrido
 * Date: 17/07/19 15:48
 * Copyright 2019 (c) Lightstreams, Granada
 */


module.exports.pht2Wei = (web3, pht) => {
  return web3.utils.toBN(web3.utils.toWei(pht.toString(), 'ether'));
};

module.exports.transferTo = (web3, logger, { from, to, amountInWei }) => {
  logger.info("\t-----------");
  logger.info(`\tTransferring ${amountInWei} wei to ${to}...`);
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
          logger.info(`\tTransferred ${amountInWei} wei to ${to}`);
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
    });
  });
};

module.exports.web3Cfg = {
  defaultGasPrice: '500000000000',
  transactionConfirmationBlocks: 1,
  transactionBlockTimeout: 5,
  defaultBlock: "latest",
};

module.exports.LoadConfig = () => {
  return {
    contractAddress: process.env.CONTRACT_ADDR,
    contractPath: process.env.CONTRACT_PATH,
    distributionWallet: process.env.DISTRIBUTION_WALLET,
    rpcUrl: process.env.RPC_URL
  };
};