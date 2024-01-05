// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

interface IReturnFinanceAaveV3USDCVault {
    event FeeUpdated(uint256 newFeeBps);
    event SweepFunds(address token, uint256 amount);
    event PoolDonation(address sender, uint256 value);
    event AddressWhitelisted(address whitelistedAddress, bool isWhitelisted);
    event RescueFunds(uint256 totalAEthUSDC);

    function sweepFunds(address token) external;
    function rescueFunds(address destination) external;
    function toggleWhitelist(address updatedAddress, bool isWhitelisted) external;

    error UnableToSweep(address token);
    error NotInWhitelist(address wrongAddress);
}
