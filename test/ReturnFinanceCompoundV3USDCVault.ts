import {
  time,
  loadFixture,
  impersonateAccount,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const C_USDC_V3_ADDRESS = "0xc3d688B66703497DAA19211EEdff47f25384cdc3";
const IMPERSONATED_WHALE_ADDRESS = "0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503";

describe("Return Finance Compound V3 USDC Vault Tests", () => {
  const deployedContracts = async () => {
    const usdc = await ethers.getContractAt("MockUSDC", USDC_ADDRESS);

    const ReturnFinanceCompoundV3USDCVault = await ethers.getContractFactory(
      "ReturnFinanceCompoundV3USDCVault"
    );
    const returnFinanceAaveV3USDCVault =
      await ReturnFinanceCompoundV3USDCVault.deploy(
        USDC_ADDRESS,
        C_USDC_V3_ADDRESS
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

  it("should successfully deploy ReturnFinanceCompoundV3USDCVault with correct configuration", async () => {
    const { returnFinanceAaveV3USDCVault } = await loadFixture(
      deployedContracts
    );

    const usdcAddress = await returnFinanceAaveV3USDCVault.usdc();
    const cUSDCv3Address = await returnFinanceAaveV3USDCVault.cUSDCv3();

    expect(usdcAddress).to.equal(USDC_ADDRESS);
    expect(cUSDCv3Address).to.equal(C_USDC_V3_ADDRESS);
  });

  it("should successfully deposit USDC to the ReturnFinanceCompoundV3USDCVault contract", async () => {
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

  it("should successfully withdraw USDC from the ReturnFinanceCompoundV3USDCVault contract", async () => {
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

  it("should successfully rescue funds from the ReturnFinanceCompoundV3USDCVault contract", async () => {
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

    await returnFinanceAaveV3USDCVault
      .connect(accounts[0])
      .rescueFunds(accounts[0].getAddress());
  });

  it("should successfully sweep tokens or ETH trapped in the ReturnFinanceCompoundV3USDCVault contract", async () => {
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

    expect(rescuedAmount).to.equal("2000000");

    await impersonatedWhaleAccount.sendTransaction({
      to: returnFinanceAaveV3USDCVault.getAddress(),
      value: ethers.parseEther("1.0"),
    });

    await returnFinanceAaveV3USDCVault
      .connect(accounts[0])
      .sweepFunds(ethers.ZeroAddress);
  });
}).timeout(72000);
