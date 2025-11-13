// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol"; // 补充导入，避免Strings未定义
import "./ERC20Token.sol";
import "./NFTCollection.sol";
import "./libraries/Random.sol";

contract BlindBox is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    ERC20Token public immutable gameToken;
    NFTCollection public immutable nftCollection;
    uint256 public immutable ticketPrice; // 盲盒票价格（GTK代币）
    uint256 public totalTicketsSold;
    mapping(address => uint256) public userTicketCount;
    string public metadataCID;
    uint256[4] public raritySupplyLimits = [82, 17, 54, 30];
    string[4] private _rarityFolders = ["common", "rare", "epic", "legendary"];
    mapping(uint8 => uint256) private _rarityMinted;
    mapping(uint8 => uint256[]) private _rarityAvailableTokens;

    event TicketPurchased(address indexed user, uint256 ticketCount);
    event CardDrawn(address indexed user, uint256 indexed tokenId, uint8 rarity);

    constructor(
        address _gameToken,
        address _nftCollection,
        uint256 _ticketPrice,
        string memory _metadataCID
    ) {
        require(_gameToken != address(0) && _nftCollection != address(0), "Invalid addresses");
        require(_ticketPrice > 0, "Ticket price must be > 0");
        require(bytes(_metadataCID).length > 0, "Metadata CID required");

        gameToken = ERC20Token(_gameToken);
        nftCollection = NFTCollection(_nftCollection);
        ticketPrice = _ticketPrice;
        metadataCID = _metadataCID;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);

        _initializeRarityPools();
    }

    // 购买盲盒票
    function buyTicket(uint256 ticketCount) external {
        require(ticketCount > 0, "Ticket count must be > 0");
        uint256 totalCost = ticketPrice * ticketCount;

        // 校验余额和授权
        require(gameToken.balanceOf(msg.sender) >= totalCost, "Insufficient balance");
        require(gameToken.allowance(msg.sender, address(this)) >= totalCost, "Insufficient allowance");

        // 转移代币
        gameToken.transferFrom(msg.sender, address(this), totalCost);

        // 更新票数
        userTicketCount[msg.sender] += ticketCount;
        totalTicketsSold += ticketCount;

        emit TicketPurchased(msg.sender, ticketCount);
    }

    // 抽卡（消耗1张票）
    function drawCard() external {
        require(userTicketCount[msg.sender] > 0, "No tickets left");
        userTicketCount[msg.sender] -= 1;

        // 生成随机稀有度
        uint8 rarity = Random.getRarity();

        // 生成属性（基础值+随机波动）
        (string memory name, uint256 attack, uint256 defense) = _getAttributesByRarity(rarity);

        // 铸造NFT
        require(bytes(metadataCID).length > 0, "Metadata CID not set");
        uint256 metadataIndex = _drawMetadataIndex(rarity);
        _rarityMinted[rarity] += 1;

        string memory folder = _rarityFolders[rarity];
        string memory indexString = _formatIndex(metadataIndex);
        string memory tokenURI = string(
            abi.encodePacked("ipfs://", metadataCID, "/", folder, "/", folder, "-", indexString, ".json")
        );
        nftCollection.mint(
            msg.sender,
            tokenURI,
            name,
            string(abi.encodePacked(name, " - BlindBox NFT")),
            rarity,
            attack,
            defense
        );

        uint256 tokenId = nftCollection.nextTokenId() - 1;
        emit CardDrawn(msg.sender, tokenId, rarity);
    }

    // 关键修改：将 pure 改为 view
    function _getAttributesByRarity(uint8 rarity) internal view returns (string memory, uint256, uint256) {
        if (rarity == 0) { // 普通
            return ("Common Warrior", 10 + Random.getRandom(10, 0), 5 + Random.getRandom(5, 0));
        } else if (rarity == 1) { // 稀有
            return ("Rare Mage", 25 + Random.getRandom(10, 0), 10 + Random.getRandom(5, 0));
        } else if (rarity == 2) { // 史诗
            return ("Epic Assassin", 40 + Random.getRandom(15, 0), 15 + Random.getRandom(10, 0));
        } else { // 传说
            return ("Legendary Dragon", 60 + Random.getRandom(20, 0), 30 + Random.getRandom(15, 0));
        }
    }

    // 提取合约中代币（管理员操作）
    function withdrawTokens() external onlyRole(ADMIN_ROLE) {
        uint256 balance = gameToken.balanceOf(address(this));
        gameToken.transfer(msg.sender, balance);
    }

    function setMetadataCID(string calldata _newCid) external onlyRole(ADMIN_ROLE) {
        require(bytes(_newCid).length > 0, "Metadata CID required");
        metadataCID = _newCid;
    }

    function setRaritySupplyLimits(uint256[4] calldata _limits) external onlyRole(ADMIN_ROLE) {
        for (uint8 rarity = 0; rarity < 4; rarity++) {
            require(_limits[rarity] >= _rarityMinted[rarity], "New limit below minted supply");
            if (_limits[rarity] != raritySupplyLimits[rarity]) {
                require(_rarityMinted[rarity] == 0, "Cannot change limit after minting");
                delete _rarityAvailableTokens[rarity];
                for (uint256 index = 1; index <= _limits[rarity]; index++) {
                    _rarityAvailableTokens[rarity].push(index);
                }
            }
            raritySupplyLimits[rarity] = _limits[rarity];
        }
    }

    function _formatIndex(uint256 value) internal pure returns (string memory) {
        require(value > 0, "Index out of range");
        if (value < 10) {
            return string(abi.encodePacked("00", Strings.toString(value)));
        }
        if (value < 100) {
            return string(abi.encodePacked("0", Strings.toString(value)));
        }
        return Strings.toString(value);
    }

    function _initializeRarityPools() internal {
        for (uint8 rarity = 0; rarity < 4; rarity++) {
            uint256 limit = raritySupplyLimits[rarity];
            for (uint256 index = 1; index <= limit; index++) {
                _rarityAvailableTokens[rarity].push(index);
            }
        }
    }

    function _drawMetadataIndex(uint8 rarity) internal returns (uint256) {
        uint256[] storage pool = _rarityAvailableTokens[rarity];
        uint256 remaining = pool.length;
        require(remaining > 0, "Metadata exhausted for rarity");

        uint256 randomSlot = Random.getRandom(remaining, _rarityMinted[rarity]);
        uint256 lastIndex = remaining - 1;

        uint256 selected = pool[randomSlot];
        if (randomSlot != lastIndex) {
            pool[randomSlot] = pool[lastIndex];
        }
        pool.pop();

        return selected;
    }
}