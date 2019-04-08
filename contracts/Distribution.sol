pragma solidity ^0.5.0;

import './utils/SafeMath.sol';
import "./utils/Ownable.sol";
import './Vesting.sol';

contract Distribution is Ownable, Vesting {
  using SafeMath for uint256;

  enum Category {TEAM, SEED_CONTRIBUTORS, CONSULTANTS, OTHER, FUTURE_OFFERING}

  uint256 private constant decimalFactor = 10 ** uint256(18);
  uint256 public MAX_TOKENS = 300000000 * decimalFactor;

  // Todo: SHOULD THIS STILL BE SO SPECIFIC? TO BE DISCUSSED
  uint256 public PROJECT_INITIAL_SUPPLY = 135000000 * decimalFactor; // 45.00% of total amount
  uint256 public AVAILABLE_TEAM_SUPPLY = 60000000 * decimalFactor; // 20.00% released over 24 months
  uint256 public AVAILABLE_SEED_CONTRIBUTORS_SUPPLY = 24000000 * decimalFactor; // 8.00% released over 5 months
  uint256 public AVAILABLE_CONSULTANTS_SUPPLY = 2000000 * decimalFactor; //  1.00% released at Token Distribution (TD)
  uint256 public AVAILABLE_OTHER_SUPPLY = 21000000 * decimalFactor; //  7.00% released at Token Distribution (TD)
  uint256 public AVAILABLE_FUTURE_OFFERING_SUPPLY = 28000000 * decimalFactor; //  9.00% released at Token Distribution (TD)
  uint256 public PROJECT_AVAILABLE_TOTAL_SUPPLY = PROJECT_INITIAL_SUPPLY;

  uint256 public SALE_INITIAL_SUPPLY = 165000000 * decimalFactor; // 55.00% of total amount
  uint256 public SALE_AVAILABLE_TOTAL_SUPPLY = SALE_INITIAL_SUPPLY;

  uint256 private constant BONUS_MIN = 0;
  uint256 private constant BONUS_MAX = 40;

  uint256 public openingTime;

  /**
   * @param _openingTime The time when LS can setup vesting schedules for sale contributors and the team
   */
  constructor(uint256 _openingTime) Ownable() public {
    // make sure the start time is in the future
    require(_openingTime >= now);
    // the total of the different pools must equal the total project supply
    require(PROJECT_AVAILABLE_TOTAL_SUPPLY == AVAILABLE_TEAM_SUPPLY.add(AVAILABLE_SEED_CONTRIBUTORS_SUPPLY).add(AVAILABLE_CONSULTANTS_SUPPLY).add(AVAILABLE_OTHER_SUPPLY).add(AVAILABLE_FUTURE_OFFERING_SUPPLY));
    // all tokens are split between sale and project
    require(MAX_TOKENS == PROJECT_INITIAL_SUPPLY.add(SALE_INITIAL_SUPPLY));
      
    openingTime = _openingTime;
  }

  /**
   * @notice Allow the owner of the contract to assign a new allocation from the project pool.
   *
   * @param _beneficiary The recipient of the allocation
   * @param _category The total supply the allocation will be taken from
   */
  function scheduleProjectVesting(address payable _beneficiary, Category _category) onlyOwner public payable {
    uint _amount = msg.value;

    if (_category == Category.TEAM) {
      _validateScheduleProjectVesting(_beneficiary, _amount, AVAILABLE_TEAM_SUPPLY);

      AVAILABLE_TEAM_SUPPLY = AVAILABLE_TEAM_SUPPLY.sub(_amount);
      setVestingSchedule(_beneficiary, _amount, 0, now, now + 720 days, 30 days, true);
    } else if (_category == Category.SEED_CONTRIBUTORS) {
      _validateScheduleProjectVesting(_beneficiary, _amount, AVAILABLE_SEED_CONTRIBUTORS_SUPPLY);

      AVAILABLE_SEED_CONTRIBUTORS_SUPPLY = AVAILABLE_SEED_CONTRIBUTORS_SUPPLY.sub(_amount);
      setVestingSchedule(_beneficiary, _amount, 0, now, now + 150 days, 30 days, false);
    }  else if (_category == Category.CONSULTANTS) {
      _validateScheduleProjectVesting(_beneficiary, _amount, AVAILABLE_CONSULTANTS_SUPPLY);

      AVAILABLE_CONSULTANTS_SUPPLY = AVAILABLE_CONSULTANTS_SUPPLY.sub(_amount);
      _beneficiary.transfer(_amount);
    } else if (_category == Category.OTHER) {
      _validateScheduleProjectVesting(_beneficiary, _amount, AVAILABLE_OTHER_SUPPLY);

      AVAILABLE_OTHER_SUPPLY = AVAILABLE_OTHER_SUPPLY.sub(_amount);
      _beneficiary.transfer(_amount);
    } else if (_category == Category.FUTURE_OFFERING) {
      _validateScheduleProjectVesting(_beneficiary, _amount, AVAILABLE_FUTURE_OFFERING_SUPPLY);

      AVAILABLE_FUTURE_OFFERING_SUPPLY = AVAILABLE_FUTURE_OFFERING_SUPPLY.sub(_amount);
      _beneficiary.transfer(_amount);
    } else {
      require(true == false, "project category not supported");
    }

    PROJECT_AVAILABLE_TOTAL_SUPPLY = PROJECT_AVAILABLE_TOTAL_SUPPLY.sub(_amount);
  }

  /**
   * @notice Allow the owner of the contract to assign a new allocation from the sale pool.
   *
   * @param _beneficiary The recipient of the allocation
   * @param _bonus How many tokens out of the ones sent in "msg.value" should be scheduled for vesting as a bonus
   */
  function schedulePrivateSaleVesting(address _beneficiary, uint256 _bonus) onlyOwner public payable {
    uint _amountIncludingBonus = msg.value;
    uint _amount = _amountIncludingBonus.sub(_bonus);

    _validatePrivateSaleVesting(_beneficiary, _amount, _bonus);

    setVestingSchedule(_beneficiary, _amount, _bonus, now, now + 150 days, 30 days, false);

    SALE_AVAILABLE_TOTAL_SUPPLY = SALE_AVAILABLE_TOTAL_SUPPLY.sub(_amountIncludingBonus);
  }

  /**
   * @notice Allow the owner of the contract to send part of sale tokens to public sale contributors without vesting.
   *
   * @param _beneficiary The recipient of the allocation
   */
  function schedulePublicSaleVesting(address payable _beneficiary) onlyOwner public payable {
    uint _amount = msg.value;

    _validatePublicSaleTransfer(_beneficiary, _amount);

    setVestingSchedule(_beneficiary, _amount, 0, now, now, 30 days, false);

    SALE_AVAILABLE_TOTAL_SUPPLY = SALE_AVAILABLE_TOTAL_SUPPLY.sub(_amount);
  }

  function _validateScheduleProjectVesting(
    address _beneficiary,
    uint256 _amount,
    uint256 _categorySupply
  )
  internal view
  {
    require(openingTime <= now);

    require(_amount > 0, 'no enough tokens sent to allocate to beneficiary');
    require(_beneficiary != address(0), 'not a valid address');
    require(_categorySupply.sub(_amount) >= 0, 'project category max supply reached');

    require(PROJECT_AVAILABLE_TOTAL_SUPPLY.sub(_amount) >= 0, 'project max supply reached');
  }

  function _validatePrivateSaleVesting(
    address _beneficiary,
    uint256 _amount,
    uint256 _bonus
  )
  internal view
  {
    require(openingTime <= now);

    require(_amount > 0, 'no enough tokens sent to allocate to beneficiary');
    require(_beneficiary != address(0));
    require(SALE_AVAILABLE_TOTAL_SUPPLY.sub(_amount).sub(_bonus) >= 0, 'sale max supply reached');

    uint256 bonusMin = SafeMath.div(
      SafeMath.mul(_amount, BONUS_MIN),
      100
    );

    uint256 bonusMax = SafeMath.div(
      SafeMath.mul(_amount, BONUS_MAX),
      100
    );

    require(_bonus >= bonusMin && _bonus <= bonusMax);
  }

  function _validatePublicSaleTransfer(
    address _beneficiary,
    uint256 _amount
  )
  internal view
  {
    require(openingTime <= now);

    require(_amount > 0, 'no enough tokens sent to allocate to beneficiary');
    require(_beneficiary != address(0));
    require(SALE_AVAILABLE_TOTAL_SUPPLY.sub(_amount) >= 0, 'sale max supply reached');
  }

  function projectSupplyDistributed() public view returns (uint256) {
    return PROJECT_INITIAL_SUPPLY - PROJECT_AVAILABLE_TOTAL_SUPPLY;
  }

  function saleSupplyDistributed() public view returns (uint256) {
    return SALE_INITIAL_SUPPLY - SALE_AVAILABLE_TOTAL_SUPPLY;
  }
}