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
  wei2pht,
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
  const PRIVATE_SALE_ACCOUNT = accounts[1];
  const PRIVATE_SALE_ACCOUNT_2 = accounts[2];

  const PRIVATE_SALE_CONTRIBUTOR_ALLOCATION_PHT = 500;
  const PRIVATE_SALE_CONTRIBUTOR_ALLOCATION_BONUS_PHT = 150;

  it('Should travel 1 day in the future so the vesting periods can be scheduled', async () => {
    assert.isFulfilled(timeTravel(1));
  });

  it('The owner cannot create an allocation for private contributor without sending enough tokens', async() => {
    const instance = await Distribution.deployed();
    const amountWei = pht2wei(PRIVATE_SALE_CONTRIBUTOR_ALLOCATION_PHT.toString());
    const bonusAmountWei = pht2wei(PRIVATE_SALE_CONTRIBUTOR_ALLOCATION_BONUS_PHT.toString());

    return assert.isRejected(instance.schedulePrivateSaleVesting(PRIVATE_SALE_ACCOUNT, bonusAmountWei,
      { from: OWNER_ACCOUNT, value: amountWei }));
  });

  it('The owner cannot create an allocation for private contributor with more than 40% bonus', async () => {
    const instance = await Distribution.deployed();
    const exceedBonus = PRIVATE_SALE_CONTRIBUTOR_ALLOCATION_PHT * 0.41;
    const bonusAmountWei = pht2wei(exceedBonus.toString());
    const totalAmountWei = pht2wei((exceedBonus + PRIVATE_SALE_CONTRIBUTOR_ALLOCATION_PHT).toString());

    return assert.isRejected(instance.schedulePrivateSaleVesting(PRIVATE_SALE_ACCOUNT, bonusAmountWei,
      { from: OWNER_ACCOUNT, value: totalAmountWei }));
  });

  it('The owner can create an allocation for private contributors from sale supply with vesting an without bonus', async () => {
    const instance = await Distribution.deployed();
    const amountWei = pht2wei(PRIVATE_SALE_CONTRIBUTOR_ALLOCATION_PHT.toString());

    const saleSupplyBefore = await instance.SALE_AVAILABLE_TOTAL_SUPPLY.call();
    const saleSupplyDistributedBefore = await instance.saleSupplyDistributed();

    await instance.schedulePrivateSaleVesting(PRIVATE_SALE_ACCOUNT, 0,
      { from: OWNER_ACCOUNT, value: amountWei });

    const vesting = await instance.vestings(PRIVATE_SALE_ACCOUNT);
    const saleSupplyAfter = await instance.SALE_AVAILABLE_TOTAL_SUPPLY.call();
    const saleSupplyDistributedAfter = await instance.saleSupplyDistributed();
    const contributorAllocation = vesting[VI.balanceInitial];

    assert.equal(SALE_AVAILABLE_TOTAL_SUPPLY, wei2pht(saleSupplyBefore));
    assert.equal(contributorAllocation.toString(), amountWei.toString());
    assert.equal(saleSupplyAfter.toString(), saleSupplyBefore.sub(contributorAllocation).toString());
    assert.equal(saleSupplyDistributedAfter.toString(), saleSupplyDistributedBefore.add(amountWei).toString());
  });

  it('The owner can create an allocation for private contributors from sale supply with vesting an with bonus', async () => {
    const instance = await Distribution.deployed();
    const amountWei = pht2wei(PRIVATE_SALE_CONTRIBUTOR_ALLOCATION_PHT.toString());
    const bonusAmountWei = pht2wei(PRIVATE_SALE_CONTRIBUTOR_ALLOCATION_BONUS_PHT.toString());
    const totalAmountWei = pht2wei((PRIVATE_SALE_CONTRIBUTOR_ALLOCATION_BONUS_PHT+PRIVATE_SALE_CONTRIBUTOR_ALLOCATION_PHT).toString());

    const saleSupplyBefore = await instance.SALE_AVAILABLE_TOTAL_SUPPLY.call();
    const saleSupplyDistributedBefore = await instance.saleSupplyDistributed();

    await instance.schedulePrivateSaleVesting(PRIVATE_SALE_ACCOUNT_2, bonusAmountWei,
      { from: OWNER_ACCOUNT, value: totalAmountWei });

    const vesting = await instance.vestings(PRIVATE_SALE_ACCOUNT_2);
    const saleSupplyAfter = await instance.SALE_AVAILABLE_TOTAL_SUPPLY.call();
    const saleSupplyDistributedAfter = await instance.saleSupplyDistributed();

    assert.equal(vesting[VI.balanceInitial].toString(), amountWei.toString());
    assert.equal(vesting[VI.bonusInitial].toString(), bonusAmountWei.toString());
    assert.equal(saleSupplyAfter.toString(), saleSupplyBefore.sub(vesting[VI.balanceInitial]).sub(vesting[VI.bonusInitial]).toString());
    assert.equal(saleSupplyDistributedAfter.toString(), saleSupplyDistributedBefore.add(totalAmountWei).toString());
  });

  it('Should travel 3 months to test periods withdraws', async () => {
    assert.isFulfilled(timeTravel(30 * 3));
  });

  it('The owner cannot revoke a private contributor vesting', async () => {
    const instance = await Distribution.deployed();
    return assert.isRejected(instance.revokeVestingSchedule(PRIVATE_SALE_ACCOUNT, { from: OWNER_ACCOUNT }));
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

    assert.equal(contributorBalanceAfter.toString(), contributorBalanceBefore.add(pht2wei(expectedReleasable).sub(txCost)).toString());
    assert.equal(vestingAfter[VI.balanceInitial].toString(), vestingBefore[VI.balanceInitial].toString());
    assert.equal(vestingAfter[VI.balanceRemaining].toString(), vestingBefore[VI.balanceRemaining].sub(pht2wei(expectedReleasable)).toString());
    assert.equal(vestingAfter[VI.balanceClaimed].toString(), pht2wei(expectedReleasable).toString());
  });

  it('Should travel 2 months to test periods withdraws', async () => {
    assert.isFulfilled(timeTravel(30 * 2));
  });

  it('The private sale contributor can release their vested amount but not bonus', async () => {
    const instance = await Distribution.deployed();
    const expectedReleasable = PRIVATE_SALE_CONTRIBUTOR_ALLOCATION_PHT.toString();
    const contributorBalanceBefore = toBN(await web3.eth.getBalance(PRIVATE_SALE_ACCOUNT_2));

    const tx = await instance.withdraw(PRIVATE_SALE_ACCOUNT_2, { from: PRIVATE_SALE_ACCOUNT_2 });
    const txCost = await calculateGasCost(tx.receipt.gasUsed);

    const vestingAfter = await instance.vestings(PRIVATE_SALE_ACCOUNT_2);
    const contributorBalanceAfter = toBN(await web3.eth.getBalance(PRIVATE_SALE_ACCOUNT_2));

    assert.equal(contributorBalanceAfter.toString(), contributorBalanceBefore.add(pht2wei(expectedReleasable).sub(txCost)).toString());
    assert.equal(vestingAfter[VI.balanceRemaining].toString(), '0');
    assert.equal(vestingAfter[VI.balanceClaimed].toString(), pht2wei(PRIVATE_SALE_CONTRIBUTOR_ALLOCATION_PHT.toString()).toString());
  });

  it('Should travel 1 months to test periods withdraws', async () => {
    assert.isFulfilled(timeTravel(30));
  });

  it('The private sale contributor can release 20% of vested bonus', async () => {
    const instance = await Distribution.deployed();
    const expectedReleasable = (PRIVATE_SALE_CONTRIBUTOR_ALLOCATION_PHT * 0.20).toString();
    const contributorBalanceBefore = toBN(await web3.eth.getBalance(PRIVATE_SALE_ACCOUNT_2));

    const tx = await instance.withdraw(PRIVATE_SALE_ACCOUNT_2, { from: PRIVATE_SALE_ACCOUNT_2 });
    const txCost = await calculateGasCost(tx.receipt.gasUsed);

    const vestingAfter = await instance.vestings(PRIVATE_SALE_ACCOUNT_2);
    const contributorBalanceAfter = toBN(await web3.eth.getBalance(PRIVATE_SALE_ACCOUNT_2));

    assert.equal(contributorBalanceAfter.toString(), contributorBalanceBefore.add(pht2wei(expectedReleasable).sub(txCost)).toString());
    assert.equal(vestingAfter[VI.bonusRemaining].toString(), pht2wei((PRIVATE_SALE_CONTRIBUTOR_ALLOCATION_BONUS_PHT-expectedReleasable).toString()));
    assert.equal(vestingAfter[VI.bonusClaimed].toString(), pht2wei(expectedReleasable.toString()));
  });

  it('The private sale contributor can release remaining vested bonus', async () => {
    const instance = await Distribution.deployed();
    const expectedReleasable = (PRIVATE_SALE_CONTRIBUTOR_ALLOCATION_BONUS_PHT - (PRIVATE_SALE_CONTRIBUTOR_ALLOCATION_PHT * 0.20)).toString();
    const contributorBalanceBefore = toBN(await web3.eth.getBalance(PRIVATE_SALE_ACCOUNT_2));

    const tx = await instance.withdraw(PRIVATE_SALE_ACCOUNT_2, { from: PRIVATE_SALE_ACCOUNT_2 });
    const txCost = await calculateGasCost(tx.receipt.gasUsed);

    const vestingAfter = await instance.vestings(PRIVATE_SALE_ACCOUNT_2);
    const contributorBalanceAfter = toBN(await web3.eth.getBalance(PRIVATE_SALE_ACCOUNT_2));

    assert.equal(contributorBalanceAfter.toString(), contributorBalanceBefore.add(pht2wei(expectedReleasable).sub(txCost)).toString());
    assert.equal(vestingAfter[VI.bonusRemaining].toString(), '0');
    assert.equal(vestingAfter[VI.bonusClaimed].toString(), pht2wei(PRIVATE_SALE_CONTRIBUTOR_ALLOCATION_BONUS_PHT));
  });

  it('Should travel 1 months to test periods withdraws', async () => {
    assert.isFulfilled(timeTravel(30));
  });

  it('The private sale contributor cannot release more tokens', async () => {
    const instance = await Distribution.deployed();
    return assert.isRejected(instance.withdraw(PRIVATE_SALE_ACCOUNT_2, { from: PRIVATE_SALE_ACCOUNT_2 }));
  });
});