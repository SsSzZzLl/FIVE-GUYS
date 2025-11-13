// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract NFTCollection is ERC721URIStorage, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 public nextTokenId;

    struct TokenAttributes {
        string name;
        string description;
        uint8 rarity;    // 0:普通, 1:稀有, 2:史诗, 3:传说
        uint256 attack;
        uint256 defense;
    }

    mapping(uint256 => TokenAttributes) public tokenAttributes;

    event NFTCreated(uint256 indexed tokenId, address indexed owner, uint8 rarity);

    constructor() ERC721("HeroNFT", "HNT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    function mint(
        address to,
        string memory uri,
        string memory name,
        string memory description,
        uint8 rarity,
        uint256 attack,
        uint256 defense
    ) public onlyRole(MINTER_ROLE) {
        require(rarity <= 3, "Rarity must be 0-3");
        require(bytes(uri).length > 0, "URI cannot be empty");

        uint256 tokenId = nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        tokenAttributes[tokenId] = TokenAttributes({
            name: name,
            description: description,
            rarity: rarity,
            attack: attack,
            defense: defense
        });

        emit NFTCreated(tokenId, to, rarity);
    }

    function burn(uint256 tokenId) external onlyRole(MINTER_ROLE) {
        _burn(tokenId);
        delete tokenAttributes[tokenId];
    }

    // 新增：显式返回TokenAttributes结构体的函数
    function getTokenAttributes(uint256 tokenId) public view returns (TokenAttributes memory) {
        return tokenAttributes[tokenId];
    }

    function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC721URIStorage, AccessControl)
    returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}