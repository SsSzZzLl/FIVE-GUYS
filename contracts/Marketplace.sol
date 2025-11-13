// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./ERC20Token.sol";
import "./NFTCollection.sol";

contract Marketplace is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    ERC20Token public immutable gameToken;
    NFTCollection public immutable nftCollection;
    uint256 public constant PLATFORM_FEE_RATE = 5; // 平台手续费：5%

    struct Listing {
        address seller;
        uint256 price;
        bool active;
    }

    mapping(uint256 => Listing) public listings;

    event Listed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event Sold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price);
    event ListingCancelled(uint256 indexed tokenId, address indexed seller);

    constructor(address _gameToken, address _nftCollection) {
        require(_gameToken != address(0) && _nftCollection != address(0), "Invalid addresses");

        gameToken = ERC20Token(_gameToken);
        nftCollection = NFTCollection(_nftCollection);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // 挂单NFT
    function listCard(uint256 tokenId, uint256 price) external {
        require(nftCollection.ownerOf(tokenId) == msg.sender, "Not owner");
        require(nftCollection.getApproved(tokenId) == address(this) || nftCollection.isApprovedForAll(msg.sender, address(this)), "Not approved");
        require(price > 0, "Price must be > 0");
        require(!listings[tokenId].active, "Already listed");

        listings[tokenId] = Listing({
            seller: msg.sender,
            price: price,
            active: true
        });

        emit Listed(tokenId, msg.sender, price);
    }

    // 购买NFT
    function buyCard(uint256 tokenId) external {
        Listing storage listing = listings[tokenId];
        require(listing.active, "Listing not active");
        require(listing.seller != msg.sender, "Cannot buy own NFT");

        uint256 price = listing.price;
        uint256 platformFee = (price * PLATFORM_FEE_RATE) / 100;
        uint256 sellerProceeds = price - platformFee;

        // 校验余额和授权
        require(gameToken.balanceOf(msg.sender) >= price, "Insufficient balance");
        require(gameToken.allowance(msg.sender, address(this)) >= price, "Insufficient allowance");

        // 转移代币
        gameToken.transferFrom(msg.sender, address(this), platformFee);
        gameToken.transferFrom(msg.sender, listing.seller, sellerProceeds);

        // 转移NFT
        nftCollection.transferFrom(listing.seller, msg.sender, tokenId);

        // 标记挂单为无效
        listing.active = false;

        emit Sold(tokenId, listing.seller, msg.sender, price);
    }

    // 取消挂单
    function cancelListing(uint256 tokenId) external {
        Listing storage listing = listings[tokenId];
        require(listing.active, "Listing not active");
        require(listing.seller == msg.sender || hasRole(ADMIN_ROLE, msg.sender), "Not authorized");

        listing.active = false;
        emit ListingCancelled(tokenId, msg.sender);
    }

    function getListing(uint256 tokenId) external view returns (Listing memory) {
        return listings[tokenId];
    }

    function isListed(uint256 tokenId) external view returns (bool) {
        return listings[tokenId].active;
    }

    // 提取平台手续费
    function withdrawPlatformFees() external onlyRole(ADMIN_ROLE) {
        uint256 balance = gameToken.balanceOf(address(this));
        gameToken.transfer(msg.sender, balance);
    }
}
