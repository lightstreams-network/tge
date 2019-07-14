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
  AVAILABLE_SEED_CONTRIBUTORS_SUPPLY,
} = require('./globals').supplies;

const {
  SEED_CONTRIBUTORS_SUPPLY_ID,
} = require('./globals').supplyIds;

contract('Seed Contributor', (accounts) => {
  const OWNER_ACCOUNT = accounts[0];
  const SEED_CONTRIBUTOR_ACCOUNT = accounts[2];
  const SEED_CONTRIBUTOR_ACCOUNT_2 = accounts[3];
  const SEED_CONTRIBUTOR_ACCOUNT_3 = accounts[4];
  const OTHER_ACCOUNT = accounts[9];

  const SEED_CONTRIBUTOR_ALLOCATION_PHT = 500;

  it('Should travel 1 day in the future so the vesting periods can be scheduled', async () => {
    assert.isFulfilled(timeTravel(1));
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

    assert.equal(AVAILABLE_SEED_CONTRIBUTORS_SUPPLY, wei2pht(seedContributorSupplyBefore));
    assert.equal(seedContributorAllocation.toString(), amountWei.toString());
    assert.equal(seedContributorSupplyAfter.toString(), seedContributorSupplyBefore.sub(seedContributorAllocation).toString());
    assert.equal(projectSupplyDistributedAfter.toString(), projectSupplyDistributedBefore.add(amountWei).toString());
  });

  it('The seed contributor can release first vested amount', async () => {
    const instance = await Distribution.deployed();
    const expectedReleasable = '100';

    const vestingBefore = await instance.vestings(SEED_CONTRIBUTOR_ACCOUNT);
    const contributorBalanceBefore = toBN(await web3.eth.getBalance(SEED_CONTRIBUTOR_ACCOUNT));

    const tx = await instance.withdraw(SEED_CONTRIBUTOR_ACCOUNT, { from: SEED_CONTRIBUTOR_ACCOUNT });
    const txCost = await calculateGasCost(tx.receipt.gasUsed);

    const vestingAfter = await instance.vestings(SEED_CONTRIBUTOR_ACCOUNT);
    const contributorBalanceAfter = toBN(await web3.eth.getBalance(SEED_CONTRIBUTOR_ACCOUNT));

    assert.equal(contributorBalanceAfter.toString(), contributorBalanceBefore.add(pht2wei(expectedReleasable).sub(txCost)).toString());
    assert.equal(vestingAfter[VI.balanceInitial].toString(), vestingBefore[VI.balanceInitial].toString());
    assert.equal(vestingAfter[VI.balanceRemaining].toString(), vestingBefore[VI.balanceRemaining].sub(pht2wei(expectedReleasable)).toString());
    assert.equal(vestingAfter[VI.balanceClaimed].toString(), pht2wei(expectedReleasable).toString());
  });

  it('Should travel 2 months to test periods withdraws', async () => {
    assert.isFulfilled(timeTravel(30 * 2));
  });

  it('The seed contributor can release two more period of vested amount', async () => {
    const instance = await Distribution.deployed();
    const expectedReleasable = '200';

    const vestingBefore = await instance.vestings(SEED_CONTRIBUTOR_ACCOUNT);
    const contributorBalanceBefore = toBN(await web3.eth.getBalance(SEED_CONTRIBUTOR_ACCOUNT));

    const tx = await instance.withdraw(SEED_CONTRIBUTOR_ACCOUNT, { from: SEED_CONTRIBUTOR_ACCOUNT });
    const txCost = await calculateGasCost(tx.receipt.gasUsed);

    const vestingAfter = await instance.vestings(SEED_CONTRIBUTOR_ACCOUNT);
    const contributorBalanceAfter = toBN(await web3.eth.getBalance(SEED_CONTRIBUTOR_ACCOUNT));

    assert.equal(contributorBalanceAfter.toString(), contributorBalanceBefore.add(pht2wei(expectedReleasable).sub(txCost)).toString());
    assert.equal(vestingAfter[VI.balanceInitial].toString(), vestingBefore[VI.balanceInitial].toString());
    assert.equal(vestingAfter[VI.balanceRemaining].toString(), vestingBefore[VI.balanceRemaining].sub(pht2wei(expectedReleasable)).toString());
    assert.equal(vestingAfter[VI.balanceClaimed].toString(), pht2wei('300').toString());
  });

  it('Should travel 30 days to test next period withdraws', async () => {
    assert.isFulfilled(timeTravel(30));
  });

  it('Only owner updated beneficiary of a seed contributor vesting', async () => {
    const instance = await Distribution.deployed();
    return assert.isRejected(instance.updateVestingBeneficiary(SEED_CONTRIBUTOR_ACCOUNT, SEED_CONTRIBUTOR_ACCOUNT_2, { from: OTHER_ACCOUNT }));
  });

  it('The owner cannot use beneficiary with another vesting schedule to update of a seed contributor vesting', async () => {
    const instance = await Distribution.deployed();
    await instance.scheduleProjectVesting(OTHER_ACCOUNT, SEED_CONTRIBUTORS_SUPPLY_ID, {
      from: OWNER_ACCOUNT,
      value: pht2wei('1')
    });

    return assert.isRejected(instance.updateVestingBeneficiary(SEED_CONTRIBUTOR_ACCOUNT, OTHER_ACCOUNT, { from: OWNER_ACCOUNT }));
  });

  it('The owner cannot updated beneficiary of a seed contributor vesting after withdrawn', async () => {
    const instance = await Distribution.deployed();
    return assert.isRejected(instance.updateVestingBeneficiary(SEED_CONTRIBUTOR_ACCOUNT, SEED_CONTRIBUTOR_ACCOUNT_2, { from: OWNER_ACCOUNT }));
  });

  it('The owner can updated beneficiary of a seed contributor vesting', async () => {
    const instance = await Distribution.deployed();
    // Create a new vesting
    const amountWei = pht2wei(SEED_CONTRIBUTOR_ALLOCATION_PHT.toString());

    await instance.scheduleProjectVesting(SEED_CONTRIBUTOR_ACCOUNT_2, SEED_CONTRIBUTORS_SUPPLY_ID, {
      from: OWNER_ACCOUNT,
      value: amountWei
    });

    const vestingOrigContributorBefore = await instance.vestings(SEED_CONTRIBUTOR_ACCOUNT_2);
    const vestingDestContributor2Before = await instance.vestings(SEED_CONTRIBUTOR_ACCOUNT_3);

    assert.notEqual(vestingOrigContributorBefore[VI.startTimestamp].toString(), '0');
    assert.equal(vestingOrigContributorBefore[VI.balanceInitial].toString(), amountWei.toString());
    assert.equal(vestingDestContributor2Before[VI.startTimestamp].toString(), '0');

    await instance.updateVestingBeneficiary(SEED_CONTRIBUTOR_ACCOUNT_2, SEED_CONTRIBUTOR_ACCOUNT_3, { from: OWNER_ACCOUNT });

    const vestingOrigContributorAfter = await instance.vestings(SEED_CONTRIBUTOR_ACCOUNT_2);
    const vestingDestContributorAfter = await instance.vestings(SEED_CONTRIBUTOR_ACCOUNT_3);

    assert.equal(vestingOrigContributorAfter[VI.startTimestamp].toString(), '0');
    assert.notEqual(vestingDestContributorAfter[VI.startTimestamp].toString(), '0');
    assert.equal(vestingDestContributorAfter[VI.balanceInitial].toString(), amountWei.toString());
  });

  it('Should travel 60 days to test next period withdraws', async () => {
    assert.isFulfilled(timeTravel((30 * 2) + 15));
  });

  it('The seed contributor account can released remaining vested tokens', async () => {
    const instance = await Distribution.deployed();
    const expectedReleasable = '200';

    const contributorBalanceBefore = toBN(await web3.eth.getBalance(SEED_CONTRIBUTOR_ACCOUNT));

    const tx = await instance.withdraw(SEED_CONTRIBUTOR_ACCOUNT, { from: SEED_CONTRIBUTOR_ACCOUNT });
    const txCost = await calculateGasCost(tx.receipt.gasUsed);

    const vestingAfter = await instance.vestings(SEED_CONTRIBUTOR_ACCOUNT);
    const contributorBalanceAfter = toBN(await web3.eth.getBalance(SEED_CONTRIBUTOR_ACCOUNT));

    assert.equal(contributorBalanceAfter.sub(contributorBalanceBefore).toString(), pht2wei(expectedReleasable).sub(txCost).toString());
    assert.equal(vestingAfter[VI.balanceRemaining].toString(), '0');
    assert.equal(vestingAfter[VI.balanceClaimed].toString(), pht2wei(SEED_CONTRIBUTOR_ALLOCATION_PHT).toString());
  });

  it('The seed contributor account cannot released more tokens', async () => {
    const instance = await Distribution.deployed();
    return assert.isRejected(instance.withdraw(SEED_CONTRIBUTOR_ACCOUNT, { from: SEED_CONTRIBUTOR_ACCOUNT }));
  });

  it('The former seed contributor account cannot released vested tokens', async () => {
    const instance = await Distribution.deployed();
    return assert.isRejected(instance.withdraw(SEED_CONTRIBUTOR_ACCOUNT_2, { from: SEED_CONTRIBUTOR_ACCOUNT_2 }));
  });

  it('The new seed contributor account cannot released more tokens', async () => {
    const instance = await Distribution.deployed();
    const expectedReleasable = '300';

    const vestingBefore = await instance.vestings(SEED_CONTRIBUTOR_ACCOUNT_3);
    const contributorBalanceBefore = toBN(await web3.eth.getBalance(SEED_CONTRIBUTOR_ACCOUNT_3));

    const tx = await instance.withdraw(SEED_CONTRIBUTOR_ACCOUNT_3, { from: SEED_CONTRIBUTOR_ACCOUNT_3 });
    const txCost = await calculateGasCost(tx.receipt.gasUsed);

    const vestingAfter = await instance.vestings(SEED_CONTRIBUTOR_ACCOUNT_3);
    const contributorBalanceAfter = toBN(await web3.eth.getBalance(SEED_CONTRIBUTOR_ACCOUNT_3));

    assert.equal(contributorBalanceAfter.toString(), contributorBalanceBefore.add(pht2wei(expectedReleasable).sub(txCost)).toString());
    assert.equal(vestingAfter[VI.balanceInitial].toString(), vestingBefore[VI.balanceInitial].toString());
    assert.equal(vestingAfter[VI.balanceRemaining].toString(), vestingBefore[VI.balanceRemaining].sub(pht2wei(expectedReleasable)).toString());
    assert.equal(vestingAfter[VI.balanceClaimed].toString(), pht2wei(expectedReleasable).toString());
  });
});