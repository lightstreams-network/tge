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
  AVAILABLE_TEAM_SUPPLY,
} = require('./globals').supplies;

const {
  TEAM_SUPPLY_ID,
} = require('./globals').supplyIds;

contract('Team', (accounts) => {
  const OWNER_ACCOUNT = accounts[0];
  const TEAM_MEMBER_ACCOUNT = accounts[1];
  const FOUNDER_ACCOUNT = accounts[3];
  const OTHER_ACCOUNT = accounts[9];

  const TEAM_MEMBER_ALLOCATION_PHT = 240;

  it('The owner can not create an allocation before allocation distribution starts', async () => {
    const instance = await Distribution.deployed();
    const amount = web3.utils.toWei('1', 'ether');

    assert.isRejected(instance.scheduleProjectVesting(TEAM_MEMBER_ACCOUNT, TEAM_SUPPLY_ID, {
      from: OWNER_ACCOUNT,
      value: amount
    }));
  });

  it('Should travel 1 day in the future so the vesting periods can be scheduled', async () => {
    assert.isFulfilled(timeTravel(1));
  });

  it('The owner can not create an allocation from the team supply greater than the amount allocated to it', async () => {
    const instance = await Distribution.deployed();
    const amountPHT = web3.utils.toWei((AVAILABLE_TEAM_SUPPLY + 100).toString(), 'ether');

    assert.isRejected(instance.scheduleProjectVesting(OTHER_ACCOUNT, TEAM_SUPPLY_ID, {
      from: OWNER_ACCOUNT,
      value: amountPHT
    }));
  });

  it('Only the owner can create an allocation from the team supply', async () => {
    const instance = await Distribution.deployed();
    const amountPHT = web3.utils.toWei((AVAILABLE_TEAM_SUPPLY + 100).toString(), 'ether');

    return assert.isRejected(instance.scheduleProjectVesting(FOUNDER_ACCOUNT, TEAM_SUPPLY_ID, {
      from: OTHER_ACCOUNT,
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

    assert.equal(AVAILABLE_TEAM_SUPPLY, wei2Ether(teamSupplyBefore));
    assert.equal(teamMemberAllocation.toString(), amountWei.toString());
    assert.equal(teamSupplyBefore.sub(teamMemberAllocation).toString(), teamSupplyAfter.toString());
    assert.equal(amountPHT, wei2Ether(projectSupplyDistributed).toString());
  });

  it('The owner can not create an allocation for an address that already has an allocation', async () => {
    const instance = await Distribution.deployed();
    const amountPHT = web3.utils.toWei((AVAILABLE_TEAM_SUPPLY + 100).toString(), 'ether');

    return assert.isRejected(instance.scheduleProjectVesting(TEAM_MEMBER_ACCOUNT, TEAM_SUPPLY_ID, {
      from: OWNER_ACCOUNT,
      value: amountPHT
    }));
  });

  it('Should travel 3 months + 15 days to test periods withdraws', async () => {
    assert.isFulfilled(timeTravel(30 * 3));
  });

  it('Only beneficiary itself can release its vested amount', async () => {
    const instance = await Distribution.deployed();
    assert.isRejected(instance.withdraw(TEAM_MEMBER_ACCOUNT, { from: OTHER_ACCOUNT }));
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

    const revokedAmountBf = await instance.revokedAmount.call();
    const teamMemberBalanceBf = toBN(await web3.eth.getBalance(TEAM_MEMBER_ACCOUNT));
    const contractBalanceBf = toBN(await web3.eth.getBalance(instance.address));

    await instance.revokeVestingSchedule(TEAM_MEMBER_ACCOUNT, { from: OWNER_ACCOUNT });

    const vestingAf = await instance.vestings(TEAM_MEMBER_ACCOUNT);
    const teamMemberBalanceAf = toBN(await web3.eth.getBalance(TEAM_MEMBER_ACCOUNT));
    let revokedAmountAf = await instance.revokedAmount.call();
    let contractBalanceAf = toBN(await web3.eth.getBalance(instance.address));

    // Team member withdrawn already 30 out of 240 tokens. Revoking his vesting 1 month later
    // means sending another 10 tokens to the team member and remaining 200 putting back to revokedAmount
    assert.equal(revokedAmountBf, 0);

    assert.equal(revokedAmountAf.toString(), pht2wei(expectedTeamMemberRevoked).toString());
    assert.equal(vestingAf[VI.revoked], true);
    assert.equal(vestingAf[VI.balanceRemaining], 0);
    assert.equal(vestingAf[VI.bonusRemaining], 0);
    // assert.equal(vestingAf[VI.balanceClaimed].toString(), teamMemberBalanceAf.toString());

    assert.equal(teamMemberBalanceAf.toString(), teamMemberBalanceBf.add(pht2wei(expectedTeamMemberReleasable)).toString());
    assert.equal(contractBalanceAf.toString(), contractBalanceBf.sub(pht2wei(expectedTeamMemberReleasable)).toString());
    assert.equal(revokedAmountAf.toString(), revokedAmountBf.add(pht2wei(expectedTeamMemberRevoked)).toString());
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
});