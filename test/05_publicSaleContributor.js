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
} = require('./globals').supplies;

const {
} = require('./globals').supplyIds;

contract('Public Sale Contributor', (accounts) => {
  const OWNER_ACCOUNT = accounts[0];
  const PUBLIC_SALE_ACCOUNT = accounts[5];

  const PUBLIC_SALE_CONTRIBUTOR_ALLOCATION_PHT = 100;
  const PUBLIC_SALE_CONTRIBUTOR_ALLOCATION_BONUS_PHT = 10;

  it('Should travel 1 day in the future so the vesting periods can be scheduled', async () => {
    assert.isFulfilled(timeTravel(1));
  });

  it('The owner can create distribute tokens to public sale contributors directly without vesting including the bonus', async () => {
    const instance = await Distribution.deployed();
    const amountWei = pht2wei(PUBLIC_SALE_CONTRIBUTOR_ALLOCATION_PHT.toString());
    const amountWeiBonus = pht2wei(PUBLIC_SALE_CONTRIBUTOR_ALLOCATION_BONUS_PHT.toString());

    const saleSupplyBefore = await instance.SALE_AVAILABLE_TOTAL_SUPPLY.call();
    const saleSupplyDistributedBefore = await instance.saleSupplyDistributed();
    const balanceBefore = toBN(await web3.eth.getBalance(PUBLIC_SALE_ACCOUNT));

    await instance.transferToPublicSale(PUBLIC_SALE_ACCOUNT, amountWeiBonus, { from: OWNER_ACCOUNT, value: amountWei });

    const saleSupplyAfter = await instance.SALE_AVAILABLE_TOTAL_SUPPLY.call();
    const saleSupplyDistributedAfter = await instance.saleSupplyDistributed();
    const balanceAfter = toBN(await web3.eth.getBalance(PUBLIC_SALE_ACCOUNT));

    assert.equal(saleSupplyAfter.toString(), saleSupplyBefore.sub(amountWei).toString());
    assert.equal(saleSupplyDistributedAfter.toString(), saleSupplyDistributedBefore.add(amountWei).toString());
    assert.equal(balanceAfter.toString(), balanceBefore.add(amountWei).toString());
  });

  it('Should travel 3 months + 15 days to test periods withdraws', async () => {
    assert.isFulfilled(timeTravel(30 * 3));
  });

});