import { expect } from "chai";
import { ethers } from "hardhat";
import { GameToken, Marketplace, NFTCollection } from "../typechain-types";

describe("Marketplace", function () {
    let gameToken: GameToken;
    let nftCollection: NFTCollection;
    let marketplace: Marketplace;
    let owner: any, seller: any, buyer: any;
    const TOKEN_ID = 0n;
    const LISTING_PRICE = ethers.parseUnits("500", 18);

    beforeEach(async function () {
        [owner, seller, buyer] = await ethers.getSigners();

        // 部署合约
        const GameTokenFactory = await ethers.getContractFactory("GameToken");
        gameToken = await GameTokenFactory.deploy();
        await gameToken.waitForDeployment();

        const NFTCollectionFactory = await ethers.getContractFactory("NFTCollection");
        nftCollection = await NFTCollectionFactory.deploy();
        await nftCollection.waitForDeployment();

        const MarketplaceFactory = await ethers.getContractFactory("Marketplace");
        marketplace = await MarketplaceFactory.deploy(
            await gameToken.getAddress(),
            await nftCollection.getAddress()
        );
        await marketplace.waitForDeployment();

        // 准备测试环境
        await gameToken.transfer(seller.address, ethers.parseUnits("10000", 18));
        await gameToken.transfer(buyer.address, ethers.parseUnits("10000", 18));

        // 铸造一个测试 NFT 给卖家
        await nftCollection.mint(
            seller.address,
            "ipfs://test/market/1",
            "Market Test Card",
            "A card for marketplace testing",
            1, // Rare
            25,
            10
        );
    });

    describe("Listing NFTs", function () {
        it("Should allow owners to list their NFTs for sale", async function () {
            // 授权 Marketplace 转移 NFT
            await nftCollection.connect(seller).approve(await marketplace.getAddress(), TOKEN_ID);

            // 挂单
            await expect(marketplace.connect(seller).listCard(TOKEN_ID, LISTING_PRICE))
                .to.emit(marketplace, "Listed")
                .withArgs(TOKEN_ID, seller.address, LISTING_PRICE);

            // 检查 NFT 是否已转移到市场合约
            expect(await nftCollection.ownerOf(TOKEN_ID)).to.equal(await marketplace.getAddress());

            // 检查挂单信息
            const listing = await marketplace.listings(TOKEN_ID);
            expect(listing.seller).to.equal(seller.address);
            expect(listing.price).to.equal(LISTING_PRICE);
            expect(listing.active).to.be.true;
        });
    });

    describe("Buying NFTs", function () {
        beforeEach(async function () {
            // 先挂单
            await nftCollection.connect(seller).approve(await marketplace.getAddress(), TOKEN_ID);
            await marketplace.connect(seller).listCard(TOKEN_ID, LISTING_PRICE);
        });

        it("Should allow users to buy listed NFTs", async function () {
            const platformFee = (LISTING_PRICE * 5n) / 100n; // 5% fee
            const sellerProceeds = LISTING_PRICE - platformFee;

            // 买家授权支付
            await gameToken.connect(buyer).approve(await marketplace.getAddress(), LISTING_PRICE);

            // 购买
            await expect(marketplace.connect(buyer).buyCard(TOKEN_ID))
                .to.emit(marketplace, "Sold")
                .withArgs(TOKEN_ID, buyer.address, LISTING_PRICE);

            // 检查 NFT 所有权转移
            expect(await nftCollection.ownerOf(TOKEN_ID)).to.equal(buyer.address);

            // 检查卖家余额（平台费已扣除）
            expect(await marketplace.sellerBalances(seller.address)).to.equal(sellerProceeds);

            // 检查挂单状态
            const listing = await marketplace.listings(TOKEN_ID);
            expect(listing.active).to.be.false;
        });
    });

    describe("Withdrawing Funds", function () {
        beforeEach(async function () {
            // 挂单并购买，使卖家有余额
            await nftCollection.connect(seller).approve(await marketplace.getAddress(), TOKEN_ID);
            await marketplace.connect(seller).listCard(TOKEN_ID, LISTING_PRICE);
            await gameToken.connect(buyer).approve(await marketplace.getAddress(), LISTING_PRICE);
            await marketplace.connect(buyer).buyCard(TOKEN_ID);
        });

        it("Should allow sellers to withdraw their proceeds", async function () {
            const expectedProceeds = (LISTING_PRICE * 95n) / 100n; // 扣除5%平台费
            const initialSellerBalance = await gameToken.balanceOf(seller.address);

            await marketplace.connect(seller).withdrawFunds();

            expect(await gameToken.balanceOf(seller.address)).to.equal(initialSellerBalance + expectedProceeds);
            expect(await marketplace.sellerBalances(seller.address)).to.equal(0n);
        });
    });
});