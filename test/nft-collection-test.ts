import { expect } from "chai";
// @ts-ignore
import { ethers } from "hardhat";
import { NFTCollection } from "../typechain-types/NFTCollection.sol/NFTCollection.js";

describe("NFTCollection", function () {
    let nftCollection: NFTCollection;
    let owner: any, addr1: any, addr2: any;
    let MINTER_ROLE: string;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        // 使用合约工厂获取实例，TypeChain会自动提供类型
        const NFTCollectionFactory = await ethers.getContractFactory("NFTCollection");
        nftCollection = await NFTCollectionFactory.deploy();
        await nftCollection.waitForDeployment();

        MINTER_ROLE = await nftCollection.MINTER_ROLE();
    });

    describe("Deployment & Access Control", function () {
        it("Should set the right owner and grant MINTER_ROLE to owner", async function () {
            expect(await nftCollection.owner()).to.equal(owner.address);
            expect(await nftCollection.hasRole(MINTER_ROLE, owner.address)).to.be.true;
        });
    });

    describe("Minting NFTs", function () {
        it("Should allow MINTER_ROLE to mint NFTs with correct attributes", async function () {
            const tokenURI = "ipfs://test/1";
            const name = "Warrior";
            const description = "A brave warrior";
            const rarity = 1; // Rare
            const attack = 25;
            const defense = 10;

            await nftCollection.mint(
                addr1.address,
                tokenURI,
                name,
                description,
                rarity,
                attack,
                defense
            );

            expect(await nftCollection.ownerOf(0n)).to.equal(addr1.address);
            expect(await nftCollection.tokenURI(0n)).to.equal(tokenURI);

            const attributes = await nftCollection.tokenAttributes(0n);
            expect(attributes.name).to.equal(name);
            expect(attributes.rarity).to.equal(rarity);
            expect(attributes.attack).to.equal(attack);
            expect(attributes.defense).to.equal(defense);
        });

        it("Should reject minting from accounts without MINTER_ROLE", async function () {
            await expect(
                nftCollection.connect(addr1).mint(
                    addr1.address,
                    "ipfs://test/2",
                    "Mage",
                    "A powerful mage",
                    2,
                    50,
                    30
                )
            ).to.be.revertedWithCustomError(nftCollection, "AccessControlUnauthorizedAccount");
        });

        it("Should correctly grant and revoke MINTER_ROLE", async function () {
            await nftCollection.grantRole(MINTER_ROLE, addr1.address);
            expect(await nftCollection.hasRole(MINTER_ROLE, addr1.address)).to.be.true;

            await nftCollection.connect(addr1).mint(addr2.address, "ipfs://test/3", "Thief", "A sneaky thief", 0, 15, 5);
            expect(await nftCollection.ownerOf(0n)).to.equal(addr2.address);

            await nftCollection.revokeRole(MINTER_ROLE, addr1.address);
            expect(await nftCollection.hasRole(MINTER_ROLE, addr1.address)).to.be.false;

            await expect(
                nftCollection.connect(addr1).mint(addr2.address, "ipfs://test/4", "Priest", "A holy priest", 1, 20, 20)
            ).to.be.revertedWithCustomError(nftCollection, "AccessControlUnauthorizedAccount");
        });
    });
});