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

// Team Distribution Constants
const AVAILABLE_TOTAL_SUPPLY  =          135000000; // Initial amount minted and transfer to team distribution contract
const AVAILABLE_TEAM_SUPPLY   =           65424000; // 21.81% released over 24 months
const AVAILABLE_SEED_CONTRIBUTORS_SUPPLY =   36000000; // 12.00% released over 5 months
const AVAILABLE_FOUNDERS_SUPPLY   =       15000000; //  5.00% released over 24 months
const AVAILABLE_ADVISORS_SUPPLY   =         122100; //  0.04% released at Token Distribution (TD)
const AVAILABLE_CONSULTANTS_SUPPLY   =     1891300; //  0.63% released at Token Distribution (TD)
const AVAILABLE_OTHER_SUPPLY   =          16562600; //  5.52% released at Token Distribution (TD)

// Team Distribution Constants
const TEAM_SUPPLY_ID = 0;
const SEED_CONTRIBUTORS_SUPPLY_ID = 1;
const FOUNDERS_SUPPLY_ID = 2;
const ADVISORS_SUPPLY_ID = 3;
const CONSULTANTS_SUPPLY_ID = 4;
const OTHER_SUPPLY_ID = 5;

contract('Distribution', (accounts) => {
  const OWNER_ACCOUNT =         accounts[0];
  const TEAM_MEMBER_ACCOUNT =  accounts[1];
  const SEED_CONTRIBUTOR_ACCOUNT = accounts[2];
  const FOUNDER_ACCOUNT =       accounts[3];
  const ADVISOR_ACCOUNT =       accounts[4];
  const CONSULTANT_ACCOUNT =    accounts[5];
  const OTHER_ACCOUNT =         accounts[6];
  const CONTRIBUTOR_1_ACCOUNT = accounts[7];
  const CONTRIBUTOR_2_ACCOUNT = accounts[8];
  const NEW_ACCOUNT   =         accounts[9];

  it('should deploy the Team Distribution contract and store the address', async ()=>{
    const instance = await Distribution.deployed();

    assert.isDefined(instance.address, 'Token address could not be stored');
  });

  it('The owner can not create an allocation before allocation period starts as defined in 02_deploy_al.js', async () => {
    const instance = await Distribution.deployed();
    const amount = web3.utils.toWei('1', 'ether');

    assert.isRejected(instance.scheduleProjectVesting(TEAM_MEMBER_ACCOUNT, TEAM_SUPPLY_ID, {from: OWNER_ACCOUNT, value: amount}));
  });

  it('Should travel 1 day in the future so the vesting periods can be scheduled', async () => {
    assert.isFulfilled(timeTravel(1));
  });

  it('The owner can create an allocation from the team supply', async () => {
    const instance = await Distribution.deployed();
    const amountPHT = 240;
    const amount = web3.utils.toWei(amountPHT.toString(), 'ether');

    const teamSupplyBefore = await instance.AVAILABLE_TEAM_SUPPLY.call();
    await instance.scheduleProjectVesting(TEAM_MEMBER_ACCOUNT, TEAM_SUPPLY_ID, {from: OWNER_ACCOUNT, value: amount});
    const teamMemberAllocationData = await instance.vestings(TEAM_MEMBER_ACCOUNT);
    const teamSupplyAfter = await instance.AVAILABLE_TEAM_SUPPLY.call();
    const teamMemberAllocation = teamMemberAllocationData[VI.initialAmount];
    const totalAllocated = await instance.totalAllocated.call();

    assert.equal(AVAILABLE_TEAM_SUPPLY, wei2Ether(teamSupplyBefore));
    assert.equal(teamMemberAllocation.toString(), amount.toString());
    assert.equal(teamSupplyBefore.sub(teamMemberAllocation).toString(), teamSupplyAfter.toString());
    assert.equal(amountPHT, wei2Ether(totalAllocated));
  });

  it('The owner can not create an allocation from the team supply greater than the amount allocated to it', async ()=> {
    const instance = await Distribution.deployed();
    const PHT = web3.utils.toWei((AVAILABLE_TEAM_SUPPLY + 100).toString(), 'ether');

    assert.isRejected(instance.scheduleProjectVesting(SEED_CONTRIBUTOR_ACCOUNT, TEAM_SUPPLY_ID, {from: OWNER_ACCOUNT, value: PHT}));
  });

  it('Only the owner can create an allocation from the team supply', async ()=> {
    const instance = await Distribution.deployed();
    const PHT = web3.utils.toWei((AVAILABLE_TEAM_SUPPLY + 100).toString(), 'ether');

    return assert.isRejected(instance.scheduleProjectVesting(FOUNDER_ACCOUNT, TEAM_SUPPLY_ID, {from: SEED_CONTRIBUTOR_ACCOUNT, value: PHT}));
  });

  it('The owner can not create an allocation for an address that already has an allocation', async ()=> {
    const instance = await Distribution.deployed();
    const PHT = web3.utils.toWei((AVAILABLE_TEAM_SUPPLY + 100).toString(), 'ether');

    return assert.isRejected(instance.scheduleProjectVesting(TEAM_MEMBER_ACCOUNT, TEAM_SUPPLY_ID, {from: OWNER_ACCOUNT, value: PHT}));
  });

  it('The owner can create an allocation from the seed contributors supply', async ()=> {
    const instance = await Distribution.deployed();
    const wei = pht2wei('500');

    const seedContributorSupplyBefore = await instance.AVAILABLE_SEED_CONTRIBUTORS_SUPPLY.call();
    const totalAllocatedBefore = await instance.totalAllocated.call();
    await instance.scheduleProjectVesting(SEED_CONTRIBUTOR_ACCOUNT, SEED_CONTRIBUTORS_SUPPLY_ID, {from: OWNER_ACCOUNT, value: wei});
    const seedContributorAllocationData = await instance.vestings(SEED_CONTRIBUTOR_ACCOUNT);
    const seedContributorSupplyAfter = await instance.AVAILABLE_SEED_CONTRIBUTORS_SUPPLY.call();
    const totalAllocatedAfter = await instance.totalAllocated.call();
    const seedContributorAllocation = seedContributorAllocationData[VI.initialAmount];

    assert.equal(AVAILABLE_SEED_CONTRIBUTORS_SUPPLY, wei2Ether(seedContributorSupplyBefore));
    assert.equal(seedContributorAllocation.toString(), wei.toString());
    assert.equal(seedContributorSupplyBefore.sub(seedContributorAllocation).toString(), seedContributorSupplyAfter.toString());
    assert.equal(totalAllocatedBefore.add(wei).toString(), totalAllocatedAfter.toString());
  });

  // it('The owner can not create an allocation from the seed contributor supply greater than the amount allocated to it', async ()=> {
  //   const instance = await Distribution.deployed();
  //   const PHT = web3.utils.toWei(AVAILABLE_SEED_CONTRIBUTORS_SUPPLY + 100, 'ether');
  //
  //   return assert.isRejected(instance.scheduleProjectVesting(FOUNDER_ACCOUNT, PHT, SEED_CONTRIBUTORS_SUPPLY_ID));
  //
  // });
  //
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

  it('The team member can release their vested amount', async ()=> {
    const instance = await Distribution.deployed();

    await timeTravel(30 * 3); // Travel 3 months into the future for testing
    const vestingBefore = await instance.vestings(TEAM_MEMBER_ACCOUNT);
    const vestingBeforeInitialBalance = vestingBefore[VI.initialBalance];
    const memberBalanceBefore = toBN(await web3.eth.getBalance(TEAM_MEMBER_ACCOUNT));

    const tx = await instance.release(TEAM_MEMBER_ACCOUNT, {from: TEAM_MEMBER_ACCOUNT});
    const txCost = await calculateGasCost(tx.receipt.gasUsed);

    const vestingAfter = await instance.vestings(TEAM_MEMBER_ACCOUNT);
    const memberBalanceAfter = toBN(await web3.eth.getBalance(TEAM_MEMBER_ACCOUNT));

    // team member allocation was originally 240 if 3 months pass they
    // should be allowed to have 30 PHT in their wallet after a release
    assert.equal(memberBalanceAfter.toString(), memberBalanceBefore.add(pht2wei('30').sub(txCost)).toString());
    assert.equal(vestingAfter[VI.initialBalance].toString(), vestingBeforeInitialBalance.sub(pht2wei('30')).toString());
    assert.equal(vestingAfter[VI.initialAmountClaimed].toString(), pht2wei('30').toString());
  });

  // it('The seed contributor can release their vested amount', async ()=> {
  //   const instance = await Distribution.deployed();
  //   const tokenInstance = await LightstreamsToken.deployed();
  //
  //   const allocationDataBefore = await instance.vestings(SEED_CONTRIBUTOR_ACCOUNT);
  //   const allocationBalanceBeforeRelease = (allocationDataBefore[ALLOCATION.balance]);
  //
  //   const released = await instance.release(SEED_CONTRIBUTOR_ACCOUNT, {from: SEED_CONTRIBUTOR_ACCOUNT});
  //
  //   const accountBalanceBN = await tokenInstance.balanceOf(SEED_CONTRIBUTOR_ACCOUNT);
  //   const accountBalance = (accountBalanceBN);
  //
  //   const allocationDataAfter = await instance.vestings(SEED_CONTRIBUTOR_ACCOUNT);
  //   const allocationBalanceAfterRelease = (allocationDataAfter[ALLOCATION.balance]);
  //   const amountClaimedAfterRelease = (allocationDataAfter[ALLOCATION.amountClaimed]);
  //
  //   // seed contributor allocation was originally 500 PTH if 3 months pass they
  //   // should be allowed to withdraw 300 PTH
  //   assert.equal(300, accountBalance, 'The seed contributor\'s ballance in their account is wrong');
  //   assert.equal(300, amountClaimedAfterRelease, 'The seed contributor\'s ballance in their allocation after releasing is wrong');
  //   assert.equal(allocationBalanceBeforeRelease - accountBalance, allocationBalanceAfterRelease, 'The amount the contributor has in their account and allcation after is not matching');
  //
  // });
  //
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
  //   const amountClaimedAfterRelease = (allocationDataAfter[ALLOCATION.amountClaimed]);
  //
  //   // The founder allocation was originally 240 PTH if 3 months pass they
  //   // should be allowed to withdraw 30 PTH
  //   assert.equal(30, accountBalance, 'The founder\'s ballance in their account is wrong');
  //   assert.equal(30, amountClaimedAfterRelease, 'The founder\'s ballance in their allocation after releasing is wrong');
  //   assert.equal(allocationBalanceBeforeRelease - accountBalance, allocationBalanceAfterRelease, 'The amount the contributor has in their account and allcation after is not matching');
  //
  // });
  //
  // it('The someone other than the team member can not release the vested amount', async ()=> {
  //   const instance = await Distribution.deployed();
  //
  //   return assert.isRejected(instance.release(TEAM_MEMBER_ACCOUNT, {from: SEED_CONTRIBUTOR_ACCOUNT}));
  // });
  //
  // it('The the owner can revoke a seed contributor\'s vesting', async ()=> {
  //   const instance = await Distribution.deployed();
  //   const tokenInstance = await LightstreamsToken.deployed();
  //
  //   const timeTravelTransaction = await timeTravel(3600 * 24 * 30 * 1); // Travel 1 month into the future for testing
  //   await mineBlock();
  //
  //   // Get balances before revoking
  //   const otherBalanceBeforeBN = await instance.AVAILABLE_OTHER_SUPPLY.call();
  //   const allocationDataBefore = await instance.vestings(SEED_CONTRIBUTOR_ACCOUNT);
  //   // revoke vesting
  //   const revokeAllocation = await instance.revokeAllocation(SEED_CONTRIBUTOR_ACCOUNT);
  //   // Get balances after revoking
  //   const otherBalanceAfterBN = await instance.AVAILABLE_OTHER_SUPPLY.call();
  //   const allocationDataAfter = await instance.vestings(SEED_CONTRIBUTOR_ACCOUNT);
  //   const seedContributorBalanceBN = await tokenInstance.balanceOf(SEED_CONTRIBUTOR_ACCOUNT);
  //
  //   // convert from Big Number to an integer
  //   const otherBalanceBefore = (otherBalanceBeforeBN);
  //   const otherBalanceAfter = (otherBalanceAfterBN);
  //
  //   const allocationBalanceBefore = (allocationDataBefore[ALLOCATION.balance]);
  //   const amountClaimedBefore = (allocationDataBefore[ALLOCATION.amountClaimed]);
  //   const allocationBalanceAfter = (allocationDataAfter[ALLOCATION.balance]);
  //
  //   const amountClaimedAfter = (allocationDataAfter[ALLOCATION.amountClaimed]);
  //   const seedContributorBalance = (seedContributorBalanceBN);
  //   const addedToOtherBalance = allocationBalanceBefore + amountClaimedBefore - amountClaimedAfter;
  //
  //   assert.equal(amountClaimedAfter, 400);
  //   assert.equal(seedContributorBalance, 400);
  //   assert.equal(seedContributorBalance, amountClaimedAfter);
  //   assert.equal(allocationBalanceAfter, 0);
  //   assert.equal(otherBalanceBefore + addedToOtherBalance, otherBalanceAfter);
  // });
  //
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
  //   const amountClaimedAfterRelease = (allocationDataAfter[ALLOCATION.amountClaimed]);
  //
  //   // team member allocation was originally 240 PTH
  //   assert.equal(teamMemeberAccountBalanceAfter, 240);
  //   assert.equal(amountClaimedAfterRelease, 240);
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
  //   const amountClaimedAfterRelease = (allocationDataAfter[ALLOCATION.amountClaimed]);
  //
  //   // team member allocation was originally 240 PTH
  //   assert.equal(accountBalanceAfter, 240);
  //   assert.equal(amountClaimedAfterRelease, 240);
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