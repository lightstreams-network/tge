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
    uint256 balanceInitial; // the initial amount of tokens to be vested that does not include the amount given as a bonus. Will not change
    uint256 balanceClaimed; // amount the beneficiary has released and claimed from the initial amount
    uint256 balanceRemaining; // the balanceInitial less the balanceClaimed. The remaining amount that can be vested
    uint256 bonusInitial; // the initial amount of tokens given as a bonus. Will not change
    uint256 bonusClaimed; // amount the beneficiary has released and claimed from the initial bonus
    uint256 bonusRemaining; // the bonusInitial less the bonusClaimed. The remaining amount of the bonus that can be vested
    bool revocable; // whether the vesting is revocable or not
    bool revoked; // whether the vesting has been revoked or not
  }

  mapping (address => VestingSchedule) public vestings;

  /**
   * Event for when a new vesting schedule is created
   *
   * @param _beneficiary Address of contributor tokens minted and vested for
   * @param _amount Number of token purchased or minted not including any bonus
   * @param _bonus The number of tokens given as a bonus when minting or received from early crowdsale participation
   */
  event NewVesting(address _beneficiary, uint256 _amount, uint256 _bonus);

  /**
   * Event for when the beneficiary releases vested tokens to their account/wallet
   * @param _recipient address beneficiary/recipient tokens released to
   * @param _amount the number of tokens release
   */
  event Withdrawn(address _recipient, uint256 _amount);

  /**
   * Event for when the owner revokes the vesting of a contributor releasing any vested tokens to the beneficiary,
   * and the remaining balance going to the contract to be distributed by the contact owner
   * @param _beneficiary address of beneficiary vesting is being cancelled for
   */
  event RevokedVesting(address _beneficiary);

  /**
   * Event for when the owner updates the vesting of a contributor
   * @param _beneficiary address of beneficiary vesting is being update for
   * @param _newBeneficiary address of new beneficiary vesting is being update for
   */
  event UpdateVesting(address _beneficiary, address _newBeneficiary);

  event LogInt(string _type, uint _uint);

  constructor() public {
  }

  /**
   * @dev Sets the vesting schedule for a beneficiary who either purchased tokens or had them minted
   *
   * @param _beneficiary The recipient of the allocation
   * @param _amount The base allocation amount. Does NOT include the bonus
   * @param _bonus The bonus amount
   * @param _startTimestamp When vesting started
   * @param _endTimestamp When vesting will be complete and all tokens available
   * @param _lockPeriod Time interval, in seconds, between vesting releases (e.g every lock period set to 30 days = 2592000 seconds)
   * @param _revocable Whenever the vesting is revocable or not
   */
  function setVestingSchedule(
    address _beneficiary,
    uint256 _amount,
    uint256 _bonus,
    uint256 _startTimestamp,
    uint256 _endTimestamp,
    uint256 _lockPeriod,
    bool _revocable
  ) internal {
    require(vestings[_beneficiary].startTimestamp == 0);

    vestings[_beneficiary] = VestingSchedule(_startTimestamp, _endTimestamp, _lockPeriod, _amount, 0, _amount, _bonus, 0, _bonus, _revocable, false);

    emit NewVesting(_beneficiary, _amount, _bonus);
  }


  /**
   * @dev Allows the beneficiary of a vesting schedule to release vested tokens to their account/wallet
   *
   * @param _beneficiary The address of the recipient of vested tokens
   */
  function withdraw(address payable _beneficiary) public {
    require(msg.sender == _beneficiary);

    VestingSchedule memory vestingSchedule = vestings[_beneficiary];
    require(vestingSchedule.balanceRemaining > 0 || vestingSchedule.bonusRemaining > 0);

    uint256 releasable = _calculateBalanceWithdrawal(vestingSchedule.startTimestamp,
      vestingSchedule.endTimestamp,
      vestingSchedule.lockPeriod,
      vestingSchedule.balanceInitial,
      vestingSchedule.balanceRemaining,
      vestingSchedule.balanceClaimed);

    if (releasable > 0) {
      vestingSchedule.balanceClaimed = vestingSchedule.balanceClaimed.add(releasable);
      vestingSchedule.balanceRemaining = vestingSchedule.balanceRemaining.sub(releasable);

      _beneficiary.transfer(releasable);

      emit Withdrawn(_beneficiary, releasable);
    }

    if (now > vestingSchedule.endTimestamp && vestingSchedule.bonusRemaining > 0) {
      uint256 withdrawableBonus = _calculateBonusWithdrawal(
        vestingSchedule.startTimestamp,
        vestingSchedule.endTimestamp,
        vestingSchedule.lockPeriod,
        vestingSchedule.balanceInitial,
        vestingSchedule.bonusRemaining);
  
      if (withdrawableBonus > 0) {
        emit LogInt('withdrawableBonus', withdrawableBonus);

        vestingSchedule.bonusClaimed = vestingSchedule.bonusClaimed.add(withdrawableBonus);
        vestingSchedule.bonusRemaining = vestingSchedule.bonusRemaining.sub(withdrawableBonus);

        _beneficiary.transfer(withdrawableBonus);
        emit Withdrawn(_beneficiary, withdrawableBonus);
      }
    }
  }

  /**
   * @dev Allows the to revoke the vesting schedule for a contributor with a vesting schedule
   * @param _beneficiary Address of contributor with a vesting schedule to be revoked
   */
  function revokeVestingSchedule(address payable _beneficiary) onlyOwner internal{
    VestingSchedule memory vestingSchedule = vestings[_beneficiary];
    require(vestingSchedule.revocable == true);
    require(vestingSchedule.revoked == false);

    uint256 refundable = _calculateBalanceWithdrawal(
      vestingSchedule.startTimestamp,
      vestingSchedule.endTimestamp,
      vestingSchedule.lockPeriod,
      vestingSchedule.balanceInitial,
      vestingSchedule.balanceRemaining,
      vestingSchedule.balanceClaimed);

    uint256 refundableBonus = _calculateBonusWithdrawal(
      vestingSchedule.startTimestamp,
      vestingSchedule.endTimestamp,
      vestingSchedule.lockPeriod,
      vestingSchedule.balanceInitial,
      vestingSchedule.bonusRemaining);

    uint256 toProjectWalletFromBalanceInitial = vestingSchedule.balanceRemaining.sub(refundable);
    uint256 toProjectWalletFromBonusInitial = vestingSchedule.bonusInitial.sub(refundableBonus);
    uint256 revokedAmount = revokedAmount.add(toProjectWalletFromBalanceInitial).add(toProjectWalletFromBonusInitial);

    vestings[_beneficiary].balanceClaimed = vestingSchedule.balanceClaimed.add(refundable);
    vestings[_beneficiary].balanceRemaining = 0;
    vestings[_beneficiary].bonusClaimed = vestingSchedule.bonusClaimed.add(refundableBonus);
    vestings[_beneficiary].bonusRemaining = 0;
    vestings[_beneficiary].revoked = true;

    if (refundable > 0 || refundableBonus > 0) {
      uint256 totalRefundable = refundable.add(refundableBonus);
      _beneficiary.transfer(totalRefundable);

      emit Withdrawn(_beneficiary, totalRefundable);
    }

    emit RevokedVesting(_beneficiary);
  }

  /**
   * @dev Allow the owner of the contract to update the beneficiary of a vesting schedule
   *
   * @param _beneficiary The recipient of the vestingSchedule
   * @param _nextBeneficiary The new recipient of the vestingSchedule
   */
  function updateVestingSchedule(address _beneficiary, uint256 _nextBeneficiary) onlyOwner public {
    VestingSchedule memory vestingSchedule = vestings[_beneficiary];
    require(vestingSchedule.balanceRemaining > 0 || vestingSchedule.bonusRemaining > 0);
    require(vestingSchedule.balanceClaimed == 0);
    require(vestingSchedule.startTimestamp != 0);

    vestingSchedules[_nextBeneficiary] = vestingSchedule;
    vestingSchedules[_beneficiary] = VestingSchedule();

    emit UpdateVesting(_beneficiary, _nextBeneficiary);
  }

  /**
   * @dev Allows the owner to transfer any tokens that have been revoked to be transfered to another address
   * @param _recipient The address where the tokens should be sent
   * @param _amount Number of tokens to be transfer to recipient
   */
  function transferRevokedTokens(address _recipient, uint256 _amount) public onlyOwner {
    require(_amount <= revokedAmount);
    require(_recipient != address(0));
    revokedAmount = revokedAmount.sub(_amount);
    require(vestedToken.transfer(_recipient, _amount));
  }

  /**
   * @dev Calculates the total amount vested since the start time. If after the endTime
   * the entire balanceRemaining is returned
   */
  function _calculateTotalAmountVested(uint256 _startTimestamp, uint256 _endTimestamp, uint256 _balanceInitial) internal view returns (uint256 _amountVested) {
    // If it's past the end time, the whole amount is available.
    if (now >= _endTimestamp) {
      return _balanceInitial;
    }

    // get the amount of time that passed since the start of vesting
    uint256 durationSinceStart = SafeMath.sub(now, _startTimestamp);
    // Get the amount of time amount of time the vesting will happen over
    uint256 totalVestingTime = SafeMath.sub(_endTimestamp, _startTimestamp);
    // Calculate the amount vested as a ratio
    uint256 vestedAmount = SafeMath.div(
      SafeMath.mul(durationSinceStart, _balanceInitial),
      totalVestingTime
    );

    return vestedAmount;
  }

  /**
   * @dev Calculates the amount releasable. If the amount is less than the allowable amount
   * for each lock period zero will be returned. If more than the allowable amount each month will return
   * a multiple of the allowable amount each month
   * @param _startTimestamp The start time of for when vesting started
   * @param _endTimestamp The end time of for when vesting will be complete and all tokens available
   * @param _lockPeriod time interval (in seconds) in between vesting releases (example 30 days = 2592000 seconds)
   * @param _balanceInitial The starting number of tokens vested
   */
  function _calculateBalanceWithdrawal(uint256 _startTimestamp, uint256 _endTimestamp, uint256 _lockPeriod, uint256 _balanceInitial, uint256 _balanceRemaining, uint256 _balanceClaimed) internal view returns(uint256 _amountReleasable) {
    uint256 totalAmountVested = _calculateTotalAmountVested(_startTimestamp, _endTimestamp, _balanceInitial);
    uint256 amountWithdrawable = totalAmountVested.sub(_balanceClaimed);

    if (_balanceRemaining < amountWithdrawable) {
      return _balanceRemaining;
    }

    // If it's past the end time, the whole amount is available.
    if (now >= _endTimestamp) {
      return amountWithdrawable;
    }

    // calculate the number of time periods vesting is done over
    uint256 lockPeriods = (_endTimestamp.sub(_startTimestamp)).div(_lockPeriod);
    uint256 amountWithdrawablePerLockPeriod = SafeMath.div(_balanceInitial, lockPeriods);

    // get the remainder and subtract it from the amount amount withdrawable to get a multiple of the
    // amount withdrawable per lock period
    uint256 remainder = SafeMath.mod(amountWithdrawable, amountWithdrawablePerLockPeriod);
    uint256 amountReleasable = amountWithdrawable.sub(remainder);

    if (now < _endTimestamp && amountReleasable >= amountWithdrawablePerLockPeriod) {
      return amountReleasable;
    }

    return 0;
  }

  /**
   * @dev Calculates the amount of the bonus that is releasable. If the amount is less than the allowable amount
   * for each lock period zero will be returned. It has been 30 days since the initial vesting has ended an amount
   * equal to the original releases will be returned.  If over 60 days the entire bonus can be released
   * @param _startTimestamp The start time of for when vesting started
   * @param _endTimestamp The end time of for when vesting will be complete and all tokens available
   * @param _lockPeriod time interval (ins seconds) in between vesting releases (example 30 days = 2592000 seconds)
   * @param _balanceInitial The starting number of tokens vested
   * @param _bonusRemaining The current balance of the vested bonus
   */

  function _calculateBonusWithdrawal(uint256 _startTimestamp, uint _endTimestamp, uint256 _lockPeriod, uint256 _balanceInitial, uint256 _bonusRemaining) internal view returns(uint256 _amountWithdrawable) {
    if (now >= _endTimestamp.add(30 days) && now < _endTimestamp.add(60 days)) {
      // calculate the number of time periods vesting is done over
      uint256 lockPeriods = (_endTimestamp.sub(_startTimestamp)).div(_lockPeriod);
      uint256 amountWithdrawablePerLockPeriod = SafeMath.div(_balanceInitial, lockPeriods);
      
      if (_bonusRemaining < amountWithdrawablePerLockPeriod) {
        return _bonusRemaining;
      }
      
      return amountWithdrawablePerLockPeriod;
    } else if (now >= _endTimestamp.add(60 days)){
      return _bonusRemaining;
    }

    return 0;
  }
}
