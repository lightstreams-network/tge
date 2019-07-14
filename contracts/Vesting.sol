pragma solidity ^0.5.0;

import './utils/SafeMath.sol';
import './utils/Ownable.sol';

/// @title Monthly vesting with bonus
contract Vesting is Ownable {
  using SafeMath for uint256;

  // The total amount of revoked tokens
  uint256 public revokedAmount;

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

    uint256 balanceInitial = vestings[_beneficiary].balanceInitial;
    uint256 balanceClaimed = vestings[_beneficiary].balanceClaimed;
    uint256 balanceRemaining = vestings[_beneficiary].balanceRemaining;
    uint256 bonusInitial = vestings[_beneficiary].bonusInitial;
    uint256 bonusClaimed = vestings[_beneficiary].bonusClaimed;
    uint256 bonusRemaining = vestings[_beneficiary].bonusRemaining;

    balanceInitial = balanceInitial.add(_amount);
    balanceRemaining = balanceRemaining.add(_amount);
    bonusInitial = bonusInitial.add(_bonus);
    bonusRemaining = bonusRemaining.add(_bonus);

    vestings[_beneficiary] = VestingSchedule(_startTimestamp, _endTimestamp, _lockPeriod, balanceInitial, balanceClaimed, balanceRemaining, bonusInitial, bonusClaimed, bonusRemaining, _revocable, false);

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
    uint256 releasable;

    if (now >= vestingSchedule.startTimestamp && vestingSchedule.balanceRemaining > 0) {
      uint256 withdrawableAmount = _calculateBalanceWithdrawal(vestingSchedule.startTimestamp,
        vestingSchedule.endTimestamp,
        vestingSchedule.lockPeriod,
        vestingSchedule.balanceInitial,
        vestingSchedule.balanceRemaining,
        vestingSchedule.balanceClaimed);

      if (withdrawableAmount > 0) {
        emit LogInt('withdrawableAmount', withdrawableAmount);

        vestings[_beneficiary].balanceClaimed = vestingSchedule.balanceClaimed.add(withdrawableAmount);
        vestings[_beneficiary].balanceRemaining = vestingSchedule.balanceRemaining.sub(withdrawableAmount);
        releasable = releasable.add(withdrawableAmount);
      }
    }

    if (now >= vestingSchedule.endTimestamp && vestingSchedule.bonusRemaining > 0) {
      uint256 withdrawableBonus = _calculateBonusWithdrawal(
        vestingSchedule.startTimestamp,
        vestingSchedule.endTimestamp,
        vestingSchedule.lockPeriod,
        vestingSchedule.balanceInitial,
        vestingSchedule.bonusClaimed,
        vestingSchedule.bonusRemaining);
  
      if (withdrawableBonus > 0) {
        emit LogInt('withdrawableBonus', withdrawableBonus);

        vestings[_beneficiary].bonusClaimed = vestingSchedule.bonusClaimed.add(withdrawableBonus);
        vestings[_beneficiary].bonusRemaining = vestingSchedule.bonusRemaining.sub(withdrawableBonus);
        releasable = releasable.add(withdrawableBonus);
      }
    }

    if (releasable > 0) {
      _beneficiary.transfer(releasable);
      emit Withdrawn(_beneficiary, releasable);
    }
  }

  /**
   * @dev Allows the to revoke the vesting schedule for a contributor with a vesting schedule
   * @param _beneficiary Address of contributor with a vesting schedule to be revoked
   */
  function revokeVestingSchedule(address payable _beneficiary) onlyOwner public {
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
      vestingSchedule.bonusClaimed,
      vestingSchedule.bonusRemaining);

    uint256 toProjectWalletFromBalanceInitial = vestingSchedule.balanceRemaining.sub(refundable);
    uint256 toProjectWalletFromBonusInitial = vestingSchedule.bonusInitial.sub(refundableBonus);
    revokedAmount = revokedAmount.add(toProjectWalletFromBalanceInitial).add(toProjectWalletFromBonusInitial);

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
  function updateVestingBeneficiary(address _beneficiary, address _nextBeneficiary) onlyOwner public {
    VestingSchedule memory vestingSchedule = vestings[_beneficiary];
    require(vestingSchedule.balanceRemaining > 0 || vestingSchedule.bonusRemaining > 0);
    require(vestingSchedule.balanceClaimed == 0);
    require(vestingSchedule.startTimestamp != 0);
    require(vestings[_nextBeneficiary].startTimestamp == 0, 'can not overwrite existing vesting');
    require(vestings[_nextBeneficiary].balanceInitial == 0, 'can not overwrite existing vesting');

    vestings[_nextBeneficiary] = vestingSchedule;
    delete vestings[_beneficiary];

    emit UpdateVesting(_beneficiary, _nextBeneficiary);
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
   * @dev Calculates the amount releasable. If the amount is less than the allowable amount
   * for each lock period zero will be returned. If more than the allowable amount each month will return
   * a multiple of the allowable amount each month
   * @param _startTimestamp The start time of for when vesting started
   * @param _endTimestamp The end time of for when vesting will be complete and all tokens available
   * @param _lockPeriod time interval (in seconds) in between vesting releases (example 30 days = 2592000 seconds)
   * @param _balanceInitial The starting number of tokens vested
   */
  function _calculateBalanceWithdrawal(uint256 _startTimestamp, uint256 _endTimestamp, uint256 _lockPeriod, uint256 _balanceInitial, uint256 _balanceRemaining, uint256 _balanceClaimed) internal view returns(uint256 _amountReleasable) {
    uint256 totalAmountVested = _calculateTotalAmountVested(_startTimestamp, _endTimestamp, _lockPeriod, _balanceInitial);
    uint256 amountWithdrawable = totalAmountVested.sub(_balanceClaimed);

    // If it's past the end time, the whole amount is available.
    if (now >= _endTimestamp) {
      return _balanceRemaining;
    }

    if (_balanceRemaining <= amountWithdrawable) {
      return _balanceRemaining;
    }

    return amountWithdrawable;
  }

  /**
   * @dev Calculates the amount of the bonus that is releasable. If the amount is less than the allowable amount
   * for each lock period zero will be returned. It has been _lockPeriod days since the initial vesting has ended an amount
   * equal to the original releases will be returned.  If over _lockPeriod*2 days the entire bonus can be released
   * @param _startTimestamp The start time of for when vesting started
   * @param _endTimestamp The end time of for when vesting will be complete and all tokens available
   * @param _lockPeriod time interval (ins seconds) in between vesting releases (example 30 days = 2592000 seconds)
   * @param _balanceInitial The starting number of tokens vested
   * @param _bonusClaimed The amount of bonus already claimed
   * @param _bonusRemaining The current balance of the vested bonus
   */

  function _calculateBonusWithdrawal(uint256 _startTimestamp, uint _endTimestamp, uint256 _lockPeriod, uint256 _balanceInitial, uint256 _bonusClaimed, uint256 _bonusRemaining) internal view returns(uint256 _amountWithdrawable) {
    if (now >= _endTimestamp.add(_lockPeriod).add(_lockPeriod)) {
      return _bonusRemaining;
    } else if (now >= _endTimestamp.add(_lockPeriod)) {
      // calculate the number of time periods vesting is done over
      uint256 lockPeriods = (_endTimestamp.sub(_startTimestamp)).div(_lockPeriod).add(1);
      uint256 amountWithdrawablePerLockPeriod = SafeMath.div(_balanceInitial, lockPeriods);
      uint256 amountWithdrawable = amountWithdrawablePerLockPeriod.sub(_bonusClaimed);

      if (_bonusRemaining < amountWithdrawable) {
        return _bonusRemaining;
      }

      return amountWithdrawable;
    }

    return 0;
  }

  /**
   * @dev Calculates the total amount vested since the start time. If after the endTime
   * the entire balanceRemaining is returned
   */
  function _calculateTotalAmountVested(uint256 _startTimestamp, uint256 _endTimestamp, uint256 _lockPeriod, uint256 _balanceInitial) internal view returns (uint256 _amountVested) {
    // If it's past the end time, the whole amount is available.
    if (now >= _endTimestamp) {
      return _balanceInitial;
    }

    // calculate the number of time periods vesting is done over
    uint256 lockPeriods = (_endTimestamp.sub(_startTimestamp)).div(_lockPeriod).add(1);
    uint256 curPeriod = (now.sub(_startTimestamp)).div(_lockPeriod) + 1;
    uint256 amountWithdrawablePerLockPeriod = SafeMath.div(_balanceInitial, lockPeriods);

    uint256 vestedAmount = SafeMath.mul(amountWithdrawablePerLockPeriod, curPeriod);
    return vestedAmount;
  }
}
