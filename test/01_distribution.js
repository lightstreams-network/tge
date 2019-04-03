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
  AVAILABLE_TOTAL_SUPPLY,
  AVAILABLE_TEAM_SUPPLY,
  AVAILABLE_SEED_CONTRIBUTORS_SUPPLY,
  AVAILABLE_FOUNDERS_SUPPLY,
  AVAILABLE_ADVISORS_SUPPLY,
  AVAILABLE_CONSULTANTS_SUPPLY,
  AVAILABLE_OTHER_SUPPLY,
  SALE_AVAILABLE_TOTAL_SUPPLY
} = require('./globals').supplies;

const {
  TEAM_SUPPLY_ID,
  SEED_CONTRIBUTORS_SUPPLY_ID,
  FOUNDERS_SUPPLY_ID,
  ADVISORS_SUPPLY_ID,
  CONSULTANTS_SUPPLY_ID,
  OTHER_SUPPLY_ID,
} = require('./globals').supplyIds;

contract('Distribution', (accounts) => {
    const OWNER_ACCOUNT = accounts[0];
    const TEAM_MEMBER_ACCOUNT = accounts[1];
    const SEED_CONTRIBUTOR_ACCOUNT = accounts[2];
    const FOUNDER_ACCOUNT = accounts[3];
    const PRIVATE_SALE_ACCOUNT = accounts[4];
    const PUBLIC_SALE_ACCOUNT = accounts[5];
    const OTHER_ACCOUNT = accounts[6];
    const CONTRIBUTOR_1_ACCOUNT = accounts[7];
    const CONTRIBUTOR_2_ACCOUNT = accounts[8];
    const NEW_ACCOUNT = accounts[9];

  it('should deploy the Distribution contract and store the address', async ()=>{
    const instance = await Distribution.deployed();
    assert.isDefined(instance.address, 'Token address could not be stored');
  });

  it('Should travel 1 day in the future so the vesting periods can be scheduled', async () => {
    assert.isFulfilled(timeTravel(1));
  });

  it('Only owner can schedule new vesting', async ()=> {
    const instance = await Distribution.deployed();
    const PHT = web3.utils.toWei((100).toString(), 'ether');

    assert.isRejected(instance.scheduleProjectVesting(CONTRIBUTOR_1_ACCOUNT, TEAM_SUPPLY_ID, {from: CONTRIBUTOR_1_ACCOUNT, value: PHT}));
  });


  // it('The owner can create an allocation from the founders supply', async ()=> {
  //   const instance = await Distribution.deployed();
  //   const PHT = web3.utils.toWei('240', 'ether');
  //
  //   const founderAllocationDataBefore = await instance.vestings(FOUNDER_ACCOUNT);
  //
  //   const foundersSupplyBeforeBN = await instance.AVAILABLE_FOUNDERS_SUPPLY.call();
  //
  //   const scheduleProjectVestingTransaction = await instance.scheduleProjectVesting(FOUNDER_ACCOUNT, PHT, FOUNDERS_SUPPLY_ID);
  //   const founderAllocationData = await instance.vestings(FOUNDER_ACCOUNT);
  //
  //   const founderSupplyAfterBN = await instance.AVAILABLE_FOUNDERS_SUPPLY.call();
  //
  //   const founderAllocation = (founderAllocationData[4]);
  //
  //   const founderSupplyBefore = (foundersSupplyBeforeBN);
  //   const founderSupplyAfter = (founderSupplyAfterBN);
  //
  //   assert.equal(AVAILABLE_FOUNDERS_SUPPLY, founderSupplyBefore);
  //   assert.equal(founderAllocation, 240);
  //   assert.equal(founderSupplyBefore - founderAllocation, founderSupplyAfter);
  // });
  //
  // it('The owner can not create an allocation from the founders supply greater than the amount allocated to it', async ()=> {
  //   const instance = await Distribution.deployed();
  //   const PHT = web3.utils.toWei(AVAILABLE_FOUNDERS_SUPPLY + 100, 'ether');
  //
  //   return assert.isRejected(instance.scheduleProjectVesting(NEW_ACCOUNT, PHT, FOUNDERS_SUPPLY_ID));
  //
  // });
  //
  //
  // it('The owner can create an allocation from the advisors supply', async ()=> {
  //   const instance = await Distribution.deployed();
  //   const tokenInstance = await LightstreamsToken.deployed();
  //   const PHT = web3.utils.toWei('100', 'ether');
  //
  //   const advisorsSupplyBeforeBN = await instance.AVAILABLE_ADVISORS_SUPPLY.call();
  //
  //   const scheduleProjectVestingTransaction = await instance.scheduleProjectVesting(ADVISOR_ACCOUNT, PHT, ADVISORS_SUPPLY_ID);
  //   const advisorAllocationData = await instance.vestings(ADVISOR_ACCOUNT);
  //
  //   const advisorSupplyAfterBN = await instance.AVAILABLE_ADVISORS_SUPPLY.call();
  //
  //   const advisorAllocation = (advisorAllocationData[4]);
  //
  //   const advisorsSupplyBefore = (advisorsSupplyBeforeBN);
  //   const advisorsSupplyAfter = (advisorSupplyAfterBN);
  //
  //   const advisorAccountBalanceBN = await tokenInstance.balanceOf(ADVISOR_ACCOUNT);
  //   const advisorAccountBalance = (advisorAccountBalanceBN);
  //
  //   assert.equal(AVAILABLE_ADVISORS_SUPPLY, advisorsSupplyBefore, 'advisorsSupplyBefore');
  //   assert.equal(advisorAllocation, 100, 'advisorAllocation');
  //   assert.equal(advisorAccountBalance, 100, 'advisorAccountBalance');
  //   assert.equal(advisorsSupplyBefore - advisorAllocation, advisorsSupplyAfter, 'advisorsSupplyAfter');
  // });
  //
  // it('The owner can not create an allocation from the advisors supply greater than the amount allocated to it', async ()=> {
  //   const instance = await Distribution.deployed();
  //   const PHT = web3.utils.toWei(AVAILABLE_ADVISORS_SUPPLY + 1000, 'ether');
  //
  //   return assert.isRejected(instance.scheduleProjectVesting(NEW_ACCOUNT, PHT, ADVISORS_SUPPLY_ID));
  // });
  //
  // it('The owner can create an allocation from the consultants supply', async ()=> {
  //   const instance = await Distribution.deployed();
  //   const tokenInstance = await LightstreamsToken.deployed();
  //   const PHT = web3.utils.toWei('100', 'ether');
  //
  //   const consultantSupplyBeforeBN = await instance.AVAILABLE_CONSULTANTS_SUPPLY.call();
  //
  //   const scheduleProjectVestingTransaction = await instance.scheduleProjectVesting(CONSULTANT_ACCOUNT, PHT, CONSULTANTS_SUPPLY_ID);
  //   const consultantAllocationData = await instance.vestings(CONSULTANT_ACCOUNT);
  //
  //   const consultantSupplyAfterBN = await instance.AVAILABLE_CONSULTANTS_SUPPLY.call();
  //
  //   const consultantAllocation = (consultantAllocationData[4]);
  //
  //   const consultantSupplyBefore = (consultantSupplyBeforeBN);
  //   const consultantSupplyAfter = (consultantSupplyAfterBN);
  //
  //   const consultantAccountBalanceBN = await tokenInstance.balanceOf(CONSULTANT_ACCOUNT);
  //   const consultantAccountBalance = (consultantAccountBalanceBN);
  //
  //   assert.equal(AVAILABLE_CONSULTANTS_SUPPLY, consultantSupplyBefore, 'AVAILABLE_CONSULTANTS_SUPPLY');
  //   assert.equal(consultantAllocation, 100, 'consultantAllocation');
  //   assert.equal(consultantAccountBalance, 100, 'consultantAccountBalance');
  //   assert.equal(consultantSupplyBefore - consultantAllocation, consultantSupplyAfter, 'consultantSupplyAfter');
  // });
  //
  // it('The owner can not create an allocation from the consultants supply greater than the amount allocated to it', async ()=> {
  //   const instance = await Distribution.deployed();
  //   const PHT = web3.utils.toWei(AVAILABLE_CONSULTANTS_SUPPLY + 100, 'ether');
  //
  //   return assert.isRejected(instance.scheduleProjectVesting(NEW_ACCOUNT, PHT, CONSULTANTS_SUPPLY_ID));
  // });
  //
  // it('The owner can create an allocation from the others supply', async ()=> {
  //   const instance = await Distribution.deployed();
  //   const tokenInstance = await LightstreamsToken.deployed();
  //   const PHT = web3.utils.toWei('100', 'ether');
  //
  //   const otherSupplyBeforeBN = await instance.AVAILABLE_OTHER_SUPPLY.call();
  //
  //   const scheduleProjectVestingTransaction = await instance.scheduleProjectVesting(OTHER_ACCOUNT, PHT, OTHER_SUPPLY_ID);
  //   const otherAllocationData = await instance.vestings(OTHER_ACCOUNT);
  //
  //   const otherSupplyAfterBN = await instance.AVAILABLE_OTHER_SUPPLY.call();
  //
  //   const otherAllocation = (otherAllocationData[4]);
  //
  //   const otherSupplyBefore = (otherSupplyBeforeBN);
  //   const otherSupplyAfter = (otherSupplyAfterBN);
  //
  //   const otherAccountBalanceBN = await tokenInstance.balanceOf(OTHER_ACCOUNT);
  //   const otherAccountBalance = (otherAccountBalanceBN);
  //
  //   assert.equal(AVAILABLE_OTHER_SUPPLY, otherSupplyBefore, 'AVAILABLE_OTHER_SUPPLY');
  //   assert.equal(otherAllocation, 100, 'otherAllocation');
  //   assert.equal(otherAccountBalance, 100, 'otherAccountBalance');
  //   assert.equal(otherSupplyBefore - otherAllocation, otherSupplyAfter, 'otherSupplyAfter');
  // });
  //
  //
  // it('The owner can not create an allocation from the other supply greater than the amount allocated to it', async ()=> {
  //   const instance = await Distribution.deployed();
  //   const PHT = web3.utils.toWei(AVAILABLE_OTHER_SUPPLY + 1000, 'ether');
  //
  //   return assert.isRejected(instance.scheduleProjectVesting(NEW_ACCOUNT, PHT, CONSULTANTS_SUPPLY_ID));
  // });

  it('Should travel 3 months + 15 days to test periods withdraws', async () => {
    assert.isFulfilled(timeTravel(30 * 3 + 15));
  });

  // it('The founder can release their vested amount', async ()=> {
  //   const instance = await Distribution.deployed();
  //   const tokenInstance = await LightstreamsToken.deployed();
  //
  //   const allocationDataBefore = await instance.vestings(FOUNDER_ACCOUNT);
  //   const allocationBalanceBeforeRelease = (allocationDataBefore[ALLOCATION.balance]);
  //
  //   const released = await instance.release(FOUNDER_ACCOUNT, {from: FOUNDER_ACCOUNT});
  //
  //   const accountBalanceBN = await tokenInstance.balanceOf(FOUNDER_ACCOUNT);
  //   const accountBalance = (accountBalanceBN);
  //
  //   const allocationDataAfter = await instance.vestings(FOUNDER_ACCOUNT);
  //   const allocationBalanceAfterRelease = (allocationDataAfter[ALLOCATION.balance]);
  //   const balanceClaimedAfterRelease = (allocationDataAfter[ALLOCATION.balanceClaimed]);
  //
  //   // The founder allocation was originally 240 PTH if 3 months pass they
  //   // should be allowed to withdraw 30 PTH
  //   assert.equal(30, accountBalance, 'The founder\'s ballance in their account is wrong');
  //   assert.equal(30, balanceClaimedAfterRelease, 'The founder\'s ballance in their allocation after releasing is wrong');
  //   assert.equal(allocationBalanceBeforeRelease - accountBalance, allocationBalanceAfterRelease, 'The amount the contributor has in their account and allcation after is not matching');
  //
  // });

  it('Should travel 30 days to test next period withdraws', async () => {
    assert.isFulfilled(timeTravel(30));
  });

  // it('The team member can release all their vested funds when the vesting time is complete', async ()=> {
  //   const instance = await Distribution.deployed();
  //   const tokenInstance = await LightstreamsToken.deployed();
  //
  //   const allocationDataBefore = await instance.vestings(TEAM_MEMBER_ACCOUNT);
  //   const allocationBalanceBeforeRelease = (allocationDataBefore[6]);
  //   const teamMemeberAccountBalanceBeforeBN = await tokenInstance.balanceOf(TEAM_MEMBER_ACCOUNT);
  //   const teamMemeberAccountBalanceBefore = (teamMemeberAccountBalanceBeforeBN);
  //
  //   // TRAVEL FORWARD IN TIME 24 MONTHS
  //   const timeTravelTransaction = await timeTravel(3600 * 24 * 30 * 24); // Travel 24 months into the future for testing
  //   await mineBlock();
  //
  //   const released = await instance.release(TEAM_MEMBER_ACCOUNT, {from: TEAM_MEMBER_ACCOUNT});
  //
  //   const teamMemeberAccountBalanceAfterBN = await tokenInstance.balanceOf(TEAM_MEMBER_ACCOUNT);
  //   const teamMemeberAccountBalanceAfter = (teamMemeberAccountBalanceAfterBN);
  //
  //   const allocationDataAfter = await instance.vestings(TEAM_MEMBER_ACCOUNT);
  //   const allocationBalanceAfterRelease = (allocationDataAfter[ALLOCATION.balance]);
  //   const balanceClaimedAfterRelease = (allocationDataAfter[ALLOCATION.balanceClaimed]);
  //
  //   // team member allocation was originally 240 PTH
  //   assert.equal(teamMemeberAccountBalanceAfter, 240);
  //   assert.equal(balanceClaimedAfterRelease, 240);
  //   assert.equal(allocationBalanceAfterRelease, 0);
  //
  // });
  //
  // it('The founder can release all their vested funds when the vesting time is complete', async ()=> {
  //   const instance = await Distribution.deployed();
  //   const tokenInstance = await LightstreamsToken.deployed();
  //
  //   const allocationDataBefore = await instance.vestings(FOUNDER_ACCOUNT);
  //   const allocationBalanceBeforeRelease = (allocationDataBefore[6]);
  //   const accountBalanceBeforeBN = await tokenInstance.balanceOf(FOUNDER_ACCOUNT);
  //   const accountBalanceBefore = (accountBalanceBeforeBN);
  //
  //   const released = await instance.release(FOUNDER_ACCOUNT, {from: FOUNDER_ACCOUNT});
  //
  //   const accountBalanceAfterBN = await tokenInstance.balanceOf(FOUNDER_ACCOUNT);
  //   const accountBalanceAfter = (accountBalanceAfterBN);
  //
  //   const allocationDataAfter = await instance.vestings(FOUNDER_ACCOUNT);
  //   const allocationBalanceAfterRelease = (allocationDataAfter[ALLOCATION.balance]);
  //   const balanceClaimedAfterRelease = (allocationDataAfter[ALLOCATION.balanceClaimed]);
  //
  //   // team member allocation was originally 240 PTH
  //   assert.equal(accountBalanceAfter, 240);
  //   assert.equal(balanceClaimedAfterRelease, 240);
  //   assert.equal(allocationBalanceAfterRelease, 0);
  //
  // });
  //
  //
  // it('The only the owner can revoke a team member\'s vesting', async ()=> {
  //   const instance = await Distribution.deployed();
  //
  //   return assert.isRejected(instance.revokeAllocation(accounts[2], {from: accounts[3]}));
  // });
});