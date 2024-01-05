import {
  time,
  loadFixture,
  impersonateAccount,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const AAVE_ETH_USDC_ADDRESS = "0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c";
const AAVE_V3_ADDRESS = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2";
const IMPERSONATED_WHALE_ADDRESS = "0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503";

describe("Return Finance Aave V3 USDC Vault Tests", () => {
  const deployedContracts = async () => {
    const usdc = await ethers.getContractAt("MockUSDC", USDC_ADDRESS);

    const ReturnFinanceAaveV3USDCVault = await ethers.getContractFactory(
      "ReturnFinanceAaveV3USDCVault"
    );
    const returnFinanceAaveV3USDCVault =
      await ReturnFinanceAaveV3USDCVault.deploy(
        USDC_ADDRESS,
        AAVE_V3_ADDRESS,
        AAVE_ETH_USDC_ADDRESS
      );

    await returnFinanceAaveV3USDCVault.waitForDeployment();

    await impersonateAccount(IMPERSONATED_WHALE_ADDRESS);

    const impersonatedWhaleAccount = await ethers.getSigner(
      IMPERSONATED_WHALE_ADDRESS
    );

    return {
      usdc,
      returnFinanceAaveV3USDCVault,
      impersonatedWhaleAccount,
    };
  };

  it("should successfully deploy ReturnFinanceAaveV3USDCVault with correct configuration", async () => {
    const { returnFinanceAaveV3USDCVault } = await loadFixture(
      deployedContracts
    );

    const usdcAddress = await returnFinanceAaveV3USDCVault.usdc();
    const aEthUSDCAddress = await returnFinanceAaveV3USDCVault.aEthUSDC();
    const aaveV3PoolAddress = await returnFinanceAaveV3USDCVault.aaveV3Pool();

    expect(usdcAddress).to.equal(USDC_ADDRESS);
    expect(aEthUSDCAddress).to.equal(AAVE_ETH_USDC_ADDRESS);
    expect(aaveV3PoolAddress).to.equal(AAVE_V3_ADDRESS);
  });

  it("should successfully deposit USDC to the ReturnFinanceAaveV3USDCVault contract", async () => {
    const { usdc, returnFinanceAaveV3USDCVault, impersonatedWhaleAccount } =
      await loadFixture(deployedContracts);

    const accounts = await ethers.getSigners();

    await returnFinanceAaveV3USDCVault
      .connect(accounts[0])
      .toggleWhitelist(IMPERSONATED_WHALE_ADDRESS, true);

    await usdc
      .connect(impersonatedWhaleAccount)
      .approve(returnFinanceAaveV3USDCVault.getAddress(), ethers.MaxUint256);

    await returnFinanceAaveV3USDCVault
      .connect(impersonatedWhaleAccount)
      .deposit("1000000000000", impersonatedWhaleAccount.getAddress());

    const suppliedAmount = await returnFinanceAaveV3USDCVault.balanceOf(
      impersonatedWhaleAccount.getAddress()
    );

    expect(suppliedAmount).to.equal("1000000000000");
  });

  it("should successfully withdraw USDC from the ReturnFinanceAaveV3USDCVault contract", async () => {
    const { usdc, returnFinanceAaveV3USDCVault, impersonatedWhaleAccount } =
      await loadFixture(deployedContracts);

    const accounts = await ethers.getSigners();

    await returnFinanceAaveV3USDCVault
      .connect(accounts[0])
      .toggleWhitelist(IMPERSONATED_WHALE_ADDRESS, true);

    await usdc
      .connect(impersonatedWhaleAccount)
      .approve(returnFinanceAaveV3USDCVault.getAddress(), ethers.MaxUint256);

    await returnFinanceAaveV3USDCVault
      .connect(impersonatedWhaleAccount)
      .deposit("1000000000000", impersonatedWhaleAccount.getAddress());

    const suppliedAmount = await returnFinanceAaveV3USDCVault.balanceOf(
      impersonatedWhaleAccount.getAddress()
    );

    expect(suppliedAmount).to.equal("1000000000000");

    // Travel to the future
    await time.increase(43200);

    const amountToWithdraw = await returnFinanceAaveV3USDCVault.totalAssets();

    await returnFinanceAaveV3USDCVault
      .connect(impersonatedWhaleAccount)
      .withdraw(
        amountToWithdraw,
        impersonatedWhaleAccount.getAddress(),
        impersonatedWhaleAccount.getAddress()
      );
  });

  it("should successfully rescue funds from the ReturnFinanceAaveV3USDCVault contract", async () => {
    const { usdc, returnFinanceAaveV3USDCVault, impersonatedWhaleAccount } =
      await loadFixture(deployedContracts);

    const accounts = await ethers.getSigners();

    await returnFinanceAaveV3USDCVault
      .connect(accounts[0])
      .toggleWhitelist(IMPERSONATED_WHALE_ADDRESS, true);

    await usdc
      .connect(impersonatedWhaleAccount)
      .approve(returnFinanceAaveV3USDCVault.getAddress(), ethers.MaxUint256);

    await returnFinanceAaveV3USDCVault
      .connect(impersonatedWhaleAccount)
      .deposit("1000000000000", impersonatedWhaleAccount.getAddress());

    const suppliedAmount = await returnFinanceAaveV3USDCVault.balanceOf(
      impersonatedWhaleAccount.getAddress()
    );

    expect(suppliedAmount).to.equal("1000000000000");

    // Travel to the future
    await time.increase(43200);

    const amountToWithdraw = await returnFinanceAaveV3USDCVault.totalAssets();

    await returnFinanceAaveV3USDCVault
      .connect(accounts[0])
      .rescueFunds(accounts[0].getAddress());
  });

  it("should successfully sweep tokens or ETH trapped in the ReturnFinanceAaveV3USDCVault contract", async () => {
    const { usdc, returnFinanceAaveV3USDCVault, impersonatedWhaleAccount } =
      await loadFixture(deployedContracts);

    const accounts = await ethers.getSigners();

    await usdc
      .connect(impersonatedWhaleAccount)
      .transfer(returnFinanceAaveV3USDCVault.getAddress(), "1000000");

    await returnFinanceAaveV3USDCVault
      .connect(accounts[0])
      .sweepFunds(USDC_ADDRESS);

    const rescuedAmount = await usdc.balanceOf(accounts[0].getAddress());

    expect(rescuedAmount).to.equal("1000000");

    await impersonatedWhaleAccount.sendTransaction({
      to: returnFinanceAaveV3USDCVault.getAddress(),
      value: ethers.parseEther("1.0"),
    });

    await returnFinanceAaveV3USDCVault
      .connect(accounts[0])
      .sweepFunds(ethers.ZeroAddress);
  });
}).timeout(72000);
