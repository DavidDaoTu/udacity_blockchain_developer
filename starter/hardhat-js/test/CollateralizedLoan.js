const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { int, bigint } = require("hardhat/internal/core/params/argumentTypes");

describe("CollateralizedLoan", function () {
  async function deployCollateralizedLoanFixture() {
    const CollateralizedLoan = await ethers.getContractFactory("CollateralizedLoan");
    const [owner, borrower, lender] = await ethers.getSigners();
    const collateralizedLoan = await CollateralizedLoan.deploy();
    return { collateralizedLoan, owner, borrower, lender };
  }

  describe("Loan Request", function () {
    it("Should let a borrower deposit collateral and request a loan", async function () {
      const { collateralizedLoan, borrower } = await loadFixture(deployCollateralizedLoanFixture);

      const collateralAmount = ethers.parseEther("1");
      const interestRate = 10; // 10%
      const duration = 60 * 60 * 24 * 7; // 1 week

      const latestBlock = await ethers.provider.getBlock("latest");
      const expectedDueDate = latestBlock.timestamp + duration;

      
    });

    it("Should not let a borrower request a loan with zero collateral", async function () {
      const { collateralizedLoan, borrower } = await loadFixture(deployCollateralizedLoanFixture);

      await expect(
        collateralizedLoan
          .connect(borrower)
          .depositCollateralAndRequestLoan(10, 60 * 60 * 24 * 7, { value: 0 })
      ).to.be.revertedWith("Collateral amount must be greater than 0");
    });
  });

  describe("Funding a Loan", function () {
    it("Allows a lender to fund a requested loan", async function () {
      const { collateralizedLoan, borrower, lender } = await loadFixture(deployCollateralizedLoanFixture);

      const collateralAmount = ethers.parseEther("1");
      const interestRate = 10;
      const duration = 60 * 60 * 24 * 7;

      await collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(interestRate, duration, { value: collateralAmount });

      const loanAmount = collateralAmount * 2n;
      await expect(collateralizedLoan.connect(lender).fundLoan(0, { value: loanAmount }))
        .to.emit(collateralizedLoan, "LoanFunded")
        .withArgs(0, lender.address);
    });

    it("Should not allow funding with incorrect loan amount", async function () {
      const { collateralizedLoan, borrower, lender } = await loadFixture(deployCollateralizedLoanFixture);

      const collateralAmount = ethers.parseEther("1");
      const interestRate = 10;
      const duration = 60 * 60 * 24 * 7;

      await collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(interestRate, duration, { value: collateralAmount });

      const incorrectLoanAmount = ethers.parseEther("1");
      await expect(collateralizedLoan.connect(lender).fundLoan(0, { value: incorrectLoanAmount })).to.be.revertedWith(
        "Incorrect loan amount"
      );
    });
  });

  describe("Repaying a Loan", function () {
    it("Enables the borrower to repay the loan fully", async function () {
      const { collateralizedLoan, borrower, lender } = await loadFixture(deployCollateralizedLoanFixture);

      const collateralAmount = ethers.parseEther("1");
      const interestRate = 10;
      const duration = 60 * 60 * 24 * 7;

      await collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(interestRate, duration, { value: collateralAmount });

      const loanAmount = collateralAmount * 2n;
      await collateralizedLoan.connect(lender).fundLoan(0, { value: loanAmount });

      const repaymentAmount = loanAmount + (loanAmount * BigInt(interestRate)) / 100n;
      await expect(collateralizedLoan.connect(borrower).repayLoan(0, { value: repaymentAmount }))
        .to.emit(collateralizedLoan, "LoanRepaid")
        .withArgs(0, borrower.address);
    });

    it("Should not allow repayment with incorrect amount", async function () {
      const { collateralizedLoan, borrower, lender } = await loadFixture(deployCollateralizedLoanFixture);

      const collateralAmount = ethers.parseEther("1");
      const interestRate = 10;
      const duration = 60 * 60 * 24 * 7;

      await collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(interestRate, duration, { value: collateralAmount });

      const loanAmount = collateralAmount * 2n;
      await collateralizedLoan.connect(lender).fundLoan(0, { value: loanAmount });

      const incorrectRepaymentAmount = loanAmount;
      await expect(collateralizedLoan.connect(borrower).repayLoan(0, { value: incorrectRepaymentAmount })).to.be.revertedWith(
        "Incorrect repayment amount"
      );
    });
  });

  describe("Claiming Collateral", function () {
    it("Permits the lender to claim collateral if the loan isn't repaid on time", async function () {
      const { collateralizedLoan, borrower, lender } = await loadFixture(deployCollateralizedLoanFixture);

      const collateralAmount = ethers.parseEther("1");
      const interestRate = 10;
      const duration = 60 * 60 * 24 * 7;

      await collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(interestRate, duration, { value: collateralAmount });

      const loanAmount = collateralAmount * 2n;
      await collateralizedLoan.connect(lender).fundLoan(0, { value: loanAmount });


      await ethers.provider.send("evm_increaseTime", [duration]);
      await ethers.provider.send("evm_mine");

      await expect(collateralizedLoan.connect(lender).claimCollateral(0))
        .to.emit(collateralizedLoan, "CollateralClaimed")
        .withArgs(0, lender.address);
    });

    it("Should not allow collateral claim before due date", async function () {
      const { collateralizedLoan, borrower, lender } = await loadFixture(deployCollateralizedLoanFixture);

      const collateralAmount = ethers.parseEther("1");
      const interestRate = 10;
      const duration = 60 * 60 * 24 * 7;

      await collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(interestRate, duration, { value: collateralAmount });

      const loanAmount = collateralAmount * 2n;
      await collateralizedLoan.connect(lender).fundLoan(0, { value: loanAmount });

      await expect(collateralizedLoan.connect(lender).claimCollateral(0)).to.be.revertedWith("Loan is not due yet");
    });
  });
});
