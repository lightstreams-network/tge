/**
 * User: ggarrido
 * Date: 11/07/19 11:23
 * Copyright 2019 (c) Lightstreams, Granada
 */

const fs = require('fs');

module.exports = (prefix = '') => {
  const d = new Date();
  const logfile = `./logs/${prefix}-${d.toISOString()}`;
  const fd = fs.openSync(logfile, 'w');

  const logInfo = (msg) => {
    if(!msg) return;

    console.log(msg);
    if (typeof msg === 'string') {
      fs.writeSync(fd, `${msg}\n`);
    } else {
      fs.writeSync(fd, `${JSON.stringify(msg.message)}\n`);
    }
  };

  const logError = (msg) => {
    if (!msg) return;

    console.error('[ERROR] ', msg);
    if (typeof msg === 'string') {
      fs.writeSync(fd, `[ERROR] ${msg}\n`);
    } else {
      fs.writeSync(fd, `[ERROR] ${msg.stack}\n`);
    }
  };

  const logWarning = (msg) => {
    if (!msg) return;

    console.error('[WARNING] ', msg);
    if (typeof msg === 'string') {
      fs.writeSync(fd, `[WARNING] ${msg}\n`);
    } else {
      fs.writeSync(fd, `[WARNING] ${msg.message}\n`);
    }
  };

  return {
    info: logInfo,
    error: logError,
    close: () => {
      fs.closeSync(fd)
    },
    filepath: () => {
      return logfile;
    },
    logReceipt: (receipt) => {
      logInfo("\t-----------");
      logInfo("\tTX Receipt:");
      logInfo(`\t\tstatus: ${receipt.status}`);
      logInfo(`\t\thash: ${receipt.transactionHash}`);
    },
    logScheduleProject: (fromWallet, to, value, category, solidityCategory) => {
      logInfo("\t-----------");
      logInfo("\tProject Distribution");
      logInfo(`\t\tfrom: ${fromWallet}`);
      logInfo(`\t\tto: ${to}`);
      logInfo(`\t\tvalue: ${value}`);
      logInfo(`\t\tcsvCategory: ${category}`);
      logInfo(`\t\tsolcCategory: ${solidityCategory}`);
    },
    logScheduleSale: (fromWallet, to, value, category) => {
      logInfo("\t-----------");
      logInfo("\tSales Distribution");
      logInfo(`\t\tfrom: ${fromWallet}`);
      logInfo(`\t\tto: ${to}`);
      logInfo(`\t\tvalue: ${value}`);
      logInfo(`\t\tcsvCategory: ${category}`);
    },
    logFinalOutput: (finalResult) => {
      logInfo('\n\n#########################');
      logInfo(`   ${JSON.stringify(finalResult)}`);
      logInfo('#########################\n');
    },
    logDistribution: (idx, distribution) => {
      logInfo(`\n[Distribution #${idx}]`);
      logInfo(`to: ${distribution.to}`);
      logInfo(`purchased: ${distribution.purchased_pht}`);
      logInfo(`bonus: ${distribution.bonus_pht}`);
      logInfo(`category: ${distribution.category}`);
      logInfo(`\n`);
    },
    logVesting: (vestingData) => {
      logInfo("\t-----------");
      logInfo("\tVesting:");
      if (!vestingData) {
        logError(`\t\tEmpty vesting`);
      } else if(vestingData.startTimestamp.toString() === "0") {
        logWarning(`\t\tNot Vesting`);
      } else {
        const dS = new Date(vestingData.startTimestamp.toString() * 1000);
        const dE = new Date(vestingData.endTimestamp.toString() * 1000);
        logInfo(`\t\tstartTimestamp: ${dS.toISOString()}`);
        logInfo(`\t\tendTimestamp: ${dE.toISOString()}`);
        logInfo(`\t\tbalanceInitial: ${vestingData.balanceInitial.toString()}`);
        logInfo(`\t\tbonusInitial: ${vestingData.bonusInitial.toString()}`);
        logInfo(`\t\trevocable: ${vestingData.revocable}`);
      }
      logInfo("\t-----------");
    }
  }
};