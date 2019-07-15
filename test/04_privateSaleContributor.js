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
  const PRIVATE_SALE_ACCOUNT_3 = accounts[3];
  const OTHER_ACCOUNT = accounts[4];

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

  it('The owner cannot create an allocation for private contributor with more than 45% bonus', async () => {
    const instance = await Distribution.deployed();
    const exceedBonus = PRIVATE_SALE_CONTRIBUTOR_ALLOCATION_PHT * 0.36;
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

  it('The owner can create another allocation for private contributors from sale supply with vesting an with bonus', async () => {
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

  it('The owner cannot revoke a private contributor vesting', async () => {
    const instance = await Distribution.deployed();
    return assert.isRejected(instance.revokeVestingSchedule(PRIVATE_SALE_ACCOUNT, { from: OWNER_ACCOUNT }));
  });

  it('The owner cannot use beneficiary with another vesting schedule to update of a private contributor vesting', async () => {
    const instance = await Distribution.deployed();
    return assert.isRejected(instance.updateVestingBeneficiary(PRIVATE_SALE_ACCOUNT, PRIVATE_SALE_ACCOUNT_2, { from: OWNER_ACCOUNT }));
  });

  it('The private sale contributor can withdraw total vested amount', async () => {
    const instance = await Distribution.deployed();
    const expectedReleasable = (PRIVATE_SALE_CONTRIBUTOR_ALLOCATION_PHT).toString();
    const contributorBalanceBefore = toBN(await web3.eth.getBalance(PRIVATE_SALE_ACCOUNT));

    const tx = await instance.withdraw(PRIVATE_SALE_ACCOUNT, { from: PRIVATE_SALE_ACCOUNT });
    const txCost = await calculateGasCost(tx.receipt.gasUsed);

    const vestingAfter = await instance.vestings(PRIVATE_SALE_ACCOUNT);
    const contributorBalanceAfter = toBN(await web3.eth.getBalance(PRIVATE_SALE_ACCOUNT));

    assert.equal(vestingAfter[VI.balanceRemaining].toString(), '0');
    assert.equal(vestingAfter[VI.balanceClaimed].toString(), pht2wei(PRIVATE_SALE_CONTRIBUTOR_ALLOCATION_PHT).toString());
    assert.equal(vestingAfter[VI.bonusRemaining].toString(), '0');
    assert.equal(contributorBalanceAfter.toString(), contributorBalanceBefore.add(pht2wei(expectedReleasable).sub(txCost)).toString());
  });

  it('The private sale contributor is not authorized to release more tokens', async () => {
    const instance = await Distribution.deployed();
    return assert.isRejected(instance.withdraw(PRIVATE_SALE_ACCOUNT, { from: PRIVATE_SALE_ACCOUNT }));
  });

  it('Only the owner can update private contributor vesting beneficiary account', async () => {
    const instance = await Distribution.deployed();
    return assert.isRejected(instance.updateVestingBeneficiary(PRIVATE_SALE_ACCOUNT_2, PRIVATE_SALE_ACCOUNT_3, { from: OTHER_ACCOUNT }));
  });

  it('The owner can update private contributor vesting beneficiary account', async () => {
    const instance = await Distribution.deployed();
    await instance.updateVestingBeneficiary(PRIVATE_SALE_ACCOUNT_2, PRIVATE_SALE_ACCOUNT_3, { from: OWNER_ACCOUNT });
  });

  it('The second private sale contributor, with a new beneficiary address, can withdraw total vested amount, including bonus', async () => {
    const instance = await Distribution.deployed();
    const expectedReleasable = (PRIVATE_SALE_CONTRIBUTOR_ALLOCATION_PHT+PRIVATE_SALE_CONTRIBUTOR_ALLOCATION_BONUS_PHT).toString();
    const contributorBalanceBefore = toBN(await web3.eth.getBalance(PRIVATE_SALE_ACCOUNT_3));

    const tx = await instance.withdraw(PRIVATE_SALE_ACCOUNT_3, { from: PRIVATE_SALE_ACCOUNT_3 });
    const txCost = await calculateGasCost(tx.receipt.gasUsed);

    const vestingAfter = await instance.vestings(PRIVATE_SALE_ACCOUNT_3);
    const contributorBalanceAfter = toBN(await web3.eth.getBalance(PRIVATE_SALE_ACCOUNT_3));

    assert.equal(vestingAfter[VI.balanceRemaining].toString(), '0');
    assert.equal(vestingAfter[VI.balanceClaimed].toString(), pht2wei(PRIVATE_SALE_CONTRIBUTOR_ALLOCATION_PHT).toString());
    assert.equal(vestingAfter[VI.bonusRemaining].toString(), '0');
    assert.equal(vestingAfter[VI.bonusClaimed].toString(), pht2wei(PRIVATE_SALE_CONTRIBUTOR_ALLOCATION_BONUS_PHT).toString());
    assert.equal(contributorBalanceAfter.toString(), contributorBalanceBefore.add(pht2wei(expectedReleasable).sub(txCost)).toString());
  });

  it('The private sale contributor is not authorized to release more tokens', async () => {
    const instance = await Distribution.deployed();
    return assert.isRejected(instance.withdraw(PRIVATE_SALE_ACCOUNT_2, { from: PRIVATE_SALE_ACCOUNT_2 }));
  });
});