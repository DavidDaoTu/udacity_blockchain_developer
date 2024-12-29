// Importing necessary modules and functions from Hardhat and Chai for testing
const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

// Describing a test suite for the CollateralizedLoan contract
describe("CollateralizedLoan", function () {
  // A fixture to deploy the contract before each test. This helps in reducing code repetition.
  async function deployCollateralizedLoanFixture() {
    // Deploying the CollateralizedLoan contract and returning necessary variables
    const CollateralizedLoan = await ethers.getContractFactory("CollateralizedLoan");
    const [owner, borrower, lender] = await ethers.getSigners();
    const collateralizedLoan = await CollateralizedLoan.deploy();
    await collateralizedLoan.deployed();

    return { collateralizedLoan, owner, borrower, lender };
  }

  // Test suite for the loan request functionality
  describe("Loan Request", function () {
    it("Should let a borrower deposit collateral and request a loan", async function () {
      // Loading the fixture
      const { collateralizedLoan, borrower } = await loadFixture(deployCollateralizedLoanFixture);

      // Borrower deposits collateral and requests a loan
      const collateralAmount = ethers.utils.parseEther("1");
      const interestRate = 10; // 10%
      const duration = 60 * 60 * 24 * 7; // 1 week

      await expect(
        collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(interestRate, duration, {
          value: collateralAmount,
        })
      )
        .to.emit(collateralizedLoan, "LoanRequested")
        .withArgs(0, borrower.address, collateralAmount, collateralAmount.mul(2), interestRate, await time.latest() + duration);
    });

    it("Should not let a borrower request a loan with zero collateral", async function () {
      // Loading the fixture
      const { collateralizedLoan, borrower } = await loadFixture(deployCollateralizedLoanFixture);

      const interestRate = 10; // 10%
      const duration = 60 * 60 * 24 * 7; // 1 week

      await expect(
        collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(interestRate, duration, {
          value: 0,
        })
      ).to.be.revertedWith("Collateral amount must be greater than 0");
    });
  });

  // Test suite for funding a loan
  describe("Funding a Loan", function () {
    it("Allows a lender to fund a requested loan", async function () {
      // Loading the fixture
      const { collateralizedLoan, borrower, lender } = await loadFixture(deployCollateralizedLoanFixture);

      // Borrower deposits collateral and requests a loan
      const collateralAmount = ethers.utils.parseEther("1");
      const interestRate = 10; // 10%
      const duration = 60 * 60 * 24 * 7; // 1 week

      await collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(interestRate, duration, {
        value: collateralAmount,
      });

      // Lender funds the loan
      const loanAmount = collateralAmount.mul(2);

      await expect(
        collateralizedLoan.connect(lender).fundLoan(0, { value: loanAmount })
      )
        .to.emit(collateralizedLoan, "LoanFunded")
        .withArgs(0, lender.address);

      // Check if the borrower received the loan amount
      const borrowerBalance = await ethers.provider.getBalance(borrower.address);
      expect(borrowerBalance).to.be.gt(loanAmount);
    });

    it("Should not allow funding with incorrect loan amount", async function () {
      // Loading the fixture
      const { collateralizedLoan, borrower, lender } = await loadFixture(deployCollateralizedLoanFixture);

      // Borrower deposits collateral and requests a loan
      const collateralAmount = ethers.utils.parseEther("1");
      const interestRate = 10; // 10%
      const duration = 60 * 60 * 24 * 7; // 1 week

      await collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(interestRate, duration, {
        value: collateralAmount,
      });

      // Lender attempts to fund the loan with incorrect amount
      const incorrectLoanAmount = ethers.utils.parseEther("1");

      await expect(
        collateralizedLoan.connect(lender).fundLoan(0, { value: incorrectLoanAmount })
      ).to.be.revertedWith("Incorrect loan amount");
    });
  });

  // Test suite for repaying a loan
  describe("Repaying a Loan", function () {
    it("Enables the borrower to repay the loan fully", async function () {
      // Loading the fixture
      const { collateralizedLoan, borrower, lender } = await loadFixture(deployCollateralizedLoanFixture);

      // Borrower deposits collateral and requests a loan
      const collateralAmount = ethers.utils.parseEther("1");
      const interestRate = 10; // 10%
      const duration = 60 * 60 * 24 * 7; // 1 week

      await collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(interestRate, duration, {
        value: collateralAmount,
      });

      // Lender funds the loan
      const loanAmount = collateralAmount.mul(2);
      await collateralizedLoan.connect(lender).fundLoan(0, { value: loanAmount });

      // Borrower repays the loan
      const repaymentAmount = loanAmount.add(loanAmount.mul(interestRate).div(100));

      await expect(
        collateralizedLoan.connect(borrower).repayLoan(0, { value: repaymentAmount })
      )
        .to.emit(collateralizedLoan, "LoanRepaid")
        .withArgs(0, borrower.address);

      // Check if the lender received the repayment amount
      const lenderBalance = await ethers.provider.getBalance(lender.address);
      expect(lenderBalance).to.be.gt(repaymentAmount);
    });

    it("Should not allow repayment with incorrect amount", async function () {
      // Loading the fixture
      const { collateralizedLoan, borrower, lender } = await loadFixture(deployCollateralizedLoanFixture);

      // Borrower deposits collateral and requests a loan
      const collateralAmount = ethers.utils.parseEther("1");
      const interestRate = 10; // 10%
      const duration = 60 * 60 * 24 * 7; // 1 week

      await collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(interestRate, duration, {
        value: collateralAmount,
      });

      // Lender funds the loan
      const loanAmount = collateralAmount.mul(2);
      await collateralizedLoan.connect(lender).fundLoan(0, { value: loanAmount });

      // Borrower attempts to repay the loan with incorrect amount
      const incorrectRepaymentAmount = loanAmount;

      await expect(
        collateralizedLoan.connect(borrower).repayLoan(0, { value: incorrectRepaymentAmount })
      ).to.be.revertedWith("Incorrect repayment amount");
    });
  });

  // Test suite for claiming collateral
  describe("Claiming Collateral", function () {
    it("Permits the lender to claim collateral if the loan isn't repaid on time", async function () {
      // Loading the fixture
      const { collateralizedLoan, borrower, lender } = await loadFixture(deployCollateralizedLoanFixture);

      // Borrower deposits collateral and requests a loan
      const collateralAmount = ethers.utils.parseEther("1");
      const interestRate = 10; // 10%
      const duration = 60 * 60 * 24 * 7; // 1 week

      await collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(interestRate, duration, {
        value: collateralAmount,
      });

      // Lender funds the loan
      const loanAmount = collateralAmount.mul(2);
      await collateralizedLoan.connect(lender).fundLoan(0, { value: loanAmount });

      // Simulate passage of time
      await ethers.provider.send("evm_increaseTime", [duration + 1]);
      await ethers.provider.send("evm_mine");

      // Lender claims the collateral
      await expect(
        collateralizedLoan.connect(lender).claimCollateral(0)
      )
        .to.emit(collateralizedLoan, "CollateralClaimed")
        .withArgs(0, lender.address);

      // Check if the lender received the collateral amount
      const lenderBalance = await ethers.provider.getBalance(lender.address);
      expect(lenderBalance).to.be.gt(collateralAmount);
    });

    it("Should not allow collateral claim before due date", async function () {
      // Loading the fixture
      const { collateralizedLoan, borrower, lender } = await loadFixture(deployCollateralizedLoanFixture);

      // Borrower deposits collateral and requests a loan
      const collateralAmount = ethers.utils.parseEther("1");
      const interestRate = 10; // 10%
      const duration = 60 * 60 * 24 * 7; // 1 week

      await collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(interestRate, duration, {
        value: collateralAmount,
      });

      // Lender funds the loan
      const loanAmount = collateralAmount.mul(2);
      await collateralizedLoan.connect(lender).fundLoan(0, { value: loanAmount });

      // Lender attempts to claim the collateral before due date
      await expect(
        collateralizedLoan.connect(lender).claimCollateral(0)
      ).to.be.revertedWith("Loan is not due yet");
    });
  });
});