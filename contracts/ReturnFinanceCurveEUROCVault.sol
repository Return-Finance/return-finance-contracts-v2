// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {ISwapRouter} from "./interfaces/ISwapRouter.sol";
import {ICurvePool} from "./interfaces/ICurvePool.sol";
import {ICurveGauge} from "./interfaces/ICurveGauge.sol";
import {ICurveZap} from "./interfaces/ICurveZap.sol";
import {ICurveMinter} from "./interfaces/ICurveMinter.sol";
import {AggregatorV3Interface} from "./interfaces/AggregatorV3Interface.sol";
import {IReturnFinanceCurveEUROCVault} from "./interfaces/IReturnFinanceCurveEUROCVault.sol";

/**
 * @title Return Finance Curve EUROC Vault
 * @author 0xFusion (https://0xfusion.com)
 * @dev Return Finance Curve EUROC Vault is an ERC4626 compliant vault.
 * @dev The ERC4626 "Tokenized Vault Standard" is defined in https://eips.ethereum.org/EIPS/eip-4626[EIP-4626].
 */
contract ReturnFinanceCurveEUROCVault is IReturnFinanceCurveEUROCVault, ERC4626, Ownable {
    using SafeERC20 for IERC20;
    using Address for address;

    /* ========== STATE VARIABLES ========== */

    address public immutable euroc;
    address public immutable ageur;
    address public immutable usdc;
    address public immutable crv;
    address public immutable weth;
    address public immutable curveLpToken;
    address public immutable curveGauge;
    address public immutable curveZap;
    address public immutable curveMinter;
    address public immutable uniswapV3Router;
    address public immutable chainlinkDataFeedCRVUSD;
    address public immutable chainlinkDataFeedEURUSD;

    uint24 public slippageAndFeeFactor;
    bytes public multihopPath;

    address public constant ADDRESS_ZERO = 0x0000000000000000000000000000000000000000;

    /**
     * @notice Represents the whitelist of addresses that can interact with this contract
     */
    mapping(address => bool) public whitelist;

    /**
     * @notice Function to receive ether, which emits a donation event
     */
    receive() external payable {
        emit PoolDonation(_msgSender(), msg.value);
    }

    /* ========== CONSTRUCTOR ========== */

    /**
     * @dev Constructor to initialize the Return Finance Curve EUROC Vault.
     * @param config Configuration struct
     */
    constructor(Config memory config)
        Ownable(_msgSender())
        ERC4626(config.euroc)
        ERC20("Return Finance Curve EUROC Vault", "rfCrvEUROC")
    {
        euroc = address(config.euroc);
        ageur = config.ageur;
        usdc = config.usdc;
        crv = config.crv;
        weth = config.weth;
        curveLpToken = config.curveLpToken;
        curveGauge = config.curveGauge;
        curveZap = config.curveZap;
        curveMinter = config.curveMinter;
        slippageAndFeeFactor = config.slippageAndFeeFactor;
        uniswapV3Router = config.uniswapV3Router;
        chainlinkDataFeedCRVUSD = config.chainlinkDataFeedCRVUSD;
        chainlinkDataFeedEURUSD = config.chainlinkDataFeedEURUSD;

        // Set initial path for swap from CRV to EUROC
        // CRV -- 0.3% --> WETH -- 0.05% --> USDC -- 0.05% --> EUROC
        multihopPath = abi.encodePacked(crv, uint24(3000), weth, uint24(500), usdc, uint24(500), euroc);
    }

    /* ========== VIEWS ========== */

    /**
     * @dev See {IERC4626-totalAssets}.
     */
    function totalAssets() public view override returns (uint256) {
        return IERC20(euroc).balanceOf(address(this))
            + (IERC20(curveGauge).balanceOf(address(this)) * ICurvePool(curveLpToken).get_virtual_price() / 1e30)
                * (10000 - slippageAndFeeFactor) / 10000 + (earnedCRV() * uint256(crvPriceEUR()) / 1e20);
    }

    /**
     * @notice The staked Curve LP tokens in the Curve Gauge
     * @return The amount of staked Curve LP tokens in the Curve Gauge
     */
    function stakedLpInCurveGauge() public view returns (uint256) {
        return IERC20(curveGauge).balanceOf(address(this));
    }

    /**
     * @notice Approximate accrued CRV rewards from staking Curve LP tokens in the Curve Gauge
     * @return toMint The amount of CRV rewards accrued in the protocol
     */
    function earnedCRV() public view returns (uint256 toMint) {
        uint256 totalMint = ICurveGauge(curveGauge).integrate_fraction(address(this));
        toMint = totalMint - ICurveMinter(curveMinter).minted((address(this)), curveGauge);
    }

    /**
     * @notice The CRV/USD price
     * @return answer The price of CRV denominated in EURO
     */
    function crvPriceEUR() public view returns (int256 answer) {
        (uint80 roundId, int256 crvPriceUSD, uint256 startedAt,, uint80 answeredInRound) =
            AggregatorV3Interface(chainlinkDataFeedCRVUSD).latestRoundData();
        if (crvPriceUSD <= 0) revert ChainlinkPriceZero();
        if (startedAt == 0) revert ChainlinkIncompleteRound();
        if (answeredInRound < roundId) revert ChainlinkStalePrice();

        (uint80 _roundId, int256 eurPriceUSD, uint256 _startedAt,, uint80 _answeredInRound) =
            AggregatorV3Interface(chainlinkDataFeedEURUSD).latestRoundData();
        if (eurPriceUSD <= 0) revert ChainlinkPriceZero();
        if (_startedAt == 0) revert ChainlinkIncompleteRound();
        if (_answeredInRound < _roundId) revert ChainlinkStalePrice();

        answer = (crvPriceUSD * eurPriceUSD) / 1e8;
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    /**
     * @notice Send all tokens or ETH held by the contract to the owner
     * @param token The token to sweep, or 0 for ETH
     */
    function sweepFunds(address token) external onlyOwner {
        if (token == address(0)) {
            (bool success,) = owner().call{value: address(this).balance}("");
            if (!success) revert UnableToSweep(token);
            emit SweepFunds(token, address(this).balance);
        } else {
            IERC20(token).safeTransfer(owner(), IERC20(token).balanceOf(address(this)));
            emit SweepFunds(token, IERC20(token).balanceOf(address(this)));
        }
    }

    /**
     * @notice Rescue any locked funds from the pools
     * @param destination The address where the funds should be sent
     */
    function rescueFunds(address destination) external onlyOwner {
        uint256 totalLP = stakedLpInCurveGauge();
        ICurveGauge(curveGauge).withdraw(totalLP);
        IERC20(curveLpToken).safeTransfer(destination, totalLP);

        emit RescueFunds(totalLP);
    }

    /**
     * @notice Rescue any locked rewards
     * @param destination The address where the funds should be sent
     */
    function rescueRewards(address destination) external onlyOwner {
        // Claim pending CRV rewards from Curve
        ICurveMinter(curveMinter).mint(curveGauge);

        uint256 crvRewards = IERC20(crv).balanceOf(address(this));

        IERC20(crv).safeTransfer(destination, crvRewards);

        emit RescueRewards(crvRewards);
    }

    /**
     * @notice Updates the swap fee used in _swap and totalAssets calculation
     * @param newSlippageAndFeeFactor The new swap fee
     */
    function updateSlippageAndFeeFactor(uint24 newSlippageAndFeeFactor) external onlyOwner {
        slippageAndFeeFactor = newSlippageAndFeeFactor;

        emit NewSlippageAndFeeFactor(newSlippageAndFeeFactor);
    }

    /**
     * @notice Updates the multihop path for swapping via Uniswap
     * @param newMultihopPath The new multihop path
     */
    function updateMultihopPath(bytes memory newMultihopPath) external onlyOwner {
        multihopPath = newMultihopPath;

        emit MultihopPathUpdated(newMultihopPath);
    }

    /**
     * @notice Allow or disallow an address to interact with the contract
     * @param updatedAddress The address to change the whitelist status for
     * @param isWhitelisted Whether the address should be whitelisted
     */
    function toggleWhitelist(address updatedAddress, bool isWhitelisted) external onlyOwner {
        whitelist[updatedAddress] = isWhitelisted;

        emit AddressWhitelisted(updatedAddress, isWhitelisted);
    }

    /**
     * @notice Allow the owner to call an external contract for some reason. E.g. claim an airdrop.
     * @param target The target contract address
     * @param data Encoded function data
     */
    function callExternalContract(address target, bytes memory data) external onlyOwner {
        target.functionCall(data);
    }

    /**
     * @notice Multihop Swap function for the underlying token by provided path
     * @param path The path of token addresses and fee tiers to be swapped
     * @param amountIn The amount of token to be swapped
     * @param amountOutMinimum The minimum amount of token to be received
     * @return amountOut The amount of tokens received from the swap
     */
    function _swapExactInputMultihop(bytes memory path, uint256 amountIn, uint256 amountOutMinimum)
        internal
        returns (uint256 amountOut)
    {
        ISwapRouter.ExactInputParams memory params = ISwapRouter.ExactInputParams({
            path: path,
            recipient: _msgSender(),
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: amountOutMinimum
        });

        amountOut = ISwapRouter(uniswapV3Router).exactInput(params);
    }

    /**
     * @notice Claims accrued CRV rewards and swaps them for EUROC on Uniswap V3
     * @return harvestAmount The amount harvested denominated in EUROC
     */
    function harvestRewards() public returns (uint256 harvestAmount) {
        if (!whitelist[_msgSender()]) revert NotInWhitelist(_msgSender());

        // Claim pending CRV rewards from Curve Finance Gauge
        ICurveMinter(curveMinter).mint(curveGauge);

        uint256 crvRewards = IERC20(crv).balanceOf(address(this));

        // Swap only if there's anything to swap
        if (crvRewards > 0) {
            IERC20(crv).approve(uniswapV3Router, crvRewards);
            harvestAmount = _swapExactInputMultihop(multihopPath, crvRewards, 0);

            emit HarvestRewards(harvestAmount);
        }
    }
    /**
     * @notice Harvests rewards and deposits back to Curve
     * @return harvestAmount The amount harvested denominated in EUROC
     */

    function harvestAndDepositRewards() external returns (uint256 harvestAmount) {
        harvestAmount = harvestRewards();
        _afterDepositOrWithdraw();
    }

    /**
     * @notice Hook called before a user withdraws EUROC from the vault.
     */
    function _beforeDeposit() internal {
        // In order to get the most accurate result from totalAssets(), we need
        // to call user_checkpoint so we get latest earnedCRV
        ICurveGauge(curveGauge).user_checkpoint(address(this));
    }

    /**
     * @notice Hook called before a user withdraws EUROC from the vault.
     */
    function _beforeWithdraw() internal {
        // Harvest rewards -> Claim CRV and swap it for EUROC
        harvestRewards();

        // Because there is not accurate way to obtain the exact amount of EUROC equivalent to the Curve LP tokens,
        // we withdraw and unwrap all Curve LP tokens from Curve. The remaining difference is deposited back in the
        // _afterDepositOrWithdraw() method

        ICurveGauge(curveGauge).withdraw(stakedLpInCurveGauge());

        // Get the amount of LP tokens after withdraw form Curve
        uint256 lpTokensToWithdraw = IERC20(curveLpToken).balanceOf(address(this));

        // Remove liquidity from Curve and receive the underlying token (EUROC)
        ICurvePool(curveLpToken).remove_liquidity_one_coin(lpTokensToWithdraw, 1, 0);
    }

    /**
     * @notice Hook called after a user withdraws EUROC from the vault.
     */
    function _afterDepositOrWithdraw() internal {
        // Get remaining EUROC in the pool
        uint256 assetsToDeposit = IERC20(euroc).balanceOf(address(this));
        if (assetsToDeposit > 0) {
            IERC20(euroc).approve(curveZap, assetsToDeposit);
            // Add the availanbe EUROC as liquidity to Curve
            ICurveZap(curveZap).deposit_and_stake(
                curveLpToken,
                curveLpToken,
                curveGauge,
                2,
                [ageur, euroc, ADDRESS_ZERO, ADDRESS_ZERO, ADDRESS_ZERO],
                [0, assetsToDeposit, 0, 0, 0],
                0,
                false,
                ADDRESS_ZERO
            );
        }
    }

    /**
     * @dev See {ERC4626-_deposit}.
     */
    function _deposit(address caller, address receiver, uint256 assets, uint256 shares) internal override {
        if (!whitelist[_msgSender()]) revert NotInWhitelist(_msgSender());
        _beforeDeposit();
        super._deposit(caller, receiver, assets, shares);
        _afterDepositOrWithdraw();
    }

    /**
     * @dev See {ERC4626-_withdraw}.
     */
    function _withdraw(address caller, address receiver, address owner, uint256 assets, uint256 shares)
        internal
        override
    {
        if (!whitelist[_msgSender()]) revert NotInWhitelist(_msgSender());
        _beforeWithdraw();
        super._withdraw(caller, receiver, owner, assets, shares);
        _afterDepositOrWithdraw();
    }
}
