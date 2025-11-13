/*import { HardhatUserConfig } from "hardhat/config";
// 1. 确保导入了这个插件
import "@nomicfoundation/hardhat-ethers";
// 你现有的其他插件
import "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import "@nomicfoundation/hardhat-ignition-ethers";
import "dotenv/config";

const config: HardhatUserConfig = {
    solidity: "0.8.24",
    networks: {
        sepolia: {
            type: "http",
            url: process.env.SEPOLIA_URL || "", // 使用 || "" 避免非空断言 !
            accounts: [process.env.PRIVATE_KEY || ""],
        },
    },
    // 合约验证配置
    verify: {
        etherscan: {
            apiKey: process.env.ETHERSCAN_API_KEY!,
        },
    },
};

export default config;
*/


import { defineConfig } from "hardhat/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import hardhatIgnitionEthers from "@nomicfoundation/hardhat-ignition-ethers";
import "dotenv/config";

function requireAnyEnv(names: string[]): string {
    for (const name of names) {
        const value = process.env[name];
        if (value && value.trim().length > 0) {
            return value;
        }
    }

    throw new Error(
        `Hardhat 配置缺少环境变量: 请在 .env 或系统环境中设置以下任一变量: ${names.join(
            ", ",
        )}`,
    );
}

const etherscanApiKey = process.env.ETHERSCAN_API_KEY?.trim();

export default defineConfig({
    plugins: [hardhatToolboxMochaEthers, hardhatIgnitionEthers],

    solidity: "0.8.20",

    networks: {
        sepolia: {
            type: "http",
            url: requireAnyEnv(["SEPOLIA_URL"]),
            accounts: [requireAnyEnv(["PRIVATE_KEY"])],
            chainId: 11155111,
        },
    },

    verify: {
        etherscan: etherscanApiKey
            ? { apiKey: etherscanApiKey }
            : { enabled: false },
    },
});
