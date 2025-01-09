const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

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

      // Define loan parameters fix bug 'cannot read parseEther'
      const amountInEther ="1";
      //add utils
      const collateralAmount = ethers.parseEther(amountInEther);
      const interestRate = 10; // 10%
      const duration = 60 * 60 * 24 * 7; // 1 week

      
      // Convert Ether to Wei - older code - bug reported
      //const collateralAmount = ethers.utils.parseEther("1");
      //const interestRate = 10; // 10%
      //const duration = 60 * 60 * 24 * 7; // 1 week

      // Get the current block timestamp - fix bug
      const latestBlock = await ethers.provider.getBlock('latest');
      const expectedTimestamp = latestBlock.timestamp + duration;
      
      // Get the current block timestamp - Older block, bug reporded
      const block = await ethers.provider.getBlock('latest');
      const currentTimestamp = block.timestamp;
  
      // Perform the transaction and check emitted event - older code --- bug reported
      await expect(
       collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(interestRate, duration, { value: collateralAmount })
     )
     //await expect(
       // collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(interestRate, duration, {
        //  value: amountInWei, // Use the correct collateral amount
     //   })
     // )
        .to.emit(collateralizedLoan, "LoanRequested")

        .withArgs(0, borrower.address, collateralAmount, collateralAmount, interestRate, currentTimestamp + duration); 
       // .withArgs(0, borrower.address, interestRate, expectedTimestamp);


    });
  
  

    it("Should not let a borrower request a loan with zero collateral", async function () {
      const { collateralizedLoan, borrower } = await loadFixture(deployCollateralizedLoanFixture);
      const interestRate = 10; // 10%
      const duration = 60 * 60 * 24 * 7; // 1 week

      await expect(
        collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(interestRate, duration, { value: 0 })
      ).to.be.revertedWith("Collateral amount must be greater than 0");
    });
  });

  describe("Funding a Loan", function () {
    it("Allows a lender to fund a requested loan", async function () {
      const { collateralizedLoan, borrower, lender } = await loadFixture(deployCollateralizedLoanFixture);
      const collateralAmount = ethers.parseEther("1");
      const interestRate = 10; // 10%
      const duration = 60 * 60 * 24 * 7; // 1 week

      await collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(interestRate, duration, { value: collateralAmount });
      const loanAmount = collateralAmount*2n;

      await expect(
        collateralizedLoan.connect(lender).fundLoan(0, { value: loanAmount })
      ).to.emit(collateralizedLoan, "LoanFunded").withArgs(0, lender.address);
    });

    it("Should not allow funding with incorrect loan amount", async function () {
      const { collateralizedLoan, borrower, lender } = await loadFixture(deployCollateralizedLoanFixture);
      const collateralAmount = ethers.parseEther("1");
      const interestRate = 10; // 10%
      const duration = 60 * 60 * 24 * 7; // 1 week

      await collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(interestRate, duration, { value: collateralAmount });
      const incorrectLoanAmount = ethers.parseEther("1");

      await expect(
        collateralizedLoan.connect(lender).fundLoan(0, { value: incorrectLoanAmount })
      ).to.be.revertedWith("Incorrect loan amount");
    });
  });

  describe("Repaying a Loan", function () {
    it("Enables the borrower to repay the loan fully", async function () {
      const { collateralizedLoan, borrower, lender } = await loadFixture(deployCollateralizedLoanFixture);
      const collateralAmount = ethers.parseEther("1");
      const interestRate = 10; // 10%
      const duration = 60 * 60 * 24 * 7; // 1 week

      await collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(interestRate, duration, { value: collateralAmount });
      const loanAmount = collateralAmount*2n;
      await collateralizedLoan.connect(lender).fundLoan(0, { value: loanAmount });

      //const repaymentAmount = loanAmount.add(loanAmount.mul(interestRate).div(100));
      const repaymentAmount = loanAmount + (loanAmount * BigInt(interestRate)) / 100n;

      await expect(
        collateralizedLoan.connect(borrower).repayLoan(0, { value: repaymentAmount })
      ).to.emit(collateralizedLoan, "LoanRepaid").withArgs(0, borrower.address);
    });

    it("Should not allow repayment with incorrect amount", async function () {
      const { collateralizedLoan, borrower, lender } = await loadFixture(deployCollateralizedLoanFixture);
      const collateralAmount = ethers.parseEther("1");
      const interestRate = 10; // 10%
      const duration = 60 * 60 * 24 * 7; // 1 week

      await collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(interestRate, duration, { value: collateralAmount });
      const loanAmount = collateralAmount*2n;
      await collateralizedLoan.connect(lender).fundLoan(0, { value: loanAmount });

      const incorrectRepaymentAmount = loanAmount;

      await expect(
        collateralizedLoan.connect(borrower).repayLoan(0, { value: incorrectRepaymentAmount })
      ).to.be.revertedWith("Incorrect repayment amount");
    });
  });

  describe("Claiming Collateral", function () {
    it("Permits the lender to claim collateral if the loan isn't repaid on time", async function () {
      const { collateralizedLoan, borrower, lender } = await loadFixture(deployCollateralizedLoanFixture);
      const collateralAmount = ethers.parseEther("1");
      const interestRate = 10; // 10%
      const duration = 60 * 60 * 24 * 7; // 1 week

      await collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(interestRate, duration, { value: collateralAmount });
      const loanAmount = collateralAmount*2n;
      await collateralizedLoan.connect(lender).fundLoan(0, { value: loanAmount });

      // Increase the time in the EVM to simulate the loan duration passing
      await ethers.provider.send("evm_increaseTime", [duration + 1]);
      await ethers.provider.send("evm_mine");

      await expect(
        collateralizedLoan.connect(lender).claimCollateral(0)
      ).to.emit(collateralizedLoan, "CollateralClaimed").withArgs(0, lender.address);
    });

    it("Should not allow collateral claim before due date", async function () {
      const { collateralizedLoan, borrower, lender } = await loadFixture(deployCollateralizedLoanFixture);
      const collateralAmount = ethers.parseEther("1");
      const interestRate = 10; // 10%
      const duration = 60 * 60 * 24 * 7; // 1 week

      await collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(interestRate, duration, { value: collateralAmount });
      const loanAmount = collateralAmount*2n;
      await collateralizedLoan.connect(lender).fundLoan(0, { value: loanAmount });

      await expect(
        collateralizedLoan.connect(lender).claimCollateral(0)
      ).to.be.revertedWith("Loan is not due yet");
    });
  });
});