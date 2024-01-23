// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

interface IConvexBooster {
    function depositAll(uint256 _pid, bool _stake) external returns (bool);
    function withdraw(uint256 _pid, uint256 _amount) external;
    function withdrawAll(uint256 _pid) external returns (bool);
    function withdrawTo(uint256 _pid, uint256 _amount, address _to) external returns(bool);
}
