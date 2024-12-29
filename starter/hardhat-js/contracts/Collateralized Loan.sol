// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Collateralized Loan Contract
contract CollateralizedLoan {
    // Define the structure of a loan
    struct Loan {
        address borrower;
        address lender;
        uint collateralAmount;
        uint loanAmount;
        uint interestRate;
        uint dueDate;
        bool isFunded;
        bool isRepaid;
    }

    // Create a mapping to manage the loans
    mapping(uint => Loan) public loans;
    uint public nextLoanId;

    // Events
    event LoanRequested(uint loanId, address indexed borrower, uint collateralAmount, uint loanAmount, uint interestRate, uint dueDate);
    event LoanFunded(uint loanId, address indexed lender);
    event LoanRepaid(uint loanId, address indexed borrower);
    event CollateralClaimed(uint loanId, address indexed lender);

    // Custom Modifiers
    modifier loanExists(uint _loanId) {
        require(loans[_loanId].borrower != address(0), "Loan does not exist");
        _;
    }

    modifier notFunded(uint _loanId) {
        require(!loans[_loanId].isFunded, "Loan is already funded");
        _;
    }

    // Function to deposit collateral and request a loan
    function depositCollateralAndRequestLoan(uint _interestRate, uint _duration) external payable {
        require(msg.value > 0, "Collateral amount must be greater than 0");

        uint loanAmount = msg.value * 2; // Example: loan amount is 2x the collateral
        uint dueDate = block.timestamp + _duration;

        loans[nextLoanId] = Loan({
            borrower: msg.sender,
            lender: address(0),
            collateralAmount: msg.value,
            loanAmount: loanAmount,
            interestRate: _interestRate,
            dueDate: dueDate,
            isFunded: false,
            isRepaid: false
        });

        emit LoanRequested(nextLoanId, msg.sender, msg.value, loanAmount, _interestRate, dueDate);
        nextLoanId++;
    }

    // Function to fund a loan
    function fundLoan(uint _loanId) external payable loanExists(_loanId) notFunded(_loanId) {
        Loan storage loan = loans[_loanId];
        require(msg.value == loan.loanAmount, "Incorrect loan amount");

        loan.lender = msg.sender;
        loan.isFunded = true;

        payable(loan.borrower).transfer(loan.loanAmount);

        emit LoanFunded(_loanId, msg.sender);
    }

    // Function to repay a loan
    function repayLoan(uint _loanId) external payable loanExists(_loanId) {
        Loan storage loan = loans[_loanId];
        require(msg.sender == loan.borrower, "Only the borrower can repay the loan");
        require(loan.isFunded, "Loan is not funded");
        require(!loan.isRepaid, "Loan is already repaid");

        uint repaymentAmount = loan.loanAmount + (loan.loanAmount * loan.interestRate / 100);
        require(msg.value == repaymentAmount, "Incorrect repayment amount");

        loan.isRepaid = true;

        payable(loan.lender).transfer(repaymentAmount);

        emit LoanRepaid(_loanId, msg.sender);
    }

    // Function to claim collateral on default
    function claimCollateral(uint _loanId) external loanExists(_loanId) {
        Loan storage loan = loans[_loanId];
        require(msg.sender == loan.lender, "Only the lender can claim the collateral");
        require(block.timestamp > loan.dueDate, "Loan is not due yet");
        require(!loan.isRepaid, "Loan is already repaid");

        loan.isRepaid = true; // Prevent re-entry

        payable(loan.lender).transfer(loan.collateralAmount);

        emit CollateralClaimed(_loanId, msg.sender);
    }
}