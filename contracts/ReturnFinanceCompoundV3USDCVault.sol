// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {ICompoundUSDCV3} from "./interfaces/ICompoundUSDCV3.sol";
import {IReturnFinanceCompoundV3USDCVault} from "./interfaces/IReturnFinanceCompoundV3USDCVault.sol";

/**
 * @title ReturnFinanceCompoundV3USDCVault
 * @author 0xFusion (https://0xfusion.com)
 * @dev ReturnFinanceCompoundV3USDCVault is an ERC4626 compliant vault.
 * @dev The ERC4626 "Tokenized Vault Standard" is defined in https://eips.ethereum.org/EIPS/eip-4626[EIP-4626].
 */
contract ReturnFinanceCompoundV3USDCVault is IReturnFinanceCompoundV3USDCVault, ERC4626, Ownable {
    using SafeERC20 for IERC20;
    using Address for address;

    /* ========== STATE VARIABLES ========== */

    address public immutable usdc;
    address public immutable cUSDCv3;

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
     * @dev Constructor to initialize the ReturnFinanceCompoundV3USDCVault.
     * @param _usdc USDC contract address.
     * @param _cUSDCv3 Compound USDC V3 contract address.
     */
    constructor(IERC20 _usdc, address _cUSDCv3)
        Ownable(_msgSender())
        ERC4626(_usdc)
        ERC20("Return Finance Compound USDC V3", "rfcUSDC")
    {
        usdc = address(_usdc);
        cUSDCv3 = _cUSDCv3;

        IERC20(usdc).approve(cUSDCv3, type(uint256).max);
    }

    /* ========== VIEWS ========== */

    /**
     * @dev See {IERC4626-totalAssets}.
     */
    function totalAssets() public view override returns (uint256) {
        return IERC20(cUSDCv3).balanceOf(address(this));
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
        uint256 totalCUSDC = totalAssets();
        ICompoundUSDCV3(cUSDCv3).withdrawTo(destination, usdc, totalCUSDC);

        emit RescueFunds(totalCUSDC);
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
     * @notice Allow or disallow an address to interact with the contract
     * @param updatedAddress The address to change the whitelist status for
     * @param isWhitelisted Whether the address should be whitelisted
     */
    function toggleWhitelist(address updatedAddress, bool isWhitelisted) external onlyOwner {
        whitelist[updatedAddress] = isWhitelisted;

        emit AddressWhitelisted(updatedAddress, isWhitelisted);
    }

    /**
     * @dev Hook called after a user deposits USDC to the vault.
     * @param assets The amount of USDC to be deposited.
     */
    function _afterDeposit(uint256 assets) internal {
        ICompoundUSDCV3(cUSDCv3).supply(usdc, assets);
    }

    /**
     * @dev Hook called before a user withdraws USDC from the vault.
     * @param assets The amount of USDC to be withdrawn.
     */
    function _beforeWithdraw(uint256 assets) internal {
        ICompoundUSDCV3(cUSDCv3).withdraw(usdc, assets);
    }

    /**
     * @dev See {ERC4626-_deposit}.
     */
    function _deposit(address caller, address receiver, uint256 assets, uint256 shares) internal override {
        if (!whitelist[_msgSender()]) revert NotInWhitelist(_msgSender());
        super._deposit(caller, receiver, assets, shares);
        _afterDeposit(assets);
    }

    /**
     * @dev See {ERC4626-_withdraw}.
     */
    function _withdraw(address caller, address receiver, address owner, uint256 assets, uint256 shares)
        internal
        override
    {
        if (!whitelist[_msgSender()]) revert NotInWhitelist(_msgSender());
        _beforeWithdraw(assets);
        super._withdraw(caller, receiver, owner, assets, shares);
    }
}
