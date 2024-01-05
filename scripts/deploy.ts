import { ethers } from "hardhat";

async function main() {
  const returnFinanceAaveV3USDCVault = await ethers.deployContract(
    "ReturnFinanceAaveV3USDCVault",
    [
      process.env.USDC_ADDRESS,
      process.env.AAVE_V3_ADDRESS,
      process.env.AAVE_ETH_USDC_ADDRESS,
    ]
  );

  await returnFinanceAaveV3USDCVault.waitForDeployment();

  console.log(
    `ReturnFinanceAaveV3USDCVault deployed to: https://etherscan.io/address/${await returnFinanceAaveV3USDCVault.getAddress()}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
