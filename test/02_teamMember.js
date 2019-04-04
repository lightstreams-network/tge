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
  AVAILABLE_TEAM_SUPPLY,
} = require('./globals').supplies;

const {
  TEAM_SUPPLY_ID,
} = require('./globals').supplyIds;

contract('Team', (accounts) => {
  const OWNER_ACCOUNT = accounts[0];
  const TEAM_MEMBER_ACCOUNT = accounts[1];
  const TEAM_MEMBER_ACCOUNT_2 = accounts[2];
  const FOUNDER_ACCOUNT = accounts[8];
  const OTHER_ACCOUNT = accounts[9];

  const TEAM_MEMBER_ALLOCATION_PHT = 240;

  it('Should travel 1 day in the future so the vesting periods can be scheduled', async () => {
    return assert.isFulfilled(timeTravel(1));
  });

  it('The owner can not create an allocation from the team supply greater than the amount allocated to it', async () => {
    const instance = await Distribution.deployed();
    const amountPHT = web3.utils.toWei((AVAILABLE_TEAM_SUPPLY + 100).toString(), 'ether');

    return assert.isRejected(instance.scheduleProjectVesting(OTHER_ACCOUNT, TEAM_SUPPLY_ID, {
      from: OWNER_ACCOUNT,
      value: amountPHT
    }));
  });

  it('The owner can create an allocation from the team supply', async () => {
    const instance = await Distribution.deployed();
    const amountPHT = TEAM_MEMBER_ALLOCATION_PHT.toString();
    const amountWei = web3.utils.toWei(amountPHT, 'ether');

    const teamSupplyBefore = await instance.AVAILABLE_TEAM_SUPPLY.call();
    await instance.scheduleProjectVesting(TEAM_MEMBER_ACCOUNT, TEAM_SUPPLY_ID, {
      from: OWNER_ACCOUNT,
      value: amountWei
    });
    const teamMemberAllocationData = await instance.vestings(TEAM_MEMBER_ACCOUNT);
    const teamSupplyAfter = await instance.AVAILABLE_TEAM_SUPPLY.call();
    const teamMemberAllocation = teamMemberAllocationData[VI.balanceInitial];
    const projectSupplyDistributed = await instance.projectSupplyDistributed();

    assert.equal(teamMemberAllocation.toString(), amountWei.toString());
    assert.equal(teamSupplyBefore.sub(teamMemberAllocation).toString(), teamSupplyAfter.toString());
    assert.equal(amountPHT, wei2pht(projectSupplyDistributed).toString());
  });


  it('Should travel 3 months to test periods withdraws', async () => {
    assert.isFulfilled(timeTravel(30 * 3));
  });

  it('Only beneficiary itself can release its vested amount', async () => {
    const instance = await Distribution.deployed();
    return assert.isRejected(instance.withdraw(TEAM_MEMBER_ACCOUNT, { from: OTHER_ACCOUNT }));
  });

  it('The team member can release their vested amount', async () => {
    const instance = await Distribution.deployed();

    const vestingBefore = await instance.vestings(TEAM_MEMBER_ACCOUNT);
    const memberBalanceBefore = toBN(await web3.eth.getBalance(TEAM_MEMBER_ACCOUNT));

    const tx = await instance.withdraw(TEAM_MEMBER_ACCOUNT, { from: TEAM_MEMBER_ACCOUNT });
    const txCost = await calculateGasCost(tx.receipt.gasUsed);

    const vestingAfter = await instance.vestings(TEAM_MEMBER_ACCOUNT);
    const memberBalanceAfter = toBN(await web3.eth.getBalance(TEAM_MEMBER_ACCOUNT));

    // Team member allocation was originally 240 if 3 months pass they
    // should be allowed to have 30 PHT in their wallet after a release
    assert.equal(memberBalanceAfter.toString(), memberBalanceBefore.add(pht2wei('30').sub(txCost)).toString());
    assert.equal(vestingAfter[VI.balanceInitial].toString(), vestingBefore[VI.balanceInitial].toString());
    assert.equal(vestingAfter[VI.balanceRemaining].toString(), vestingBefore[VI.balanceRemaining].sub(pht2wei('30')).toString());
    assert.equal(vestingAfter[VI.balanceClaimed].toString(), pht2wei('30').toString());
  });

  it('Should travel 30 days to test next period withdraws', async () => {
    assert.isFulfilled(timeTravel(30));
  });

  it('The owner can revoke a team member vesting', async () => {
    const instance = await Distribution.deployed();
    const expectedTeamMemberReleasable = 10;
    const expectedTeamMemberRevoked = 200;

    const revokedAmountBefore = await instance.revokedAmount.call();
    const teamMemberBalanceBefore = toBN(await web3.eth.getBalance(TEAM_MEMBER_ACCOUNT));
    const contractBalanceBefore = toBN(await web3.eth.getBalance(instance.address));

    await instance.revokeVestingSchedule(TEAM_MEMBER_ACCOUNT, { from: OWNER_ACCOUNT });

    const vestingAfter = await instance.vestings(TEAM_MEMBER_ACCOUNT);
    const teamMemberBalanceAfter = toBN(await web3.eth.getBalance(TEAM_MEMBER_ACCOUNT));
    let revokedAmountAfter = await instance.revokedAmount.call();
    let contractBalanceAfter = toBN(await web3.eth.getBalance(instance.address));

    // Team member withdrawn already 30 out of 240 tokens. Revoking his vesting 1 month later
    // means sending another 10 tokens to the team member and remaining 200 putting back to revokedAmount
    assert.equal(revokedAmountBefore, 0);

    assert.equal(revokedAmountAfter.toString(), pht2wei(expectedTeamMemberRevoked).toString());
    assert.equal(vestingAfter[VI.revoked], true);
    assert.equal(vestingAfter[VI.balanceRemaining], 0);
    assert.equal(vestingAfter[VI.bonusRemaining], 0);
    // assert.equal(vestingAf[VI.balanceClaimed].toString(), teamMemberBalanceAf.toString());

    assert.equal(teamMemberBalanceAfter.toString(), teamMemberBalanceBefore.add(pht2wei(expectedTeamMemberReleasable)).toString());
    assert.equal(contractBalanceAfter.toString(), contractBalanceBefore.sub(pht2wei(expectedTeamMemberReleasable)).toString());
    assert.equal(revokedAmountAfter.toString(), revokedAmountBefore.add(pht2wei(expectedTeamMemberRevoked)).toString());
  });

  it('The owner can transfer revoked tokens to any address', async () => {
    const instance = await Distribution.deployed();
    const revokedAmountBf = await instance.revokedAmount.call();
    const newAddressBalanceBf = toBN(await web3.eth.getBalance(OTHER_ACCOUNT));
    const contractBalanceBf = toBN(await web3.eth.getBalance(instance.address));

    await instance.transferRevokedTokens(OTHER_ACCOUNT, revokedAmountBf, { from: OWNER_ACCOUNT });

    const newAddressBalanceAf = toBN(await web3.eth.getBalance(OTHER_ACCOUNT));
    const contractBalanceAf = toBN(await web3.eth.getBalance(instance.address));
    const revokedAmountAf = await instance.revokedAmount.call();

    assert.equal(revokedAmountAf.toString(), pht2wei(0).toString());
    assert.equal(newAddressBalanceAf.toString(), newAddressBalanceBf.add(revokedAmountBf).toString());
    assert.equal(contractBalanceAf.toString(), contractBalanceBf.sub(revokedAmountBf).toString());
  });

  it('The owner can create another allocation from a new team member', async () => {
    const instance = await Distribution.deployed();
    const amountPHT = TEAM_MEMBER_ALLOCATION_PHT.toString();
    const amountWei = web3.utils.toWei(amountPHT, 'ether');

    await instance.scheduleProjectVesting(TEAM_MEMBER_ACCOUNT_2, TEAM_SUPPLY_ID, {
      from: OWNER_ACCOUNT,
      value: amountWei
    });
    const teamMemberAllocationData = await instance.vestings(TEAM_MEMBER_ACCOUNT_2);
    const teamMemberAllocation = teamMemberAllocationData[VI.balanceInitial];

    assert.equal(teamMemberAllocation.toString(), amountWei.toString());
  });

  it('Should travel 24 months to test next period withdraws', async () => {
    assert.isFulfilled(timeTravel(30 * 24));
  });

  it('The team member can release entire vested amount', async () => {
    const instance = await Distribution.deployed();

    const memberBalanceBefore = toBN(await web3.eth.getBalance(TEAM_MEMBER_ACCOUNT_2));

    const tx = await instance.withdraw(TEAM_MEMBER_ACCOUNT_2, { from: TEAM_MEMBER_ACCOUNT_2 });
    const txCost = await calculateGasCost(tx.receipt.gasUsed);

    const vestingAfter = await instance.vestings(TEAM_MEMBER_ACCOUNT_2);
    const memberBalanceAfter = toBN(await web3.eth.getBalance(TEAM_MEMBER_ACCOUNT_2));

    // Team member allocation was originally 240 if 3 months pass they
    // should be allowed to have 30 PHT in their wallet after a release
    assert.equal(vestingAfter[VI.balanceRemaining].toString(), '0');
    assert.equal(vestingAfter[VI.balanceClaimed].toString(), pht2wei(TEAM_MEMBER_ALLOCATION_PHT).toString());
    assert.equal(memberBalanceAfter.toString(), memberBalanceBefore.add(pht2wei(TEAM_MEMBER_ALLOCATION_PHT.toString())).sub(txCost).toString());
  });
});