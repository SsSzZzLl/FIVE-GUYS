// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./NFTCollection.sol";
import "./libraries/Random.sol";

contract CardSynthesis is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    uint8 private constant MAX_RARITY = 3;
    uint256 public constant SYNTHESIS_FEE = 500 * 10 ** 18; // 合成手续费
    uint256 public constant FAILURE_RATE = 10; // 10% 失败率

    IERC20 public immutable gameToken;
    NFTCollection public immutable nftCollection;

    /// @notice 合成卡片使用的元数据 CID
    string public metadataCID;
    string[4] private _rarityFolders = ["common", "rare", "epic", "legendary"];

    /// @notice 稀有度对应的未抽取/已抽取池
    mapping(uint8 => uint256[]) private _unclaimedPool;
    mapping(uint8 => uint256[]) private _claimedPool;
    uint256[4] public raritySupplyLimits;

    struct FusionResult {
        string name;
        string description;
        uint256 attack;
        uint256 defense;
    }

    event CardSynthesized(
        address indexed user,
        uint8 inputRarity,
        bool success,
        uint8 outputRarity,
        uint256 newTokenId,
        uint256 metadataIndex
    );
    event MetadataCIDUpdated(string newCID);
    event PoolReplenished(uint8 indexed rarity, uint256 amountAdded);

    constructor(
        address _gameToken,
        address _nftCollection,
        string memory _metadataCID,
        uint256[4] memory _rarityLimits
    ) {
        require(_gameToken != address(0), "Invalid GTK address");
        require(_nftCollection != address(0), "Invalid collection address");

        gameToken = IERC20(_gameToken);
        nftCollection = NFTCollection(_nftCollection);
        metadataCID = _metadataCID;
        raritySupplyLimits = _rarityLimits;

        for (uint8 rarity = 0; rarity < 4; rarity++) {
            uint256 limit = _rarityLimits[rarity];
            for (uint256 index = 1; index <= limit; index++) {
                _unclaimedPool[rarity].push(index);
            }
        }

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    function synthesize(uint256[] calldata tokenIds) external {
        require(tokenIds.length == 5, "Need 5 tokens");
        require(bytes(metadataCID).length > 0, "Metadata CID not set");

        NFTCollection.TokenAttributes memory firstAttrs = nftCollection.getTokenAttributes(tokenIds[0]);
        uint8 rarity = firstAttrs.rarity;
        require(rarity < MAX_RARITY, "Legendary cannot synthesize");

        require(gameToken.allowance(msg.sender, address(this)) >= SYNTHESIS_FEE, "Insufficient allowance");
        require(gameToken.balanceOf(msg.sender) >= SYNTHESIS_FEE, "Insufficient balance");
        bool feeTransferred = gameToken.transferFrom(msg.sender, address(this), SYNTHESIS_FEE);
        require(feeTransferred, "GTK transfer failed");

        uint256 totalAttack;
        uint256 totalDefense;

        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            require(nftCollection.ownerOf(tokenId) == msg.sender, "Not owner");
            NFTCollection.TokenAttributes memory attrs = nftCollection.getTokenAttributes(tokenId);
            require(attrs.rarity == rarity, "Rarity mismatch");

            totalAttack += attrs.attack;
            totalDefense += attrs.defense;

            nftCollection.transferFrom(msg.sender, address(this), tokenId);
            nftCollection.burn(tokenId);
        }

        bool success = Random.getRandom(100, tokenIds[0]) >= FAILURE_RATE;
        uint8 targetRarity = rarity;

        if (success) {
            uint8 upgradeRange = uint8(MAX_RARITY - rarity);
            if (upgradeRange > 0) {
                uint8 upgradeSteps = uint8(1 + Random.getRandom(upgradeRange, block.prevrandao));
                targetRarity = rarity + upgradeSteps;
                if (targetRarity > MAX_RARITY) {
                    targetRarity = MAX_RARITY;
                }
            }
        }

        uint256 metadataIndex = _drawMetadataIndex(targetRarity, tokenIds);
        FusionResult memory fusionResult = _buildFusionResult(
            totalAttack,
            totalDefense,
            tokenIds.length,
            rarity,
            targetRarity,
            metadataIndex,
            success
        );

        nftCollection.mint(
            msg.sender,
            _composeTokenURI(targetRarity, metadataIndex),
            fusionResult.name,
            fusionResult.description,
            targetRarity,
            fusionResult.attack,
            fusionResult.defense
        );

        uint256 newTokenId = nftCollection.nextTokenId() - 1;
        emit CardSynthesized(msg.sender, rarity, success, targetRarity, newTokenId, metadataIndex);
    }

    function setMetadataCID(string calldata newCID) external onlyRole(ADMIN_ROLE) {
        require(bytes(newCID).length > 0, "CID required");
        metadataCID = newCID;
        emit MetadataCIDUpdated(newCID);
    }

    function replenishPool(uint8 rarity, uint256[] calldata indices) external onlyRole(ADMIN_ROLE) {
        require(rarity <= MAX_RARITY, "Invalid rarity");
        require(indices.length > 0, "No indices");
        for (uint256 i = 0; i < indices.length; i++) {
            require(indices[i] > 0, "Invalid index");
            _unclaimedPool[rarity].push(indices[i]);
            raritySupplyLimits[rarity] += 1;
        }
        emit PoolReplenished(rarity, indices.length);
    }

    function getPoolSizes(uint8 rarity) external view returns (uint256 unclaimed, uint256 claimed) {
        return (_unclaimedPool[rarity].length, _claimedPool[rarity].length);
    }

    function _drawMetadataIndex(uint8 rarity, uint256[] calldata tokenIds) internal returns (uint256) {
        uint256[] storage pool = _unclaimedPool[rarity];
        require(pool.length > 0, "Synthesis pool empty");

        bytes32 entropy = keccak256(
            abi.encodePacked(block.timestamp, block.prevrandao, msg.sender, rarity, tokenIds)
        );
        uint256 slot = uint256(entropy) % pool.length;
        uint256 picked = pool[slot];

        if (slot != pool.length - 1) {
            pool[slot] = pool[pool.length - 1];
        }
        pool.pop();

        _claimedPool[rarity].push(picked);
        return picked;
    }

    function _buildFusionResult(
        uint256 totalAttack,
        uint256 totalDefense,
        uint256 count,
        uint8 inputRarity,
        uint8 targetRarity,
        uint256 metadataIndex,
        bool success
    ) internal view returns (FusionResult memory) {
        (string memory name, string memory description) = _composeTexts(inputRarity, targetRarity, metadataIndex, success);
        (uint256 attack, uint256 defense) = _calculateAttributes(totalAttack, totalDefense, count, targetRarity, success);
        return FusionResult({
            name: name,
            description: description,
            attack: attack,
            defense: defense
        });
    }

    function _composeTokenURI(uint8 rarity, uint256 index) internal view returns (string memory) {
        string memory base = metadataCID;
        require(bytes(base).length > 0, "Metadata CID not set");
        string memory folder = _rarityFolders[rarity];
        return string(
            abi.encodePacked(
                "ipfs://",
                base,
                "/fusion/",
                folder,
                "/",
                folder,
                "-",
                _formatIndex(index),
                ".json"
            )
        );
    }

    function _calculateAttributes(
        uint256 totalAttack,
        uint256 totalDefense,
        uint256 count,
        uint8 targetRarity,
        bool success
    ) internal view returns (uint256 attack, uint256 defense) {
        uint256 avgAttack = totalAttack / count;
        uint256 avgDefense = totalDefense / count;
        uint256 rarityMultiplier = (uint256(targetRarity) + 1) * 25;
        if (success) {
            rarityMultiplier += 20;
        } else {
            rarityMultiplier += 5;
        }

        uint256 randomSeed = uint256(
            keccak256(abi.encodePacked(block.timestamp, blockhash(block.number - 1), msg.sender))
        );
        uint256 randomAttack = Random.getRandom(120, randomSeed);
        uint256 randomDefense = Random.getRandom(90, randomSeed + avgAttack + avgDefense);

        attack = avgAttack + rarityMultiplier + randomAttack;
        defense = avgDefense + rarityMultiplier + randomDefense;
    }

    function _composeTexts(
        uint8 inputRarity,
        uint8 outputRarity,
        uint256 index,
        bool success
    ) internal pure returns (string memory name, string memory description) {
        string memory rarityName = _getRarityName(outputRarity);
        string memory paddedIndex = _formatIndex(index);

        if (success) {
            name = string(abi.encodePacked("Fusion ", rarityName, " #", paddedIndex));
            description = string(
                abi.encodePacked(
                    "Fusion success: ",
                    _getRarityName(inputRarity),
                    " -> ",
                    rarityName
                )
            );
        } else {
            name = string(abi.encodePacked("Consolation ", rarityName, " #", paddedIndex));
            description = string(
                abi.encodePacked(
                    "Fusion failed but a new ",
                    rarityName,
                    " hero arises from the ashes."
                )
            );
        }
    }

    function _formatIndex(uint256 value) internal pure returns (string memory) {
        string memory raw = Strings.toString(value);
        if (bytes(raw).length >= 3) {
            return raw;
        }
        if (bytes(raw).length == 2) {
            return string(abi.encodePacked("0", raw));
        }
        return string(abi.encodePacked("00", raw));
    }

    function _getRarityName(uint8 rarity) internal pure returns (string memory) {
        if (rarity == 0) return "Common";
        if (rarity == 1) return "Rare";
        if (rarity == 2) return "Epic";
        return "Legendary";
    }
}