// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TokenVendor is AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    IERC20 public immutable token;
    uint256 public tokensPerEth; // number of token units (18 decimals) per 1 ETH (1e18)

    event TokensPurchased(address indexed buyer, uint256 ethSpent, uint256 tokenAmount);
    event RateUpdated(uint256 oldRate, uint256 newRate);
    event TokensWithdrawn(address indexed to, uint256 amount);
    event EthWithdrawn(address indexed to, uint256 amount);

    constructor(address tokenAddress, uint256 rate) {
        require(tokenAddress != address(0), "Token address required");
        require(rate > 0, "Rate must be positive");

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);

        token = IERC20(tokenAddress);
        tokensPerEth = rate;
    }

    function setTokensPerEth(uint256 newRate) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newRate > 0, "Rate must be positive");
        emit RateUpdated(tokensPerEth, newRate);
        tokensPerEth = newRate;
    }

    function buyTokens() public payable {
        require(msg.value > 0, "ETH required");

        uint256 tokenAmount = (msg.value * tokensPerEth) / 1e18;
        require(tokenAmount > 0, "Amount too small");
        require(token.balanceOf(address(this)) >= tokenAmount, "Vendor out of liquidity");

        bool sent = token.transfer(msg.sender, tokenAmount);
        require(sent, "Transfer failed");

        emit TokensPurchased(msg.sender, msg.value, tokenAmount);
    }

    function withdrawTokens(address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(to != address(0), "Invalid recipient");
        bool sent = token.transfer(to, amount);
        require(sent, "Transfer failed");
        emit TokensWithdrawn(to, amount);
    }

    function withdrawEth(address payable to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(to != address(0), "Invalid recipient");
        require(address(this).balance >= amount, "Insufficient balance");
        to.transfer(amount);
        emit EthWithdrawn(to, amount);
    }

    receive() external payable {
        buyTokens();
    }
}

