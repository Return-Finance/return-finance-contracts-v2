// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

interface ICurve3Pool {
    function get_virtual_price() external view returns (uint256);
}