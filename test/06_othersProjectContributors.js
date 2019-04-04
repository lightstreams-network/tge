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
  AVAILABLE_CONSULTANTS_SUPPLY,
  AVAILABLE_OTHER_SUPPLY,
  AVAILABLE_FUTURE_OFFERING_SUPPLY
} = require('./globals').supplies;

const {
  CONSULTANTS_SUPPLY_ID,
  OTHER_SUPPLY_ID,
  FUTURE_OFFERING_ID,
} = require('./globals').supplyIds;

contract('Other Project Contributor', (accounts) => {
  const OWNER_ACCOUNT = accounts[0];
  const CONSULTANT_ACCOUNT = accounts[1];
  const OTHER_ACCOUNT = accounts[2];
  const OFFERING_ACCOUNT = accounts[3];

  const OTHER_ALLOCATION_IN_PHT = 100;

  it('Should travel 1 day in the future so the vesting periods can be scheduled', async () => {
    assert.isFulfilled(timeTravel(1));
  });

  it('The owner can create distribute tokens to consultant directly without vesting', async () => {
    const instance = await Distribution.deployed();
    const amountWei = pht2wei(OTHER_ALLOCATION_IN_PHT.toString());

    const supplyBefore = await instance.AVAILABLE_CONSULTANTS_SUPPLY.call();
    const supplyDistributedBefore = await instance.projectSupplyDistributed();
    const balanceBefore = toBN(await web3.eth.getBalance(CONSULTANT_ACCOUNT));

    await instance.scheduleProjectVesting(CONSULTANT_ACCOUNT, CONSULTANTS_SUPPLY_ID,
      { from: OWNER_ACCOUNT, value: amountWei });

    const supplyAfter = await instance.AVAILABLE_CONSULTANTS_SUPPLY.call();
    const supplyDistributedAfter = await instance.projectSupplyDistributed();
    const balanceAfter = toBN(await web3.eth.getBalance(CONSULTANT_ACCOUNT));

    assert.equal(supplyAfter.toString(), supplyBefore.sub(amountWei).toString());
    assert.equal(supplyDistributedAfter.toString(), supplyDistributedBefore.add(amountWei).toString());
    assert.equal(balanceAfter.toString(), balanceBefore.add(amountWei).toString());
  });

  it('The owner can create distribute tokens to other account directly without vesting', async () => {
    const instance = await Distribution.deployed();
    const amountWei = pht2wei(OTHER_ALLOCATION_IN_PHT.toString());

    const supplyBefore = await instance.AVAILABLE_OTHER_SUPPLY.call();
    const supplyDistributedBefore = await instance.projectSupplyDistributed();
    const balanceBefore = toBN(await web3.eth.getBalance(OTHER_ACCOUNT));

    await instance.scheduleProjectVesting(OTHER_ACCOUNT, OTHER_SUPPLY_ID,
      { from: OWNER_ACCOUNT, value: amountWei });

    const supplyAfter = await instance.AVAILABLE_OTHER_SUPPLY.call();
    const supplyDistributedAfter = await instance.projectSupplyDistributed();
    const balanceAfter = toBN(await web3.eth.getBalance(OTHER_ACCOUNT));

    assert.equal(supplyAfter.toString(), supplyBefore.sub(amountWei).toString());
    assert.equal(supplyDistributedAfter.toString(), supplyDistributedBefore.add(amountWei).toString());
    assert.equal(balanceAfter.toString(), balanceBefore.add(amountWei).toString());
  });

  it('The owner can create distribute tokens to future offering account directly without vesting', async () => {
    const instance = await Distribution.deployed();
    const amountWei = pht2wei(OTHER_ALLOCATION_IN_PHT.toString());

    const supplyBefore = await instance.AVAILABLE_FUTURE_OFFERING_SUPPLY.call();
    const supplyDistributedBefore = await instance.projectSupplyDistributed();
    const balanceBefore = toBN(await web3.eth.getBalance(OFFERING_ACCOUNT));

    await instance.scheduleProjectVesting(OFFERING_ACCOUNT, FUTURE_OFFERING_ID,
      { from: OWNER_ACCOUNT, value: amountWei });

    const supplyAfter = await instance.AVAILABLE_FUTURE_OFFERING_SUPPLY.call();
    const supplyDistributedAfter = await instance.projectSupplyDistributed();
    const balanceAfter = toBN(await web3.eth.getBalance(OFFERING_ACCOUNT));

    assert.equal(supplyAfter.toString(), supplyBefore.sub(amountWei).toString());
    assert.equal(supplyDistributedAfter.toString(), supplyDistributedBefore.add(amountWei).toString());
    assert.equal(balanceAfter.toString(), balanceBefore.add(amountWei).toString());
  });
});