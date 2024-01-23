import {
  time,
  loadFixture,
  impersonateAccount,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

const SLIPPAGE = "10";
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const S_DAI_ADDRESS = "0x83F20F44975D03b1b09e64809B757c47f942BEeA";
const UNISWAP_V3_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
const IMPERSONATED_WHALE_ADDRESS = "0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503";

describe("Return Finance Spark USDC Vault Tests", () => {
  const deployedContracts = async () => {
    const usdc = await ethers.getContractAt("MockUSDC", USDC_ADDRESS);

    const ReturnFinanceSparkUSDCVault = await ethers.getContractFactory(
      "ReturnFinanceSparkUSDCVault"
    );
    const returnFinanceSparkUSDCVault =
      await ReturnFinanceSparkUSDCVault.deploy(
        USDC_ADDRESS,
        DAI_ADDRESS,
        S_DAI_ADDRESS,
        UNISWAP_V3_ROUTER,
        SLIPPAGE
      );

    await returnFinanceSparkUSDCVault.waitForDeployment();

    await impersonateAccount(IMPERSONATED_WHALE_ADDRESS);

    const impersonatedWhaleAccount = await ethers.getSigner(
      IMPERSONATED_WHALE_ADDRESS
    );

    return {
      usdc,
      returnFinanceSparkUSDCVault,
      impersonatedWhaleAccount,
    };
  };

  it("should successfully deploy Return Finance Spark USDC Vault with correct configuration", async () => {
    const { returnFinanceSparkUSDCVault } = await loadFixture(
      deployedContracts
    );

    const usdcAddress = await returnFinanceSparkUSDCVault.usdc();
    const daiAddress = await returnFinanceSparkUSDCVault.dai();
    const sDaiAddress = await returnFinanceSparkUSDCVault.sDai();
    const uniswapV3Router = await returnFinanceSparkUSDCVault.uniswapV3Router();

    expect(usdcAddress).to.equal(USDC_ADDRESS);
    expect(daiAddress).to.equal(DAI_ADDRESS);
    expect(sDaiAddress).to.equal(S_DAI_ADDRESS);
    expect(uniswapV3Router).to.equal(UNISWAP_V3_ROUTER);
  });

  it("should successfully deposit USDC to the Return Finance Spark USDC Vault contract", async () => {
    const { usdc, returnFinanceSparkUSDCVault, impersonatedWhaleAccount } =
      await loadFixture(deployedContracts);

    const accounts = await ethers.getSigners();

    await returnFinanceSparkUSDCVault
      .connect(accounts[0])
      .toggleWhitelist(IMPERSONATED_WHALE_ADDRESS, true);

    await usdc
      .connect(impersonatedWhaleAccount)
      .approve(returnFinanceSparkUSDCVault.getAddress(), ethers.MaxUint256);

    await returnFinanceSparkUSDCVault
      .connect(impersonatedWhaleAccount)
      .deposit("1000000000000", impersonatedWhaleAccount.getAddress());

    const suppliedAmount = await returnFinanceSparkUSDCVault.balanceOf(
      impersonatedWhaleAccount.getAddress()
    );

    expect(suppliedAmount).to.equal("1000000000000");
  });

  it("should successfully withdraw USDC from the Return Finance Spark USDC Vault contract", async () => {
    const { usdc, returnFinanceSparkUSDCVault, impersonatedWhaleAccount } =
      await loadFixture(deployedContracts);

    const accounts = await ethers.getSigners();

    await returnFinanceSparkUSDCVault
      .connect(accounts[0])
      .toggleWhitelist(IMPERSONATED_WHALE_ADDRESS, true);

    await usdc
      .connect(impersonatedWhaleAccount)
      .approve(returnFinanceSparkUSDCVault.getAddress(), ethers.MaxUint256);

    await returnFinanceSparkUSDCVault
      .connect(impersonatedWhaleAccount)
      .deposit("1000000000", impersonatedWhaleAccount.getAddress());

    const suppliedAmount = await returnFinanceSparkUSDCVault.balanceOf(
      impersonatedWhaleAccount.getAddress()
    );

    expect(suppliedAmount).to.equal("1000000000");

    // Travel to the future
    await time.increase(864000);

    const amountToWithdraw = await returnFinanceSparkUSDCVault.maxWithdraw(
      impersonatedWhaleAccount.getAddress()
    );

    await returnFinanceSparkUSDCVault
      .connect(impersonatedWhaleAccount)
      .withdraw(
        amountToWithdraw,
        impersonatedWhaleAccount.getAddress(),
        impersonatedWhaleAccount.getAddress()
      );
  });

  it("should successfully rescue funds from the Return Finance Spark USDC Vault contract", async () => {
    const { usdc, returnFinanceSparkUSDCVault, impersonatedWhaleAccount } =
      await loadFixture(deployedContracts);

    const accounts = await ethers.getSigners();

    await returnFinanceSparkUSDCVault
      .connect(accounts[0])
      .toggleWhitelist(IMPERSONATED_WHALE_ADDRESS, true);

    await usdc
      .connect(impersonatedWhaleAccount)
      .approve(returnFinanceSparkUSDCVault.getAddress(), ethers.MaxUint256);

    await returnFinanceSparkUSDCVault
      .connect(impersonatedWhaleAccount)
      .deposit("1000000000000", impersonatedWhaleAccount.getAddress());

    const suppliedAmount = await returnFinanceSparkUSDCVault.balanceOf(
      impersonatedWhaleAccount.getAddress()
    );

    expect(suppliedAmount).to.equal("1000000000000");

    // Travel to the future
    await time.increase(43200);

    await returnFinanceSparkUSDCVault
      .connect(accounts[0])
      .rescueFunds(accounts[0].getAddress());
  });

  it("should successfully sweep tokens or ETH trapped in the Return Finance Spark USDC Vault contract", async () => {
    const { usdc, returnFinanceSparkUSDCVault, impersonatedWhaleAccount } =
      await loadFixture(deployedContracts);

    const accounts = await ethers.getSigners();

    await usdc
      .connect(impersonatedWhaleAccount)
      .transfer(returnFinanceSparkUSDCVault.getAddress(), "1000000");

    await returnFinanceSparkUSDCVault
      .connect(accounts[0])
      .sweepFunds(USDC_ADDRESS);

    const rescuedAmount = await usdc.balanceOf(accounts[0].getAddress());

    expect(rescuedAmount).to.equal("4000000");

    await impersonatedWhaleAccount.sendTransaction({
      to: returnFinanceSparkUSDCVault.getAddress(),
      value: ethers.parseEther("1.0"),
    });

    await returnFinanceSparkUSDCVault
      .connect(accounts[0])
      .sweepFunds(ethers.ZeroAddress);
  });
}).timeout(72000);
