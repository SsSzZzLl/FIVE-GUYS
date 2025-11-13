// scripts/deploy-all.ts
import hardhat from "hardhat";
const { ethers, run, network } = hardhat;

async function verifyContract(address: string, constructorArguments: any[]) {
    console.log(`🔍 正在验证合约 ${address}...`);
    try {
        await run("verify:verify", { address, constructorArguments });
        console.log(`✅ 合约 ${address} 验证成功！`);
    } catch (error: any) {
        if (error.message.includes("already verified")) {
            console.log(`ℹ️ 合约 ${address} 已验证，无需重复验证`);
        } else {
            console.error(`❌ 合约 ${address} 验证失败:`, error.message);
        }
    }
}

async function main() {
    const networkName = network.name as string;
    const [deployer] = await ethers.getSigners();

    console.log(`🚀 当前网络: ${networkName}`);
    console.log(`🚀 部署者: ${deployer.address}`);
    console.log("🚀 开始部署 NFT 盲盒系统...");

    const ERC20TokenFactory = await ethers.getContractFactory("ERC20Token");
    const erc20Token = await ERC20TokenFactory.deploy();
    await erc20Token.waitForDeployment();
    const erc20Addr = await erc20Token.getAddress();
    console.log(`✅ ERC20Token: ${erc20Addr}`);

    const NFTCollectionFactory = await ethers.getContractFactory("NFTCollection");
    const nftCollection = await NFTCollectionFactory.deploy();
    await nftCollection.waitForDeployment();
    const nftAddr = await nftCollection.getAddress();
    console.log(`✅ NFTCollection: ${nftAddr}`);

    const TICKET_PRICE = ethers.parseUnits("100", 18);
    const BlindBoxFactory = await ethers.getContractFactory("BlindBox");
    const blindBox = await BlindBoxFactory.deploy(erc20Addr, nftAddr, TICKET_PRICE);
    await blindBox.waitForDeployment();
    const blindBoxAddr = await blindBox.getAddress();
    console.log(`✅ BlindBox: ${blindBoxAddr}`);

    const MINTER_ROLE = await nftCollection.MINTER_ROLE();
    await nftCollection.grantRole(MINTER_ROLE, blindBoxAddr);
    console.log(`✅ 已授权 BlindBox 铸造NFT`);

    const CardSynthesisFactory = await ethers.getContractFactory("CardSynthesis");
    const cardSynthesis = await CardSynthesisFactory.deploy(nftAddr);
    await cardSynthesis.waitForDeployment();
    const synthesisAddr = await cardSynthesis.getAddress();
    console.log(`✅ CardSynthesis: ${synthesisAddr}`);

    const MarketplaceFactory = await ethers.getContractFactory("Marketplace");
    const marketplace = await MarketplaceFactory.deploy(erc20Addr, nftAddr);
    await marketplace.waitForDeployment();
    const marketplaceAddr = await marketplace.getAddress();
    console.log(`✅ Marketplace: ${marketplaceAddr}`);

    console.log("\n⌛ 等待 60 秒区块确认...");
    await new Promise((resolve) => setTimeout(resolve, 60000));

    const canVerify = networkName !== "hardhat" && networkName !== "localhost" && !!process.env.ETHERSCAN_API_KEY;
    if (canVerify) {
        console.log("\n🚀 开始验证合约...");
        await verifyContract(erc20Addr, []);
        await verifyContract(nftAddr, []);
        await verifyContract(blindBoxAddr, [erc20Addr, nftAddr, TICKET_PRICE]);
        await verifyContract(synthesisAddr, [nftAddr]);
        await verifyContract(marketplaceAddr, [erc20Addr, nftAddr]);
    } else {
        console.log("⚠️ 当前网络不支持或未配置 ETHERSCAN_API_KEY，跳过验证");
    }

    console.log("\n📋 合约地址汇总：");
    console.log(`- ERC20Token: ${erc20Addr}`);
    console.log(`- NFTCollection: ${nftAddr}`);
    console.log(`- BlindBox: ${blindBoxAddr}`);
    console.log(`- CardSynthesis: ${synthesisAddr}`);
    console.log(`- Marketplace: ${marketplaceAddr}`);
}

main().catch((err) => {
    console.error("❌ 部署失败:", err);
    process.exitCode = 1;
});
