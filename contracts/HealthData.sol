// Specifies the version of Solidity, using semantic versioning.
// Learn more: https://solidity.readthedocs.io/en/v0.5.10/layout-of-source-files.html#pragma
pragma solidity ^0.8.1;


import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
// Specifies the version of Solidity, using semantic versioning.

import "@openzeppelin/contracts/utils/Counters.sol";

// Defines a contract named `HelloWorld`.
// A contract is a collection of functions and data (its state). Once deployed, a contract resides at a specific address on the Ethereum blockchain. Learn more: https://solidity.readthedocs.io/en/v0.5.10/structure-of-a-contract.html
contract HealthData is  ERC721Enumerable  {
    using EnumerableSet for EnumerableSet.AddressSet;
    
    using Strings for uint256;

    bytes32 public constant ADMIN = keccak256("ADMIN");
    bytes32 public constant READ = keccak256("READ");
    bytes32 public constant WRITE = keccak256("WRITE");
    bytes32 public constant SHARE = keccak256("SHARE");

    // Optional mapping for token URIs
    mapping(uint256 => string) private _tokenURIs;

    using Strings for uint256;

    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    
    constructor () public ERC721 ("Health Data", "HDTA"){}
    
    
    mapping (uint256 => address) private _tokenIdToResourceAddress;
    mapping (address => uint256) private _resourceAddressToToken;

    
    mapping (address => EnumerableSet.AddressSet) private _verifiedBy;
    mapping (address => EnumerableSet.AddressSet) private _sharedWith;
    mapping (address => mapping (bytes32 => EnumerableSet.AddressSet)) private _resourcePermissions;
    mapping (address => mapping (bytes32 => EnumerableSet.AddressSet)) private _accountPermissions;


    /**
     * @dev Mint a new piece of health information
     */
    function mintHealthData(address resourceAddress, string memory _tokenURI) public returns (uint256) {
        
        uint256 existingTokenId = _tokenIdByResourceAddress(resourceAddress);
        require(!_exists(existingTokenId), "HealthData: Resource Address already exists");

        _tokenIds.increment();

        uint256 newItemId = _tokenIds.current();
        _mint(msg.sender, newItemId);
        _setTokenURI(newItemId, _tokenURI);
        _setTokenResourceAddress(newItemId, resourceAddress);
        _grantResourceRole(msg.sender, resourceAddress, ADMIN);
        return newItemId;
    }
    /**
     * @dev Mint a new piece of health information
     */
    function getResources() public view returns (address[] memory){
        address[] memory resources;
        uint32 index = 0;

        address[] memory resources_admin = _accountPermissions[msg.sender][ADMIN].values();
        for(uint i=0; i<resources_admin.length; i++) {
            resources[++index] = resources_admin[i];
        }
        address[] memory resources_read = _accountPermissions[msg.sender][READ].values();
        for(uint i=0; i<resources_read.length; i++) {
            resources[++index] = resources_read[i];
        }
        return resources;
    }
    /**
     * @dev Mint a new piece of health information
     */
    function resourceExists(address resourceAddress) public view returns (bool){
        return _resourceExists(resourceAddress);
    }
    /**
     * @dev Mint a new piece of health information
     */
    function hasResourceRole(address target, address resourceAddress, bytes32 permission) public view returns (bool){
        return _hasResourceRole(target, resourceAddress, permission);
    }
    /**
     * @dev Mint a new piece of health information
     */
    function _hasResourceRole(address target, address resourceAddress, bytes32 permission) private view returns (bool){
        return _accountPermissions[target][permission].contains(resourceAddress);
    }
    /**
     * @dev Mint a new piece of health information
     */
    function grantResourceRole(address target, address resourceAddress, bytes32 permission) public {
        _grantResourceRole(target,resourceAddress, permission);
    }
    /**
     * @dev Mint a new piece of health information
     */
    function _grantResourceRole(address target, address resourceAddress, bytes32 permission) internal {
        require(_resourceExists(resourceAddress), "ERC721URIStorage: Sharing with nonexistent resource");
        
        if(_hasResourceRole(target, resourceAddress, permission)){
            return;
        }

        _resourcePermissions[resourceAddress][permission].add(resourceAddress);
        _accountPermissions[target][permission].add(target);
    }
    /**
     * @dev Mint a new piece of health information
     */
    function _revokeResourceRole(address target, address resourceAddress, bytes32 permission) internal {
        require(_resourceExists(resourceAddress), "ERC721URIStorage: Sharing with nonexistent resource");
        
        if(!_hasResourceRole(target, resourceAddress, permission)){
            return;
        }
        
        _resourcePermissions[resourceAddress][permission].remove(resourceAddress);
        _accountPermissions[target][permission].remove(target);
    }
    /**
     * @dev See {IERC721Metadata-tokenURI}.
     */
    function _resourceExists(address resourceAddress) internal view virtual returns (bool) {
        require(resourceAddress != address(0),  "HealthData: unable to assign no resource to a token");
        uint256 _tokenId = _resourceAddressToToken[resourceAddress];
        return _exists(_tokenId);
    }

    /**
     * @dev See {IERC721Metadata-tokenURI}.
     */
    function _tokenIdByResourceAddress(address resourceAddress) internal view virtual  returns (uint256) {
        require(resourceAddress != address(0),  "HealthData: unable to assign no resource to a token");

        uint256 _tokenId = _resourceAddressToToken[resourceAddress];

        return _tokenId;
    }


    /**
     * @dev Base URI for computing {tokenURI}. If set, the resulting URI for each
     * token will be the concatenation of the `baseURI` and the `tokenId`. Empty
     * by default, can be overriden in child contracts.
     */
    function _setTokenResourceAddress(uint256 tokenId, address resourceAddress) internal virtual {
        require(resourceAddress != address(0),  "HealthData: unable to assign no resource to a token");

        address owner = this.ownerOf(tokenId);
        require(owner == msg.sender, "HealthData: not owner of token and cant assign the tokens address");

        address existingResourceAddress = _tokenIdToResourceAddress[tokenId];
        require(existingResourceAddress == address(0) || existingResourceAddress == resourceAddress, "HealthData: Unable to assign different address to the same token");

        uint256 existingTokenId = _resourceAddressToToken[resourceAddress];
        require(existingTokenId == 0 || existingTokenId == tokenId, "HealthData: Unable to assign different token to the same resource");

        _resourceAddressToToken[resourceAddress] = tokenId;
        _tokenIdToResourceAddress[tokenId] = resourceAddress;
    }

    /**
     * @dev Base URI for computing {tokenURI}. If set, the resulting URI for each
     * token will be the concatenation of the `baseURI` and the `tokenId`. Empty
     * by default, can be overriden in child contracts.
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return "";
    }

    /**
     * @dev See {IERC721Metadata-tokenURI}.
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721URIStorage: URI query for nonexistent token");

        string memory _tokenURI = _tokenURIs[tokenId];
        string memory base = _baseURI();

        // If there is no base URI, return the token URI.
        if (bytes(base).length == 0) {
            return _tokenURI;
        }
        // If both are set, concatenate the baseURI and tokenURI (via abi.encodePacked).
        if (bytes(_tokenURI).length > 0) {
            return string(abi.encodePacked(base, _tokenURI));
        }

        return super.tokenURI(tokenId);
    }

    /**
     * @dev Sets `_tokenURI` as the tokenURI of `tokenId`.
     *
     * Requirements:
     *
     * - `tokenId` must exist.
     */
    function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal virtual {
        require(_exists(tokenId), "ERC721URIStorage: URI set of nonexistent token");
        _tokenURIs[tokenId] = _tokenURI;
    }

    /**
     * @dev Destroys `tokenId`.
     * The approval is cleared when the token is burned.
     *
     * Requirements:
     *
     * - `tokenId` must exist.
     *
     * Emits a {Transfer} event.
     */
    function _burn(uint256 tokenId) internal virtual override {
        super._burn(tokenId);

        if (bytes(_tokenURIs[tokenId]).length != 0) {
            delete _tokenURIs[tokenId];
        }
    }

}