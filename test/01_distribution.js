const chai = require('chai');
chai.use(require('chai-as-promised'));
const assert = chai.assert;

const {
    timeTravel,
    wei2pht,
    pht2wei,
} = require('./utils');

const Distribution = artifacts.require("Distribution");

const {
  AVAILABLE_TEAM_SUPPLY,
  AVAILABLE_SEED_CONTRIBUTORS_SUPPLY,
  AVAILABLE_CONSULTANTS_SUPPLY,
  AVAILABLE_OTHER_SUPPLY,
  AVAILABLE_FUTURE_OFFERING_SUPPLY,
  SALE_AVAILABLE_TOTAL_SUPPLY
} = require('./globals').supplies;

const {
  TEAM_SUPPLY_ID,
  SEED_CONTRIBUTORS_SUPPLY_ID,
  CONSULTANTS_SUPPLY_ID,
  OTHER_SUPPLY_ID,
  FUTURE_OFFERING_ID,
} = require('./globals').supplyIds;

contract('Distribution', (accounts) => {
    const OWNER_ACCOUNT = accounts[0];
    const TEAM_MEMBER_ACCOUNT = accounts[1];
    const SEED_CONTRIBUTOR_ACCOUNT = accounts[2];
    const FOUNDER_ACCOUNT = accounts[3];
    const PRIVATE_SALE_ACCOUNT = accounts[4];
    const PUBLIC_SALE_ACCOUNT = accounts[5];
    const OTHER_ACCOUNT = accounts[6];
    const CONSULTANT_ACCOUNT = accounts[7];
    const FUTURE_CONTRIBUTOR_ACCOUNT = accounts[9];

  it('should deploy the Distribution contract and store the address', async ()=>{
    const instance = await Distribution.deployed();
    assert.isDefined(instance.address, 'Token address could not be stored');
  });

  it('should deploy the Distribution with the expected supplies', async () => {
    const instance = await Distribution.deployed();

    const teamSupplyBefore = await instance.AVAILABLE_TEAM_SUPPLY.call();
    const seedContributorSupplyBefore = await instance.AVAILABLE_SEED_CONTRIBUTORS_SUPPLY.call();
    const consultantSupplyBefore = await instance.AVAILABLE_CONSULTANTS_SUPPLY.call();
    const otherSupplyBefore = await instance.AVAILABLE_OTHER_SUPPLY.call();
    const futureOfferingSupplyBefore = await instance.AVAILABLE_FUTURE_OFFERING_SUPPLY.call();


    assert.equal(AVAILABLE_TEAM_SUPPLY, wei2pht(teamSupplyBefore));
    assert.equal(AVAILABLE_SEED_CONTRIBUTORS_SUPPLY, wei2pht(seedContributorSupplyBefore));
    assert.equal(AVAILABLE_CONSULTANTS_SUPPLY, wei2pht(consultantSupplyBefore));
    assert.equal(AVAILABLE_OTHER_SUPPLY, wei2pht(otherSupplyBefore));
    assert.equal(AVAILABLE_FUTURE_OFFERING_SUPPLY, wei2pht(futureOfferingSupplyBefore));
  });

  it('The owner can not create an allocation before allocation distribution starts', async () => {
    const instance = await Distribution.deployed();
    const amountWei = pht2wei('1');

    return assert.isRejected(instance.scheduleProjectVesting(TEAM_MEMBER_ACCOUNT, TEAM_SUPPLY_ID, {
      from: OWNER_ACCOUNT,
      value: amountWei
    }));
  });

  it('The owner cannot create distribute tokens to public sale before allocation distribution starts', async () => {
    const instance = await Distribution.deployed();
    const amountWei = pht2wei('1');
    return assert.isRejected(instance.schedulePublicSaleVesting(FOUNDER_ACCOUNT,
      { from: OWNER_ACCOUNT, value: amountWei }));
  });

  it('Should travel 1 day in the future so the vesting periods can be scheduled', async () => {
    return assert.isFulfilled(timeTravel(1));
  });

  it('Only the owner can create an allocation ', async () => {
    const instance = await Distribution.deployed();
    const amountWei = pht2wei('1');

    return assert.isRejected(instance.scheduleProjectVesting(FOUNDER_ACCOUNT, TEAM_SUPPLY_ID, {
      from: OTHER_ACCOUNT,
      value: amountWei
    }));
  });

  it('The owner can not create an allocation from the seed contributor supply greater than the amount allocated to it', async () => {
    const instance = await Distribution.deployed();
    const amountWei = pht2wei((AVAILABLE_SEED_CONTRIBUTORS_SUPPLY).toString());
    const amountWeiOne = pht2wei('1');

    await instance.scheduleProjectVesting(SEED_CONTRIBUTOR_ACCOUNT, SEED_CONTRIBUTORS_SUPPLY_ID, {
      from: OWNER_ACCOUNT,
      value: amountWei
    });

    return assert.isRejected(instance.scheduleProjectVesting(SEED_CONTRIBUTOR_ACCOUNT, SEED_CONTRIBUTORS_SUPPLY_ID, {
      from: OWNER_ACCOUNT,
      value: amountWeiOne
    }));
  });

  it('The owner can not create an allocation from the team supply greater than the amount allocated to it', async () => {
    const instance = await Distribution.deployed();
    const amountWei = pht2wei((AVAILABLE_TEAM_SUPPLY).toString());
    const amountWeiOne = pht2wei('1');

    await instance.scheduleProjectVesting(TEAM_MEMBER_ACCOUNT, TEAM_SUPPLY_ID, {
      from: OWNER_ACCOUNT,
      value: amountWei
    });

    return assert.isRejected(instance.scheduleProjectVesting(TEAM_MEMBER_ACCOUNT, TEAM_SUPPLY_ID, {
      from: OWNER_ACCOUNT,
      value: amountWeiOne
    }));
  });

  it('The owner can not create an allocation from the consultant supply greater than the amount allocated to it', async () => {
    const instance = await Distribution.deployed();
    const amountWei = pht2wei((AVAILABLE_CONSULTANTS_SUPPLY).toString());
    const amountWeiOne = pht2wei('1');

    await instance.scheduleProjectVesting(CONSULTANT_ACCOUNT, CONSULTANTS_SUPPLY_ID, {
      from: OWNER_ACCOUNT,
      value: amountWei
    });

    return assert.isRejected(instance.scheduleProjectVesting(CONSULTANT_ACCOUNT, CONSULTANTS_SUPPLY_ID, {
      from: OWNER_ACCOUNT,
      value: amountWeiOne
    }));
  });

  it('The owner can not create an allocation from the other supply greater than the amount allocated to it', async () => {
    const instance = await Distribution.deployed();
    const amountWei = pht2wei((AVAILABLE_OTHER_SUPPLY).toString());
    const amountWeiOne = pht2wei('1');

    await instance.scheduleProjectVesting(OTHER_ACCOUNT, OTHER_SUPPLY_ID, {
      from: OWNER_ACCOUNT,
      value: amountWei
    });

    return assert.isRejected(instance.scheduleProjectVesting(OTHER_ACCOUNT, OTHER_SUPPLY_ID, {
      from: OWNER_ACCOUNT,
      value: amountWeiOne
    }));
  });

  it('The owner can not create an allocation from the future offering supply greater than the amount allocated to it', async () => {
    const instance = await Distribution.deployed();
    const amountWei = pht2wei((AVAILABLE_FUTURE_OFFERING_SUPPLY).toString());
    const amountWeiOne = pht2wei('1');

    await instance.scheduleProjectVesting(FUTURE_CONTRIBUTOR_ACCOUNT, FUTURE_OFFERING_ID, {
      from: OWNER_ACCOUNT,
      value: amountWei
    });

    return assert.isRejected(instance.scheduleProjectVesting(FUTURE_CONTRIBUTOR_ACCOUNT, FUTURE_OFFERING_ID, {
      from: OWNER_ACCOUNT,
      value: amountWeiOne
    }));
  });

  it('The owner can not create an allocation from public sale supply greater than the amount allocated to it', async () => {
    const instance = await Distribution.deployed();
    const amountBonus = 10000;
    const amountWei = pht2wei((SALE_AVAILABLE_TOTAL_SUPPLY - amountBonus).toString());
    const bonusAmountWei = pht2wei((amountBonus).toString());
    const amountWeiOne = pht2wei('1');

    await instance.schedulePrivateSaleVesting(PRIVATE_SALE_ACCOUNT, bonusAmountWei, {
      from: OWNER_ACCOUNT,
      value: amountWei
    });

    await instance.schedulePublicSaleVesting(PUBLIC_SALE_ACCOUNT, {
      from: OWNER_ACCOUNT,
      value: bonusAmountWei
    });

    assert.isRejected(instance.schedulePrivateSaleVesting(PUBLIC_SALE_ACCOUNT, 0, {
      from: OWNER_ACCOUNT,
      value: amountWeiOne
    }));

    return assert.isRejected(instance.schedulePublicSaleVesting(PUBLIC_SALE_ACCOUNT, {
      from: OWNER_ACCOUNT,
      value: amountWeiOne
    }));
  });
});