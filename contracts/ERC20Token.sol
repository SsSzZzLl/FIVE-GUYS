// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC20Token is ERC20, Ownable {
    // 修复：使用编译时常量10**18，替代decimals()函数调用
    uint256 public constant TOTAL_SUPPLY = 10_000_000 * 10 ** 18;

    constructor() ERC20("DongToken", "DTK") Ownable(msg.sender) {
        _mint(msg.sender, TOTAL_SUPPLY);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}