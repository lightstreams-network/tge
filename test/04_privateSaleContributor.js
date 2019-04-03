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
  SALE_AVAILABLE_TOTAL_SUPPLY
} = require('./globals').supplies;

contract('Private Sale Contributor', (accounts) => {
  const OWNER_ACCOUNT = accounts[0];
  const PRIVATE_SALE_ACCOUNT = accounts[4];

  const PRIVATE_SALE_CONTRIBUTOR_ALLOCATION_PHT = 500;

  it('Should travel 1 day in the future so the vesting periods can be scheduled', async () => {
    assert.isFulfilled(timeTravel(1));
  });

  it('The owner can create an allocation for private contributors from sale supply with vesting', async () => {
    const instance = await Distribution.deployed();
    const amountWei = pht2wei(PRIVATE_SALE_CONTRIBUTOR_ALLOCATION_PHT.toString());

    const saleSupplyBefore = await instance.SALE_AVAILABLE_TOTAL_SUPPLY.call();
    const saleSupplyDistributedBefore = await instance.saleSupplyDistributed();

    await instance.schedulePrivateSaleVesting(PRIVATE_SALE_ACCOUNT, 0, { from: OWNER_ACCOUNT, value: amountWei });

    const contributorAllocationData = await instance.vestings(PRIVATE_SALE_ACCOUNT);
    const saleSupplyAfter = await instance.SALE_AVAILABLE_TOTAL_SUPPLY.call();
    const saleSupplyDistributedAfter = await instance.saleSupplyDistributed();
    const contributorAllocation = contributorAllocationData[VI.balanceInitial];

    assert.equal(SALE_AVAILABLE_TOTAL_SUPPLY, wei2Ether(saleSupplyBefore));
    assert.equal(contributorAllocation.toString(), amountWei.toString());
    assert.equal(saleSupplyAfter.toString(), saleSupplyBefore.sub(contributorAllocation).toString());
    assert.equal(saleSupplyDistributedAfter.toString(), saleSupplyDistributedBefore.add(amountWei).toString());
  });

  it('Should travel 3 months + 15 days to test periods withdraws', async () => {
    assert.isFulfilled(timeTravel(30 * 3));
  });

  it('The private sale contributor can release their vested amount', async () => {
    const instance = await Distribution.deployed();
    const expectedReleasable = '300';
    const vestingBefore = await instance.vestings(PRIVATE_SALE_ACCOUNT);
    const contributorBalanceBefore = toBN(await web3.eth.getBalance(PRIVATE_SALE_ACCOUNT));

    const tx = await instance.withdraw(PRIVATE_SALE_ACCOUNT, { from: PRIVATE_SALE_ACCOUNT });
    const txCost = await calculateGasCost(tx.receipt.gasUsed);

    const vestingAfter = await instance.vestings(PRIVATE_SALE_ACCOUNT);
    const contributorBalanceAfter = toBN(await web3.eth.getBalance(PRIVATE_SALE_ACCOUNT));

    // seed contributor allocation was originally 500 PTH if 3 months pass they
    // should be allowed to withdraw 300 PTH
    assert.equal(contributorBalanceAfter.toString(), contributorBalanceBefore.add(pht2wei(expectedReleasable).sub(txCost)).toString());
    assert.equal(vestingAfter[VI.balanceInitial].toString(), vestingBefore[VI.balanceInitial].toString());
    assert.equal(vestingAfter[VI.balanceRemaining].toString(), vestingBefore[VI.balanceRemaining].sub(pht2wei(expectedReleasable)).toString());
    assert.equal(vestingAfter[VI.balanceClaimed].toString(), pht2wei(expectedReleasable).toString());
  });
});