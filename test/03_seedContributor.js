/**
 * User: ggarrido
 * Date: 3/04/19 16:21
 * Copyright 2019 (c) Lightstreams, Granada
 */


const chai = require('chai');
chai.use(require('chai-as-promised'));
const assert = chai.assert;

const {
  timeTravel,
  wei2Ether,
  pht2wei,
  toBN,
  calculateGasCost,
  VI
} = require('./utils');

const Distribution = artifacts.require("Distribution");

const {
  AVAILABLE_SEED_CONTRIBUTORS_SUPPLY,
} = require('./globals').supplies;

const {
  SEED_CONTRIBUTORS_SUPPLY_ID,
} = require('./globals').supplyIds;

contract('Seed Contributor', (accounts) => {
  const OWNER_ACCOUNT = accounts[0];
  const SEED_CONTRIBUTOR_ACCOUNT = accounts[2];

  const SEED_CONTRIBUTOR_ALLOCATION_PHT = 500;

  it('Should travel 1 day in the future so the vesting periods can be scheduled', async () => {
    assert.isFulfilled(timeTravel(1));
  });

  it('The owner can not create an allocation from the seed contributor supply greater than the amount allocated to it', async () => {
    const instance = await Distribution.deployed();
    const amountPHT = web3.utils.toWei((AVAILABLE_SEED_CONTRIBUTORS_SUPPLY + 100).toString(), 'ether');

    return assert.isRejected(instance.scheduleProjectVesting(SEED_CONTRIBUTOR_ACCOUNT, SEED_CONTRIBUTORS_SUPPLY_ID, {
      from: OWNER_ACCOUNT,
      value: amountPHT
    }));
  });

  it('The owner can create an allocation from the seed contributors supply', async () => {
    const instance = await Distribution.deployed();
    const amountWei = pht2wei(SEED_CONTRIBUTOR_ALLOCATION_PHT.toString());

    const seedContributorSupplyBefore = await instance.AVAILABLE_SEED_CONTRIBUTORS_SUPPLY.call();
    const projectSupplyDistributedBefore = await instance.projectSupplyDistributed();

    await instance.scheduleProjectVesting(SEED_CONTRIBUTOR_ACCOUNT, SEED_CONTRIBUTORS_SUPPLY_ID, {
      from: OWNER_ACCOUNT,
      value: amountWei
    });

    const seedContributorAllocationData = await instance.vestings(SEED_CONTRIBUTOR_ACCOUNT);
    const seedContributorSupplyAfter = await instance.AVAILABLE_SEED_CONTRIBUTORS_SUPPLY.call();
    const projectSupplyDistributedAfter = await instance.projectSupplyDistributed();
    const seedContributorAllocation = seedContributorAllocationData[VI.balanceInitial];

    assert.equal(AVAILABLE_SEED_CONTRIBUTORS_SUPPLY, wei2Ether(seedContributorSupplyBefore));
    assert.equal(seedContributorAllocation.toString(), amountWei.toString());
    assert.equal(seedContributorSupplyAfter.toString(), seedContributorSupplyBefore.sub(seedContributorAllocation).toString());
    assert.equal(projectSupplyDistributedAfter.toString(), projectSupplyDistributedBefore.add(amountWei).toString());
  });

  it('Should travel 3 months + 15 days to test periods withdraws', async () => {
    assert.isFulfilled(timeTravel(30 * 3));
  });

  it('The owner cannot revoke a seed contributor vesting', async () => {
    const instance = await Distribution.deployed();
    assert.isRejected(instance.revokeVestingSchedule(SEED_CONTRIBUTOR_ACCOUNT, { from: OWNER_ACCOUNT }));
  });

  it('The seed contributor can release their vested amount', async () => {
    const instance = await Distribution.deployed();
    const expectedReleasable = '300';

    const vestingBefore = await instance.vestings(SEED_CONTRIBUTOR_ACCOUNT);
    const contributorBalanceBefore = toBN(await web3.eth.getBalance(SEED_CONTRIBUTOR_ACCOUNT));

    const tx = await instance.withdraw(SEED_CONTRIBUTOR_ACCOUNT, { from: SEED_CONTRIBUTOR_ACCOUNT });
    const txCost = await calculateGasCost(tx.receipt.gasUsed);

    const vestingAfter = await instance.vestings(SEED_CONTRIBUTOR_ACCOUNT);
    const contributorBalanceAfter = toBN(await web3.eth.getBalance(SEED_CONTRIBUTOR_ACCOUNT));

    // seed contributor allocation was originally 500 PTH if 3 months pass they
    // should be allowed to withdraw 300 PTH
    assert.equal(contributorBalanceAfter.toString(), contributorBalanceBefore.add(pht2wei(expectedReleasable).sub(txCost)).toString());
    assert.equal(vestingAfter[VI.balanceInitial].toString(), vestingBefore[VI.balanceInitial].toString());
    assert.equal(vestingAfter[VI.balanceRemaining].toString(), vestingBefore[VI.balanceRemaining].sub(pht2wei(expectedReleasable)).toString());
    assert.equal(vestingAfter[VI.balanceClaimed].toString(), pht2wei(expectedReleasable).toString());
  });

  it('Should travel 30 days to test next period withdraws', async () => {
    assert.isFulfilled(timeTravel(30));
  });

  it('The owner cannot revoke a seed contributor vesting', async () => {
    const instance = await Distribution.deployed();

    assert.isRejected(instance.revokeVestingSchedule(SEED_CONTRIBUTOR_ACCOUNT, { from: OWNER_ACCOUNT }));
  });
});