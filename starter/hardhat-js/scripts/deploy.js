async function main() {
  const CollateralizedLoan = await ethers.getContractFactory("CollateralizedLoan");
  const collateralizedLoan = await CollateralizedLoan.deploy();


  

  console.log(`CollateralizedLoan deployed to: ${collateralizedLoan.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
