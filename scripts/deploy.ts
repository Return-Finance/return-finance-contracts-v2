import { ethers } from "hardhat";

async function main() {
  const returnFinanceAaveV3USDCVaultPolygon = await ethers.deployContract(
    "ReturnFinanceAaveV3USDCVault",
    [
      process.env.USDC_ADDRESS,
      process.env.AAVE_V3_ADDRESS,
      process.env.AAVE_ETH_USDC_ADDRESS,
    ]
  );

  await returnFinanceAaveV3USDCVaultPolygon.waitForDeployment();

  console.log(
    `ReturnFinanceAaveV3USDCVault deployed to: https://polygonscan.com/address/${await returnFinanceAaveV3USDCVaultPolygon.getAddress()}`
  );

  const returnFinanceAaveV3USDCVaultAvalanche = await ethers.deployContract(
    "ReturnFinanceAaveV3USDCVault",
    [
      process.env.USDC_ADDRESS,
      process.env.AAVE_V3_ADDRESS,
      process.env.AAVE_ETH_USDC_ADDRESS,
    ]
  );

  await returnFinanceAaveV3USDCVaultAvalanche.waitForDeployment();

  console.log(
    `ReturnFinanceAaveV3USDCVault deployed to: https://snowtrace.io/address/${await returnFinanceAaveV3USDCVaultAvalanche.getAddress()}`
  );

  const returnFinanceCompoundV3USDCVault = await ethers.deployContract(
    "ReturnFinanceCompoundV3USDCVault",
    [process.env.USDC_ADDRESS, process.env.C_USDC_V3_ADDRESS]
  );

  await returnFinanceCompoundV3USDCVault.waitForDeployment();

  console.log(
    `ReturnFinanceCompoundV3USDCVault deployed to: https://basescan.org/address/${await returnFinanceCompoundV3USDCVault.getAddress()}`
  );

  const returnFinanceSparkUSDCVault = await ethers.deployContract(
    "ReturnFinanceSparkUSDCVault",
    [
      process.env.USDC_ADDRESS,
      process.env.DAI_ADDRESS,
      process.env.S_DAI_ADDRESS,
      process.env.UNISWAP_V3_ROUTER,
      process.env.SLIPPAGE,
    ]
  );

  await returnFinanceSparkUSDCVault.waitForDeployment();

  console.log(
    `ReturnFinanceSparkUSDCVault deployed to: https://etherscan.io/address/${await returnFinanceSparkUSDCVault.getAddress()}`
  );

  const returnFinanceConvexUSDCVault = await ethers.deployContract(
    "ReturnFinanceConvexUSDCVault",
    [
      [
        process.env.USDC_ADDRESS,
        process.env.CVX_ADDRESS,
        process.env.CRV_ADDRESS,
        process.env.CURVE_LP_TOKEN_ADDRESS,
        process.env.CURVE_DEPOSIT_ZAP_ADDRESS,
        process.env.CONVEX_BOOSTER_ADDRESS,
        process.env.CONVEX_REWARDS_ADDRESS,
        process.env.CONVEX_HANDLER_ADDRESS,
        process.env.CONVEX_POOL_ID,
        process.env.UNISWAP_FEE,
        process.env.UNISWAP_V3_ROUTER,
        process.env.CHAINLINK_DATA_FEED_CVX_USD,
        process.env.CHAINLINK_DATA_FEED_CRV_USD,
      ],
    ]
  );

  await returnFinanceConvexUSDCVault.waitForDeployment();

  console.log(
    `ReturnFinanceConvexUSDCVault deployed to: https://etherscan.io/address/${await returnFinanceConvexUSDCVault.getAddress()}`
  );

  const returnFinanceCurveEUROCVault = await ethers.deployContract(
    "ReturnFinanceCurveEUROCVault",
    [
      [
        process.env.EUROC_ADDRESS,
        process.env.AGEUR_ADDRESS,
        process.env.USDC_ADDRESS,
        process.env.CRV_ADDRESS,
        process.env.WETH_ADDRESS,
        process.env.CURVE_LP_TOKEN_ADDRESS,
        process.env.CURVE_GAUGE_ADDRESS,
        process.env.CURVE_ZAP_ADDRESS,
        process.env.CURVE_MINTER_ADDRESS,
        process.env.UNISWAP_V3_ROUTER,
        process.env.CHAINLINK_DATA_FEED_CRV_USD,
        process.env.CHAINLINK_DATA_FEED_EUR_USD,
        process.env.SLIPPAGE_AND_FEE_FACTOR,
      ],
    ]
  );

  await returnFinanceCurveEUROCVault.waitForDeployment();

  console.log(
    `ReturnFinanceCuveEUROCVault deployed to: https://etherscan.io/address/${await returnFinanceCurveEUROCVault.getAddress()}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
