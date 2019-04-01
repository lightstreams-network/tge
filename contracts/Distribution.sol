pragma solidity >=0.5.0 <0.7.0;

import './Vesting.sol';
import './SafeMath.sol';
import "./Ownable.sol";

contract Distribution is Ownable, Vesting {
  using SafeMath for uint256;

  uint256 private constant decimalFactor = 10 ** uint256(18);
  enum AllocationType {TEAM, SEED_CONTRIBUTORS, FOUNDERS, ADVISORS, CONSULTANTS, OTHER}

  uint256 public INITIAL_SUPPLY = 135000000 * decimalFactor;
  uint256 public AVAILABLE_TOTAL_SUPPLY = INITIAL_SUPPLY;
  uint256 public AVAILABLE_TEAM_SUPPLY = 65424000 * decimalFactor; // 21.81% released over 24 months
  uint256 public AVAILABLE_SEED_CONTRIBUTORS_SUPPLY = 36000000 * decimalFactor; // 12.00% released over 5 months
  uint256 public AVAILABLE_FOUNDERS_SUPPLY = 15000000 * decimalFactor; //  5.00% released over 24 months
  uint256 public AVAILABLE_ADVISORS_SUPPLY = 122100 * decimalFactor; //  0.04% released at Token Distribution (TD)
  uint256 public AVAILABLE_CONSULTANTS_SUPPLY = 1891300 * decimalFactor; //  0.63% released at Token Distribution (TD)
  uint256 public AVAILABLE_OTHER_SUPPLY = 16562600 * decimalFactor; //  5.52% released at Token Distribution (TD)

  uint256 public openingTime;

  /**
   * @param _openingTime The time when Lightstreams Tokens Distribution goes live
   */
  constructor(uint256 _openingTime) Ownable() public {
    // make sure the start time is in the future
    require(_openingTime >= now);
    // require that the total of the different pools is equal to the total supply
    require(AVAILABLE_TOTAL_SUPPLY == AVAILABLE_TEAM_SUPPLY.add(AVAILABLE_SEED_CONTRIBUTORS_SUPPLY).add(AVAILABLE_FOUNDERS_SUPPLY).add(AVAILABLE_ADVISORS_SUPPLY).add(AVAILABLE_CONSULTANTS_SUPPLY).add(AVAILABLE_OTHER_SUPPLY));

    openingTime = _openingTime;
  }

  /**
   * @notice Allow the owner of the contract to assign a new allocation.
   *
   * @param _beneficiary The recipient of the allocation
   * @param _supply The total supply the allocation will be taken from
   */
  function scheduleProjectVesting(address payable _beneficiary, AllocationType _supply) onlyOwner public payable {
    uint _amount = msg.value;

    // check to make sure the recipients address current allocation is zero and that the amount being allocated is greater than zero
    require(_amount > 0, 'no enough tokens sent to allocate to beneficiary');
    // check to make sure the address exists so tokens don't get burnt
    require(_beneficiary != address(0), 'no address');

    if (_supply == AllocationType.TEAM) {
      _validateScheduleVesting(_beneficiary, _amount, AVAILABLE_TEAM_SUPPLY);
      AVAILABLE_TEAM_SUPPLY = AVAILABLE_TEAM_SUPPLY.sub(_amount);
      setVestingSchedule(_beneficiary, _amount, 0, now, now + 720 days, 30 days, true);
    } else if (_supply == AllocationType.SEED_CONTRIBUTORS) {
      _validateScheduleVesting(_beneficiary, _amount, AVAILABLE_SEED_CONTRIBUTORS_SUPPLY);
      AVAILABLE_SEED_CONTRIBUTORS_SUPPLY = AVAILABLE_SEED_CONTRIBUTORS_SUPPLY.sub(_amount);
      setVestingSchedule(_beneficiary, _amount, 0, now, now + 150 days, 30 days, true);
    } else if (_supply == AllocationType.FOUNDERS) {
      _validateScheduleVesting(_beneficiary, _amount, AVAILABLE_FOUNDERS_SUPPLY);
      AVAILABLE_FOUNDERS_SUPPLY = AVAILABLE_FOUNDERS_SUPPLY.sub(_amount);
      setVestingSchedule(_beneficiary, _amount, 0, now, now + 720 days, 30 days, true);
    } else if (_supply == AllocationType.ADVISORS) {
      _validateScheduleVesting(_beneficiary, _amount, AVAILABLE_ADVISORS_SUPPLY);
      AVAILABLE_ADVISORS_SUPPLY = AVAILABLE_ADVISORS_SUPPLY.sub(_amount);
      _beneficiary.transfer(_amount);
    } else if (_supply == AllocationType.CONSULTANTS) {
      _validateScheduleVesting(_beneficiary, _amount, AVAILABLE_CONSULTANTS_SUPPLY);
      AVAILABLE_CONSULTANTS_SUPPLY = AVAILABLE_CONSULTANTS_SUPPLY.sub(_amount);
      _beneficiary.transfer(_amount);
    } else if (_supply == AllocationType.OTHER) {
      _validateScheduleVesting(_beneficiary, _amount, AVAILABLE_OTHER_SUPPLY);
      AVAILABLE_OTHER_SUPPLY = AVAILABLE_OTHER_SUPPLY.sub(_amount);
      _beneficiary.transfer(_amount);
    }

    // Update the total available supply
    AVAILABLE_TOTAL_SUPPLY = AVAILABLE_TOTAL_SUPPLY.sub(_amount);
  }

  function _validateScheduleVesting(
    address _beneficiary,
    uint256 _tokens,
    uint256 _allocationSupply
  )
  internal view
  {
    require(_beneficiary != address(0));
    require(openingTime <= now);
    require(AVAILABLE_TOTAL_SUPPLY.sub(_tokens) >= 0, 'availableSupply');
    require(_allocationSupply.sub(_tokens) >= 0, 'allocationSupply');
  }

  function totalAllocated() public view returns (uint256) {
    return INITIAL_SUPPLY - AVAILABLE_TOTAL_SUPPLY;
  }
}