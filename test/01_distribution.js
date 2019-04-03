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
const AVAILABLE_TOTAL_SUPPLY  =             135000000; // Initial amount minted and transfer to team distribution contract
const AVAILABLE_TEAM_SUPPLY   =              65424000; // 21.81% released over 24 months
const AVAILABLE_SEED_CONTRIBUTORS_SUPPLY =   36000000; // 12.00% released over 5 months
const AVAILABLE_FOUNDERS_SUPPLY   =          15000000; //  5.00% released over 24 months
const AVAILABLE_ADVISORS_SUPPLY   =            122100; //  0.04% released at Token Distribution (TD)
const AVAILABLE_CONSULTANTS_SUPPLY   =        1891300; //  0.63% released at Token Distribution (TD)
const AVAILABLE_OTHER_SUPPLY   =             16562600; //  5.52% released at Token Distribution (TD)
const SALE_AVAILABLE_TOTAL_SUPPLY     =     165000000;

// Team Distribution Constants
const TEAM_SUPPLY_ID = 0;
const SEED_CONTRIBUTORS_SUPPLY_ID = 1;
const FOUNDERS_SUPPLY_ID = 2;
const ADVISORS_SUPPLY_ID = 3;
const CONSULTANTS_SUPPLY_ID = 4;
const OTHER_SUPPLY_ID = 5;

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
    const teamMemberAllocation = teamMemberAllocationData[VI.balanceInitial];
    const projectSupplyDistributed = await instance.projectSupplyDistributed();

    assert.equal(AVAILABLE_TEAM_SUPPLY, wei2Ether(teamSupplyBefore));
    assert.equal(teamMemberAllocation.toString(), amount.toString());
    assert.equal(teamSupplyBefore.sub(teamMemberAllocation).toString(), teamSupplyAfter.toString());
    assert.equal(amountPHT.toString(), wei2Ether(projectSupplyDistributed).toString());
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

  it('The owner can not create an allocation from the seed contributor supply greater than the amount allocated to it', async ()=> {
      const instance = await Distribution.deployed();
      const PHT = web3.utils.toWei((AVAILABLE_SEED_CONTRIBUTORS_SUPPLY + 100).toString(), 'ether');

      return assert.isRejected(instance.scheduleProjectVesting(SEED_CONTRIBUTOR_ACCOUNT, SEED_CONTRIBUTORS_SUPPLY_ID, {from: OWNER_ACCOUNT, value: PHT}));
  });

  it('The owner can create an allocation from the seed contributors supply', async ()=> {
    const instance = await Distribution.deployed();
    const wei = pht2wei('500');

    const seedContributorSupplyBefore = await instance.AVAILABLE_SEED_CONTRIBUTORS_SUPPLY.call();
    const projectSupplyDistributedBefore = await instance.projectSupplyDistributed();

    await instance.scheduleProjectVesting(SEED_CONTRIBUTOR_ACCOUNT, SEED_CONTRIBUTORS_SUPPLY_ID, {from: OWNER_ACCOUNT, value: wei});

    const seedContributorAllocationData = await instance.vestings(SEED_CONTRIBUTOR_ACCOUNT);
    const seedContributorSupplyAfter = await instance.AVAILABLE_SEED_CONTRIBUTORS_SUPPLY.call();
    const projectSupplyDistributedAfter = await instance.projectSupplyDistributed();
    const seedContributorAllocation = seedContributorAllocationData[VI.balanceInitial];

    assert.equal(AVAILABLE_SEED_CONTRIBUTORS_SUPPLY, wei2Ether(seedContributorSupplyBefore));
    assert.equal(seedContributorAllocation.toString(), wei.toString());
    assert.equal(seedContributorSupplyAfter.toString(), seedContributorSupplyBefore.sub(seedContributorAllocation).toString());
    assert.equal(projectSupplyDistributedAfter.toString(), projectSupplyDistributedBefore.add(wei).toString());
  });

  it('The owner can create an allocation for private contributors from sale supply with vesting', async ()=> {
    const instance = await Distribution.deployed();
    const wei = pht2wei('500');

    const saleSupplyBefore = await instance.SALE_AVAILABLE_TOTAL_SUPPLY.call();
    const saleSupplyDistributedBefore = await instance.saleSupplyDistributed();

    await instance.schedulePrivateSaleVesting(PRIVATE_SALE_ACCOUNT, 0, {from: OWNER_ACCOUNT, value: wei});

    const contributorAllocationData = await instance.vestings(PRIVATE_SALE_ACCOUNT);
    const saleSupplyAfter = await instance.SALE_AVAILABLE_TOTAL_SUPPLY.call();
    const saleSupplyDistributedAfter = await instance.saleSupplyDistributed();
    const contributorAllocation = contributorAllocationData[VI.balanceInitial];

    assert.equal(SALE_AVAILABLE_TOTAL_SUPPLY, wei2Ether(saleSupplyBefore));
    assert.equal(contributorAllocation.toString(), wei.toString());
    assert.equal(saleSupplyAfter.toString(), saleSupplyBefore.sub(contributorAllocation).toString());
    assert.equal(saleSupplyDistributedAfter.toString(), saleSupplyDistributedBefore.add(wei).toString());
  });

  it('The owner can create distribute tokens to public sale contributors directly without vesting including the bonus', async ()=> {
    const instance = await Distribution.deployed();
    const pht = pht2wei('11');
    const phtBonus = pht2wei('1');

    const saleSupplyBefore = await instance.SALE_AVAILABLE_TOTAL_SUPPLY.call();
    const saleSupplyDistributedBefore = await instance.saleSupplyDistributed();
    const balanceBefore = toBN(await web3.eth.getBalance(PUBLIC_SALE_ACCOUNT));

    await instance.transferToPublicSale(PUBLIC_SALE_ACCOUNT, phtBonus, {from: OWNER_ACCOUNT, value: pht});

    const saleSupplyAfter = await instance.SALE_AVAILABLE_TOTAL_SUPPLY.call();
    const saleSupplyDistributedAfter = await instance.saleSupplyDistributed();
    const balanceAfter = toBN(await web3.eth.getBalance(PUBLIC_SALE_ACCOUNT));

    assert.equal(saleSupplyAfter.toString(), saleSupplyBefore.sub(pht).toString());
    assert.equal(saleSupplyDistributedAfter.toString(), saleSupplyDistributedBefore.add(pht).toString());
    assert.equal(balanceAfter.toString(), balanceBefore.add(pht).toString());
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

  it('The team member can release their vested amount', async ()=> {
    const instance = await Distribution.deployed();

    await timeTravel(30 * 3 + 15); // 3 months + 15 days (to test periods with mod)
    const vestingBefore = await instance.vestings(TEAM_MEMBER_ACCOUNT);
    const memberBalanceBefore = toBN(await web3.eth.getBalance(TEAM_MEMBER_ACCOUNT));

    const tx = await instance.withdraw(TEAM_MEMBER_ACCOUNT, {from: TEAM_MEMBER_ACCOUNT});
    const txCost = await calculateGasCost(tx.receipt.gasUsed);

    const vestingAfter = await instance.vestings(TEAM_MEMBER_ACCOUNT);
    const memberBalanceAfter = toBN(await web3.eth.getBalance(TEAM_MEMBER_ACCOUNT));

    // team member allocation was originally 240 if 3 months pass they
    // should be allowed to have 30 PHT in their wallet after a release
    assert.equal(memberBalanceAfter.toString(), memberBalanceBefore.add(pht2wei('30').sub(txCost)).toString());
    assert.equal(vestingAfter[VI.balanceInitial].toString(), vestingBefore[VI.balanceInitial].toString());
    assert.equal(vestingAfter[VI.balanceRemaining].toString(), vestingBefore[VI.balanceRemaining].sub(pht2wei('30')).toString());
    assert.equal(vestingAfter[VI.balanceClaimed].toString(), pht2wei('30').toString());
  });

  it('The seed contributor can release their vested amount', async ()=> {
    const instance = await Distribution.deployed();

    const vestingBefore = await instance.vestings(SEED_CONTRIBUTOR_ACCOUNT);
    const contributorBalanceBefore = toBN(await web3.eth.getBalance(SEED_CONTRIBUTOR_ACCOUNT));

    const tx = await instance.withdraw(SEED_CONTRIBUTOR_ACCOUNT, {from: SEED_CONTRIBUTOR_ACCOUNT});
    const txCost = await calculateGasCost(tx.receipt.gasUsed);

    const vestingAfter = await instance.vestings(SEED_CONTRIBUTOR_ACCOUNT);
    const contributorBalanceAfter = toBN(await web3.eth.getBalance(SEED_CONTRIBUTOR_ACCOUNT));

    // seed contributor allocation was originally 500 PTH if 3 months pass they
    // should be allowed to withdraw 300 PTH
    assert.equal(contributorBalanceAfter.toString(), contributorBalanceBefore.add(pht2wei('300').sub(txCost)).toString());
    assert.equal(vestingAfter[VI.balanceInitial].toString(), vestingBefore[VI.balanceInitial].toString());
    assert.equal(vestingAfter[VI.balanceRemaining].toString(), vestingBefore[VI.balanceRemaining].sub(pht2wei('300')).toString());
    assert.equal(vestingAfter[VI.balanceClaimed].toString(), pht2wei('300').toString());
  });

  it('The private sale contributor can release their vested amount', async ()=> {
    const instance = await Distribution.deployed();

    const vestingBefore = await instance.vestings(PRIVATE_SALE_ACCOUNT);
    const contributorBalanceBefore = toBN(await web3.eth.getBalance(PRIVATE_SALE_ACCOUNT));

    const tx = await instance.withdraw(PRIVATE_SALE_ACCOUNT, {from: PRIVATE_SALE_ACCOUNT});
    const txCost = await calculateGasCost(tx.receipt.gasUsed);

    const vestingAfter = await instance.vestings(PRIVATE_SALE_ACCOUNT);
    const contributorBalanceAfter = toBN(await web3.eth.getBalance(PRIVATE_SALE_ACCOUNT));

    // seed contributor allocation was originally 500 PTH if 3 months pass they
    // should be allowed to withdraw 300 PTH
    assert.equal(contributorBalanceAfter.toString(), contributorBalanceBefore.add(pht2wei('300').sub(txCost)).toString());
    assert.equal(vestingAfter[VI.balanceInitial].toString(), vestingBefore[VI.balanceInitial].toString());
    assert.equal(vestingAfter[VI.balanceRemaining].toString(), vestingBefore[VI.balanceRemaining].sub(pht2wei('300')).toString());
    assert.equal(vestingAfter[VI.balanceClaimed].toString(), pht2wei('300').toString());
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

  it('Only beneficiary itself can release its vested amount', async ()=> {
    const instance = await Distribution.deployed();

    assert.isRejected(instance.withdraw(TEAM_MEMBER_ACCOUNT, {from: SEED_CONTRIBUTOR_ACCOUNT}));
  });

  it('The owner can revoke a seed contributor vesting', async ()=> {
    const instance = await Distribution.deployed();

    await timeTravel(30);

    const revokedAmountBf = await instance.revokedAmount.call();
    const otherSupplyBf = await instance.AVAILABLE_OTHER_SUPPLY.call();
    const projectSupplyBf = await instance.PROJECT_AVAILABLE_TOTAL_SUPPLY.call();
    const vestingBf = await instance.vestings(SEED_CONTRIBUTOR_ACCOUNT);
    const contributorBalanceBf = toBN(await web3.eth.getBalance(SEED_CONTRIBUTOR_ACCOUNT));
    const newAddressBalanceBf = toBN(await web3.eth.getBalance(NEW_ACCOUNT));
    const contractBalanceBf = toBN(await web3.eth.getBalance(instance.address));

    await instance.revokeVestingSchedule(SEED_CONTRIBUTOR_ACCOUNT, {from: OWNER_ACCOUNT});

    const otherSupplyAf = await instance.AVAILABLE_OTHER_SUPPLY.call();
    const projectSupplyAf = await instance.PROJECT_AVAILABLE_TOTAL_SUPPLY.call();
    const vestingAf = await instance.vestings(SEED_CONTRIBUTOR_ACCOUNT);
    const contributorBalanceAf = toBN(await web3.eth.getBalance(SEED_CONTRIBUTOR_ACCOUNT));
    let   revokedAmountAf = await instance.revokedAmount.call();
    let   contractBalanceAf = toBN(await web3.eth.getBalance(instance.address));

    // Seed contributor withdrawn already 300 out of 500 tokens. Revoking his vesting 1 month later
    // means sending another 100 tokens his way and remaining 100 putting back to the OTHER_SUPPLY
    assert.equal(revokedAmountBf, 0);
    assert.equal(revokedAmountAf.toString(), pht2wei(100).toString());
    assert.equal(vestingBf[VI.balanceClaimed].toString(), pht2wei(300).toString());
    assert.equal(vestingAf[VI.balanceClaimed].toString(), pht2wei(400).toString());
    assert.equal(vestingBf[VI.balanceInitial].toString(), vestingAf[VI.balanceInitial].toString());
    assert.equal(vestingAf[VI.revoked], true);
    assert.equal(vestingAf[VI.balanceRemaining], 0);
    assert.equal(vestingAf[VI.bonusRemaining], 0);
    assert.equal(contributorBalanceAf.toString(), contributorBalanceBf.add(pht2wei(100)).toString());
    assert.equal(otherSupplyAf.toString(), otherSupplyBf.add(pht2wei(100)).toString());
    assert.equal(projectSupplyAf.toString(), projectSupplyBf.add(pht2wei(100)).toString());
    assert.equal(contractBalanceAf.toString(), contractBalanceBf.sub(pht2wei(100)).toString());

    // We can now transfer e.g 50 tokens to any address out of 100 revoked, available in contract
    await instance.transferRevokedTokens(NEW_ACCOUNT, pht2wei(50), {from: OWNER_ACCOUNT});

    const newAddressBalanceAf = toBN(await web3.eth.getBalance(NEW_ACCOUNT));
    const finalContractBalance = toBN(await web3.eth.getBalance(instance.address));
    revokedAmountAf = await instance.revokedAmount.call();

    assert.equal(revokedAmountAf.toString(), pht2wei(50).toString());
    assert.equal(newAddressBalanceAf.toString(), newAddressBalanceBf.add(pht2wei(50)).toString());
    assert.equal(finalContractBalance.toString(), contractBalanceAf.sub(pht2wei(50)).toString());
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