pragma solidity >=0.5.0 <0.7.0;

import './SafeMath.sol';
import './Ownable.sol';

/// @title Monthly vesting with bonus
contract Vesting is Ownable {
  using SafeMath for uint256;

  // The total amount of revoked tokens
  uint256 public revokedAmount = 0;

  struct VestingSchedule {
    uint256 startTimestamp; // timestamp of when vesting begins
    uint256 endTimestamp; // timestamp of when vesting ends
    uint256 lockPeriod; // amount of time in seconds between withdrawal periods. (EG. 6 months or 1 month)
    uint256 initialAmount; // the initial amount of tokens to be vested that does not include the amount given as a bonus. Will not change
    uint256 initialAmountClaimed; // amount the beneficiary has released and claimed from the initial amount
    uint256 initialBalance; // the initialAmount less the initialAmountClaimed. The remaining amount that can be vested
    uint256 initialBonus; // the initial amount of tokens given as a bonus. Will not change
    uint256 bonusClaimed; // amount the beneficiary has released and claimed from the initial bonus
    uint256 bonusBalance; // the initialBonus less the bonusClaimed. The remaining amount of the bonus that can be vested
    bool revocable; // whether the vesting is revocable or not
    bool revoked; // whether the vesting has been revoked or not
  }

  mapping (address => VestingSchedule) public vestings;

  /**
   * Event for when a new vesting schedule is created
   *
   * @param _beneficiary Address of contributor tokens minted and vested for
   * @param _totalPurchased number of token purchased or minted not including any bonus
   * @param _initialBonus the number of tokens given as a bonus when minting or received from early crowdsale participation
   */
  event NewVesting(address _beneficiary, uint256 _totalPurchased, uint256 _initialBonus);

  /**
   * Event for when the beneficiary releases vested tokens to their account/wallet
   * @param _recipient address beneficiary/recipient tokens released to
   * @param _amount the number of tokens release
   */
  event Released(address _recipient, uint256 _amount);

  /**
   * Event for when the owner revokes the vesting of a contributor releasing any vested tokens to the beneficiary,
   * and the remaining balance going to the contract to be distributed by the contact owner
   * @param _beneficiary address of beneficiary vesting is being cancelled for
   */
  event RevokedVesting(address _beneficiary);

  event LogInt(string _type, uint _uint);

  constructor() public {

  }

  /**
   * @dev Sets the vesting schedule for a beneficiary who either purchased tokens or had them minted
   * @param _beneficiary The recipient of the allocation
   * @param _totalPurchased The total amount of Lightstream purchased
   * @param _initialBonus The contributors bonus from purchasing
   */
  function setVestingSchedule(
    address _beneficiary,
    uint256 _totalPurchased,
    uint256 _initialBonus,
    uint256 startTimestamp,
    uint256 endTimestamp,
    uint256 lockPeriod,
    bool revocable) internal {
    require(vestings[_beneficiary].startTimestamp == 0);

    vestings[_beneficiary] = VestingSchedule(startTimestamp, endTimestamp, lockPeriod, _totalPurchased, 0, _totalPurchased, _initialBonus, 0, _initialBonus, revocable, false);

    emit NewVesting(_beneficiary, _totalPurchased, _initialBonus);
  }
  
  function updateVestingSchedule(address _beneficiary, uint256 _totalPurchased, uint256 _initialBonus,
    uint256 startTimestamp, uint256 endTimestamp, uint256 lockPeriod, bool revocable) public onlyOwner {
    VestingSchedule memory vestingSchedule = vestings[_beneficiary];
    require(vestingSchedule.startTimestamp != 0);
    require(vestingSchedule.initialAmount.sub(vestingSchedule.initialAmountClaimed) >= _totalPurchased);
    require(vestingSchedule.initialBonus.sub(vestingSchedule.bonusClaimed) >=  _initialBonus);
    
    uint256 totalPurchaseDifference = vestingSchedule.initialAmount.sub(vestingSchedule.initialAmountClaimed).sub(_totalPurchased);
    uint256 totalBonusDifference = vestingSchedule.initialBonus.sub(vestingSchedule.bonusClaimed).sub(_initialBonus);

    revokedAmount = revokedAmount.add(totalPurchaseDifference).add(totalBonusDifference);

    vestings[_beneficiary] = VestingSchedule(startTimestamp, endTimestamp, lockPeriod, _totalPurchased, 0, _totalPurchased, _initialBonus, 0, _initialBonus, revocable, false);

    emit NewVesting(_beneficiary, _totalPurchased, _initialBonus);
  }

  /**
   * @dev Allows the beneficiary of a vesting schedule to release vested tokens to their account/wallet
   * @param _beneficiary The address of the recipient of vested tokens
   */
  function release(address payable _beneficiary) public {
    require(vestings[_beneficiary].initialBalance > 0 || vestings[_beneficiary].bonusBalance > 0);
    require(msg.sender == _beneficiary);

    VestingSchedule memory vestingSchedule = vestings[_beneficiary];

    uint256 totalAmountVested = _calculateTotalAmountVested(_beneficiary, vestingSchedule.startTimestamp, vestingSchedule.endTimestamp, vestingSchedule.initialAmount);
    uint256 amountWithdrawable = totalAmountVested.sub(vestingSchedule.initialAmountClaimed);
    uint256 releasable = _withdrawalAllowed(amountWithdrawable,  vestingSchedule.startTimestamp, vestingSchedule.endTimestamp, vestingSchedule.lockPeriod, vestingSchedule.initialAmount);

    if (releasable > 0) {
      vestings[_beneficiary].initialAmountClaimed = vestingSchedule.initialAmountClaimed.add(releasable);
      vestings[_beneficiary].initialBalance = vestingSchedule.initialBalance.sub(releasable);

      _beneficiary.transfer(releasable);

      emit Released(_beneficiary, releasable);
    }

    if (now > vestingSchedule.endTimestamp && vestingSchedule.bonusBalance > 0) {
      uint256 withdrawableBonus = _calculateBonusWithdrawal(
        vestingSchedule.startTimestamp,
        vestingSchedule.endTimestamp,
        vestingSchedule.lockPeriod,
        vestingSchedule.initialAmount,
        vestingSchedule.bonusBalance);
  
      if (withdrawableBonus > 0) {
        emit LogInt('withdrawableBonus', withdrawableBonus);
    
        vestings[_beneficiary].bonusClaimed = vestingSchedule.bonusClaimed.add(withdrawableBonus);
        vestings[_beneficiary].bonusBalance = vestingSchedule.bonusBalance.sub(withdrawableBonus);

        _beneficiary.transfer(withdrawableBonus);
        emit Released(_beneficiary, withdrawableBonus);
      }
    }
  }

  /**
   * @dev Allows the to revoke the vesting schedule for a contributor with a vesting schedule
   * @param _beneficiary Address of contributor with a vesting schedule to be revoked
   */
  function revokeVesting(address payable _beneficiary) onlyOwner public {
    require(vestings[_beneficiary].revocable == true);

    VestingSchedule memory vestingSchedule = vestings[_beneficiary];

    uint256 totalAmountVested = _calculateTotalAmountVested(_beneficiary, vestingSchedule.startTimestamp, vestingSchedule.endTimestamp, vestingSchedule.initialAmount);
    uint256 amountWithdrawable = totalAmountVested.sub(vestingSchedule.initialAmountClaimed);

    uint256 refundable = _withdrawalAllowed(amountWithdrawable,  vestingSchedule.startTimestamp, vestingSchedule.endTimestamp, vestingSchedule.lockPeriod, vestingSchedule.initialAmount);
    uint256 refundableBonus = _calculateBonusWithdrawal(vestingSchedule.startTimestamp, vestingSchedule.endTimestamp, vestingSchedule.lockPeriod, vestingSchedule.initialAmount, vestingSchedule.bonusBalance);

    uint256 toProjectWalletFromInitialAmount = vestingSchedule.initialBalance.sub(refundable);
    uint256 toProjectWalletFromInitialBonus = vestingSchedule.initialBonus.sub(refundableBonus);
    uint256 backToProjectWallet = toProjectWalletFromInitialAmount.add(toProjectWalletFromInitialBonus);

    revokedAmount = revokedAmount.add(backToProjectWallet);

    vestings[_beneficiary].initialAmountClaimed = vestingSchedule.initialAmountClaimed.add(refundable);
    vestings[_beneficiary].initialBalance = 0;
    vestings[_beneficiary].bonusClaimed = vestingSchedule.bonusClaimed.add(refundableBonus);
    vestings[_beneficiary].bonusBalance = 0;
    vestings[_beneficiary].revoked = true;

    if (refundable > 0 || refundableBonus > 0) {
      uint256 totalRefundable = refundable.add(refundableBonus);
      _beneficiary.transfer(totalRefundable);

      emit Released(_beneficiary, totalRefundable);
    }

    emit RevokedVesting(_beneficiary);
  }

  /**
   * @dev Allows the owner to transfer any tokens that have been revoked to be transfered to another address
   * @param _recipient The address where the tokens should be sent
   * @param _amount Number of tokens to be transfer to recipient
   */
  function transferRevokedTokens(address payable _recipient, uint256 _amount) public onlyOwner {
    require(_amount <= revokedAmount);
    require(_recipient != address(0));
    revokedAmount = revokedAmount.sub(_amount);

    _recipient.transfer(_amount);
  }

  /**
   * @dev Calculates the total amount vested since the start time. If after the endTime
   * the entire initialBalance is returned
   */
  function _calculateTotalAmountVested(address _beneficiary, uint256 _startTimestamp, uint256 _endTimestamp, uint256 _initialAmount) internal view returns (uint256 _amountVested) {
    // If it's past the end time, the whole amount is available.
    if (now >= _endTimestamp) {
      return vestings[_beneficiary].initialAmount;
    }

    // get the amount of time that passed since the start of vesting
    uint256 durationSinceStart = SafeMath.sub(now, _startTimestamp);
    // Get the amount of time amount of time the vesting will happen over
    uint256 totalVestingTime = SafeMath.sub(_endTimestamp, _startTimestamp);
    // Calculate the amount vested as a ratio
    uint256 vestedAmount = SafeMath.div(
      SafeMath.mul(durationSinceStart, _initialAmount),
      totalVestingTime
    );

    return vestedAmount;
  }

  /**
   * @dev Calculates the amount releasable. If the amount is less than the allowable amount
   * for each lock period zero will be returned. If more than the allowable amount each month will return
   * a multiple of the allowable amount each month
   * @param _amountWithdrawable The total amount vested so far less the amount that has been released so far
   * @param _startTimestamp The start time of for when vesting started
   * @param _endTimestamp The end time of for when vesting will be complete and all tokens available
   * @param _lockPeriod time interval (ins econds) in between vesting releases (example 30 days = 2592000 seconds)
   * @param _initialAmount The starting number of tokens vested
   */
  function _withdrawalAllowed(uint256 _amountWithdrawable, uint256 _startTimestamp, uint256 _endTimestamp, uint256 _lockPeriod, uint256 _initialAmount) internal view returns(uint256 _amountReleasable) {
    // If it's past the end time, the whole amount is available.
    if (now >= _endTimestamp) {
      return _amountWithdrawable;
    }
    // calculate the number of time periods vesting is done over
    uint256 lockPeriods = (_endTimestamp.sub(_startTimestamp)).div(_lockPeriod);
    uint256 amountWithdrawablePerLockPeriod = SafeMath.div(_initialAmount, lockPeriods);

    // get the remainder and subtract it from the amount amount withdrawable to get a multiple of the
    // amount withdrawable per lock period
    uint256 remainder = SafeMath.mod(_amountWithdrawable, amountWithdrawablePerLockPeriod);
    uint256 amountReleasable = _amountWithdrawable.sub(remainder);

    if (now < _endTimestamp && amountReleasable >= amountWithdrawablePerLockPeriod) {
      return amountReleasable;
    }

    return 0;
  }

  /**
   * @dev Calculates the amount of the bonus that is releasable. If the amount is less than the allowable amount
   * for each lock period zero will be returned. It has been 30 days since the initial vesting has ended an amount
   * equal to the original releases will be returned.  If over 60 days the entire bonus can be released
   * @param _amountWithdrawable The total amount vested so far less the amount that has been released so far
   * @param _startTimestamp The start time of for when vesting started
   * @param _endTimestamp The end time of for when vesting will be complete and all tokens available
   * @param _lockPeriod time interval (ins seconds) in between vesting releases (example 30 days = 2592000 seconds)
   * @param _initialAmount The starting number of tokens vested
   * @param _bonusBalance The current balance of the vested bonus
   */

  function _calculateBonusWithdrawal(uint256 _startTimestamp, uint _endTimestamp, uint256 _lockPeriod, uint256 _initialAmount, uint256 _bonusBalance) internal view returns(uint256 _amountWithdrawable) {
    if (now >= _endTimestamp.add(30 days) && now < _endTimestamp.add(60 days)) {
      // calculate the number of time periods vesting is done over
      uint256 lockPeriods = (_endTimestamp.sub(_startTimestamp)).div(_lockPeriod);
      uint256 amountWithdrawablePerLockPeriod = SafeMath.div(_initialAmount, lockPeriods);
      
      if (_bonusBalance < amountWithdrawablePerLockPeriod) {
        return _bonusBalance;
      }
      
      return amountWithdrawablePerLockPeriod;
    } else if (now >= _endTimestamp.add(60 days)){
      return _bonusBalance;
    }

    return 0;
  }
}
