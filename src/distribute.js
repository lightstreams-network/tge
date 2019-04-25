const env = require('dotenv');
const web3lib = require('web3');
const csv = require('csvtojson');
const fs = require('fs');

env.config({ path: `${process.env.PWD}/.env` });

const web3 = new web3lib(process.env.RPC_URL, null, {});

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

csv()
.fromFile(CSV_FILEPATH)
.then(async (data) => {
    const txReceipts = Array();
    const contract = initContract();

    data.forEach(async function (distribution) {
        const gasLimit = '300000';

        const to = distribution.to;
        const purchased = pht2Wei(distribution.purchased_pht);
        const bonus = pht2Wei(distribution.bonus_pht);
        const category = distribution.category;
        const value = calculateDepositValue(purchased, bonus);

        if (isProject(category)) {
            logDeposit(WALLET_PROJECT, to, value, category);

            const solidityCategory = csvCategoryToSolidityEnumValue(category);

            contract.methods
                .scheduleProjectVesting(to, solidityCategory)
                .send({from: WALLET_PROJECT, value: value, gas: gasLimit})
                .on('transactionHash', (hash) => {
                    console.log(hash);
                    txReceipts.push(hash);
                })
                .on('error', console.error);
        } else if (isPrivateSale(category)) {
            logDeposit(WALLET_SALE, to, value, category);

            contract.methods
                .schedulePrivateSaleVesting(to, bonus.toString())
                .send({from: WALLET_SALE, value: value, gas: gasLimit})
                .on('transactionHash', (hash) => {
                    console.log(hash);
                    txReceipts.push(hash);
                })
                .on('error', console.error);
        } else if (isPublicSale(category)) {
            logDeposit(WALLET_SALE, to, value, category);

            contract.methods
                .schedulePublicSaleVesting(to, bonus.toString())
                .send({from: WALLET_SALE, value: value, gas: gasLimit})
                .on('transactionHash', (hash) => {
                    console.log(hash);
                    txReceipts.push(hash);
                })
                .on('error', console.error);
        } else {
            throw 'CSV_CATEGORY_UNKNOWN'
        }
    });

    let maxTimeoutSeconds = 15;
    do {
        await waitFor(1);
        --maxTimeoutSeconds;
    } while(txReceipts.length < data.length && maxTimeoutSeconds > 0);

    process.exit();
});