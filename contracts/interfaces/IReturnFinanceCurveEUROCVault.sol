// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IReturnFinanceCurveEUROCVault {
    struct Config {
        IERC20 euroc;
        address ageur;
        address usdc;
        address crv;
        address weth;
        address curveLpToken;
        address curveGauge;
        address curveZap;
        address curveMinter;
        address uniswapV3Router;
        address chainlinkDataFeedCRVUSD;
        address chainlinkDataFeedEURUSD;
        uint24 slippageAndFeeFactor;
    }

    event SweepFunds(address token, uint256 amount);
    event PoolDonation(address sender, uint256 value);
    event AddressWhitelisted(address whitelistedAddress, bool isWhitelisted);
    event RescueFunds(uint256 totalUsdc);
    event RescueRewards(uint256 crvRewards);
    event SlippageUpdated(uint256 newSlippage);
    event SetHarvestRewards(bool harvest);
    event HarvestRewards(uint256 amount);
    event NewSlippageAndFeeFactor(uint24 newSlippageAndFeeFactor);
    event MultihopPathUpdated(bytes newMultihopPath);

    function sweepFunds(address token) external;
    function rescueFunds(address destination) external;
    function toggleWhitelist(address updatedAddress, bool isWhitelisted) external;

    error UnableToSweep(address token);
    error NotInWhitelist(address wrongAddress);
    error ChainlinkPriceZero();
    error ChainlinkIncompleteRound();
    error ChainlinkStalePrice();
}
