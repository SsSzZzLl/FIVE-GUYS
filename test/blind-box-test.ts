import { expect } from "chai";
import { ethers } from "hardhat";
import { BlindBox} from "../typechain-types/BlindBox.sol/BlindBox.js";
import {NFTCollection} from "../typechain-types/index.js";
import {ERC20Token} from "../typechain-types/ERC20Token.sol/ERC20Token.js";

describe("BlindBox", function () {
    let gameToken: ERC20Token;
    let nftCollection: NFTCollection;
    let blindBox: BlindBox;
    let owner: any, addr1: any;
    let MINTER_ROLE: string;
    const TICKET_PRICE = ethers.parseUnits("100", 18);

    beforeEach(async function () {
        [owner, addr1] = await ethers.getSigners();

        // 部署 ERC20 Token
        const GameTokenFactory = await ethers.getContractFactory("GameToken");
        gameToken = await GameTokenFactory.deploy();
        await gameToken.waitForDeployment();

        // 部署 NFT Collection
        const NFTCollectionFactory = await ethers.getContractFactory("NFTCollection");
        nftCollection = await NFTCollectionFactory.deploy();
        await nftCollection.waitForDeployment();
        MINTER_ROLE = await nftCollection.MINTER_ROLE();

        // 部署 BlindBox 合约
        const BlindBoxFactory = await ethers.getContractFactory("BlindBox");
        blindBox = await BlindBoxFactory.deploy(
            await gameToken.getAddress(),
            await nftCollection.getAddress(),
            TICKET_PRICE
        );
        await blindBox.waitForDeployment();

        // 授权 BlindBox 合约 mint NFT
        await nftCollection.grantRole(MINTER_ROLE, await blindBox.getAddress());

        // 给测试账户转账
        await gameToken.transfer(addr1.address, ethers.parseUnits("1000", 18));
    });

    describe("Deployment", function () {
        it("Should initialize with correct parameters", async function () {
            expect(await blindBox.gameToken()).to.equal(await gameToken.getAddress());
            expect(await blindBox.nftCollection()).to.equal(await nftCollection.getAddress());
            expect(await blindBox.ticketPrice()).to.equal(TICKET_PRICE);
        });
    });

    describe("Buying Tickets", function () {
        it("Should allow users to buy tickets by paying ERC20 tokens", async function () {
            const ticketsToBuy = 5;
            const totalCost = TICKET_PRICE * BigInt(ticketsToBuy);

            // 授权
            await gameToken.connect(addr1).approve(await blindBox.getAddress(), totalCost);

            // 购买
            await expect(blindBox.connect(addr1).buyTicket(ticketsToBuy))
                .to.emit(blindBox, "TicketPurchased")
                .withArgs(addr1.address, ticketsToBuy);

            expect(await blindBox.totalTicketsSold()).to.equal(ticketsToBuy);
            expect(await gameToken.balanceOf(await blindBox.getAddress())).to.equal(totalCost);
        });

        it("Should reject purchases with insufficient approval or balance", async function () {
            await gameToken.connect(addr1).approve(await blindBox.getAddress(), TICKET_PRICE / 2n);

            await expect(
                blindBox.connect(addr1).buyTicket(1)
            ).to.be.revertedWith("Token transfer failed");
        });
    });

    describe("Drawing Cards", function () {
        beforeEach(async function () {
            // 购买一张票
            await gameToken.connect(addr1).approve(await blindBox.getAddress(), TICKET_PRICE);
            await blindBox.connect(addr1).buyTicket(1);
        });

        it("Should allow users to draw a card and mint an NFT", async function () {
            const initialBalance = await nftCollection.balanceOf(addr1.address);

            await expect(blindBox.connect(addr1).drawCard())
                .to.emit(blindBox, "CardDrawn")
                .withArgs(addr1.address, 0n, (await nftCollection.tokenAttributes(0n)).rarity);

            expect(await nftCollection.balanceOf(addr1.address)).to.equal(initialBalance + 1n);
            expect(await nftCollection.ownerOf(0n)).to.equal(addr1.address);
        });

        it("Should generate cards with attributes within the expected range", async function () {
            await blindBox.connect(addr1).drawCard();
            const attrs = await nftCollection.tokenAttributes(0n);

            // 根据 BlindBox 合约中的逻辑，基础属性会有小幅度波动
            // Common: attack 10-19, defense 5-9
            if (attrs.rarity === 0) {
                expect(attrs.attack).to.be.within(10, 19);
                expect(attrs.defense).to.be.within(5, 9);
            }
            // Rare: attack 25-34, defense 10-14
            else if (attrs.rarity === 1) {
                expect(attrs.attack).to.be.within(25, 34);
                expect(attrs.defense).to.be.within(10, 14);
            }
            // ... 可以为其他稀有度添加类似检查
        });
    });
});