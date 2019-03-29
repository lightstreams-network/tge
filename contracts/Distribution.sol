pragma solidity >=0.5.0 <0.7.0;

import "./SafeMath.sol";
import "./TeamDistribution.sol";

// The main contract managing the tokens distribution and vesting of everyone (team and sale).
contract Distribution is TeamDistribution {
  using SafeMath for uint256;

  event Log(string _msg);

  constructor(uint256 _vestingStartTime) TeamDistribution(_vestingStartTime) public {
  }

  function () external payable {
  }
}