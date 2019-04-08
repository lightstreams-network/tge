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
  const PUBLIC_SALE_ACCOUNT_LOST_PK = accounts[1];
  const PUBLIC_SALE_ACCOUNT_NEW = accounts[2];
  const PUBLIC_SALE_ACCOUNT = accounts[3];

  const FIRST_PUBLIC_SALE_CONTRIBUTOR_ALLOCATION_PHT = 100;
  const SECOND_PUBLIC_SALE_CONTRIBUTOR_ALLOCATION_PHT = 100;

  it('Should travel 1 day in the future so the vesting periods can be scheduled', async () => {
    assert.isFulfilled(timeTravel(1));
  });

  it('The owner can create distribute tokens to public sale contributor who lost his PK without vesting', async () => {
    const instance = await Distribution.deployed();
    const amountWei = pht2wei(FIRST_PUBLIC_SALE_CONTRIBUTOR_ALLOCATION_PHT.toString());

    const saleSupplyBefore = await instance.SALE_AVAILABLE_TOTAL_SUPPLY.call();
    const saleSupplyDistributedBefore = await instance.saleSupplyDistributed();
    const balanceDistributionSCBf = toBN(await web3.eth.getBalance(instance.address));
    const balanceBefore = toBN(await web3.eth.getBalance(PUBLIC_SALE_ACCOUNT_LOST_PK));
    const vestingBf = await instance.vestings(PUBLIC_SALE_ACCOUNT_LOST_PK);

    await instance.schedulePublicSaleVesting(
        PUBLIC_SALE_ACCOUNT_LOST_PK,
        {from: OWNER_ACCOUNT, value: amountWei}
    );

    const saleSupplyAfter = await instance.SALE_AVAILABLE_TOTAL_SUPPLY.call();
    const saleSupplyDistributedAfter = await instance.saleSupplyDistributed();
    const balanceAfter = toBN(await web3.eth.getBalance(PUBLIC_SALE_ACCOUNT_LOST_PK));
    const balanceDistributionSCAf = toBN(await web3.eth.getBalance(instance.address));
    const vestingAf = await instance.vestings(PUBLIC_SALE_ACCOUNT_LOST_PK);

    assert.equal(vestingBf[VI.balanceInitial].toString(), 0);
    assert.equal(vestingAf[VI.balanceInitial].toString(), amountWei.toString());
    assert.equal(balanceDistributionSCBf.toString(), 0);
    assert.equal(balanceDistributionSCAf.toString(), amountWei.toString());
    assert.equal(saleSupplyAfter.toString(), saleSupplyBefore.sub(amountWei).toString());
    assert.equal(saleSupplyDistributedAfter.toString(), saleSupplyDistributedBefore.add(amountWei).toString());
    assert.equal(balanceAfter.toString(), balanceBefore.toString());
  });

  it('The owner can create distribute tokens to public sale contributor without vesting', async () => {
    const instance = await Distribution.deployed();
    const amountWei = pht2wei(SECOND_PUBLIC_SALE_CONTRIBUTOR_ALLOCATION_PHT.toString());

    const saleSupplyBefore = await instance.SALE_AVAILABLE_TOTAL_SUPPLY.call();
    const saleSupplyDistributedBefore = await instance.saleSupplyDistributed();
    const balanceDistributionSCBf = toBN(await web3.eth.getBalance(instance.address));
    const balanceBefore = toBN(await web3.eth.getBalance(PUBLIC_SALE_ACCOUNT));
    const vestingBf = await instance.vestings(PUBLIC_SALE_ACCOUNT);

    await instance.schedulePublicSaleVesting(
        PUBLIC_SALE_ACCOUNT,
        {from: OWNER_ACCOUNT, value: amountWei}
    );

    const saleSupplyAfter = await instance.SALE_AVAILABLE_TOTAL_SUPPLY.call();
    const saleSupplyDistributedAfter = await instance.saleSupplyDistributed();
    const balanceAfter = toBN(await web3.eth.getBalance(PUBLIC_SALE_ACCOUNT));
    const balanceDistributionSCAf = toBN(await web3.eth.getBalance(instance.address));
    const vestingAf = await instance.vestings(PUBLIC_SALE_ACCOUNT);

    assert.equal(vestingBf[VI.balanceInitial].toString(), 0);
    assert.equal(vestingAf[VI.balanceInitial].toString(), amountWei.toString());
    assert.equal(balanceDistributionSCBf.toString(), pht2wei(FIRST_PUBLIC_SALE_CONTRIBUTOR_ALLOCATION_PHT).toString());
    assert.equal(balanceDistributionSCAf.toString(), balanceDistributionSCBf.add(pht2wei(SECOND_PUBLIC_SALE_CONTRIBUTOR_ALLOCATION_PHT)).toString());
    assert.equal(saleSupplyAfter.toString(), saleSupplyBefore.sub(amountWei).toString());
    assert.equal(saleSupplyDistributedAfter.toString(), saleSupplyDistributedBefore.add(amountWei).toString());
    assert.equal(balanceAfter.toString(), balanceBefore.toString());
  });

  it('The owner can update the beneficiary address in case of a lost PK before any withdraw has been made', async () => {
    const instance = await Distribution.deployed();

    await instance.updateVestingBeneficiary(PUBLIC_SALE_ACCOUNT_LOST_PK, PUBLIC_SALE_ACCOUNT_NEW, { from: OWNER_ACCOUNT });

    const vestingOrigAf = await instance.vestings(PUBLIC_SALE_ACCOUNT_LOST_PK);
    const vestingNewAf = await instance.vestings(PUBLIC_SALE_ACCOUNT_NEW);

    assert.equal(vestingOrigAf[VI.startTimestamp].toString(), '0');
    assert.equal(vestingOrigAf[VI.balanceInitial].toString(), '0');
    assert.equal(vestingOrigAf[VI.balanceRemaining].toString(), '0');

    assert.notEqual(vestingNewAf[VI.startTimestamp].toString(), '0');
    assert.equal(vestingNewAf[VI.balanceInitial].toString(), pht2wei(FIRST_PUBLIC_SALE_CONTRIBUTOR_ALLOCATION_PHT).toString());
  });

  it('The public sale contributor with new PK can release their full assigned amount right away without any vesting', async () => {
    const instance = await Distribution.deployed();
    const expectedReleasable = FIRST_PUBLIC_SALE_CONTRIBUTOR_ALLOCATION_PHT;
    const vestingBefore = await instance.vestings(PUBLIC_SALE_ACCOUNT_NEW);
    const contributorBalanceBefore = toBN(await web3.eth.getBalance(PUBLIC_SALE_ACCOUNT_NEW));

    const tx = await instance.withdraw(PUBLIC_SALE_ACCOUNT_NEW, { from: PUBLIC_SALE_ACCOUNT_NEW });
    const txCost = await calculateGasCost(tx.receipt.gasUsed);

    const vestingAfter = await instance.vestings(PUBLIC_SALE_ACCOUNT_NEW);
    const contributorBalanceAfter = toBN(await web3.eth.getBalance(PUBLIC_SALE_ACCOUNT_NEW));
    const balanceDistributionSCAf = toBN(await web3.eth.getBalance(instance.address));

    assert.equal(contributorBalanceAfter.toString(), contributorBalanceBefore.add(pht2wei(expectedReleasable).sub(txCost)).toString());
    assert.equal(balanceDistributionSCAf.toString(), pht2wei(SECOND_PUBLIC_SALE_CONTRIBUTOR_ALLOCATION_PHT).toString());
    assert.equal(vestingAfter[VI.balanceInitial].toString(), vestingBefore[VI.balanceInitial].toString());
    assert.equal(vestingAfter[VI.balanceRemaining].toString(), vestingBefore[VI.balanceRemaining].sub(pht2wei(expectedReleasable)).toString());
    assert.equal(vestingAfter[VI.balanceClaimed].toString(), pht2wei(expectedReleasable).toString());
  });

  it('The public sale contributor can release their full assigned amount right away without any vesting', async () => {
    const instance = await Distribution.deployed();
    const expectedReleasable = SECOND_PUBLIC_SALE_CONTRIBUTOR_ALLOCATION_PHT;
    const vestingBefore = await instance.vestings(PUBLIC_SALE_ACCOUNT);
    const contributorBalanceBefore = toBN(await web3.eth.getBalance(PUBLIC_SALE_ACCOUNT));

    const tx = await instance.withdraw(PUBLIC_SALE_ACCOUNT, { from: PUBLIC_SALE_ACCOUNT });
    const txCost = await calculateGasCost(tx.receipt.gasUsed);

    const vestingAfter = await instance.vestings(PUBLIC_SALE_ACCOUNT);
    const contributorBalanceAfter = toBN(await web3.eth.getBalance(PUBLIC_SALE_ACCOUNT));
    const balanceDistributionSCAf = toBN(await web3.eth.getBalance(instance.address));

    assert.equal(contributorBalanceAfter.toString(), contributorBalanceBefore.add(pht2wei(expectedReleasable).sub(txCost)).toString());
    assert.equal(balanceDistributionSCAf.toString(), 0);
    assert.equal(vestingAfter[VI.balanceInitial].toString(), vestingBefore[VI.balanceInitial].toString());
    assert.equal(vestingAfter[VI.balanceRemaining].toString(), vestingBefore[VI.balanceRemaining].sub(pht2wei(expectedReleasable)).toString());
    assert.equal(vestingAfter[VI.balanceClaimed].toString(), pht2wei(expectedReleasable).toString());
  });
});