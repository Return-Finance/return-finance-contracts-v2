// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

interface ICurveGauge {
    function claimable_tokens(address addr) external view returns (uint256);
    function claim_rewards() external;
    function withdraw(uint256 _value) external;
}
