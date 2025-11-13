// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library Random {
    // getRandom 读取链上环境变量，必须用 view 修饰
    function getRandom(uint256 max, uint256 seed) internal view returns (uint256) {
        uint256 random = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, seed, block.prevrandao)));
        return random % max;
    }

    // getRarity 调用 view 函数，自身也需用 view
    function getRarity() internal view returns (uint8) {
        uint256 rand = getRandom(100, 0);
        if (rand < 60) return 0;   // 普通
        if (rand < 90) return 1;   // 稀有
        if (rand < 98) return 2;   // 史诗
        return 3;                  // 传说
    }
}