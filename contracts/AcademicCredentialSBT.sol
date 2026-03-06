// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./UniversityRegistry.sol";

/// @title AcademicCredentialSBT
/// @notice Soulbound token (non-transferable ERC-721) for academic credentials
contract AcademicCredentialSBT is ERC721, Ownable {
    
    struct Credential {
        uint256 tokenId;
        address student;
        address university;
        string metadataURI;    // IPFS URI for metadata JSON
        uint256 issuedDate;
        bool isRevoked;
    }
    
    UniversityRegistry public universityRegistry;
    
    mapping(uint256 => Credential) public credentials;
    mapping(address => uint256[]) public studentCredentials;
    
    uint256 private _tokenIdCounter;
    
    event CredentialIssued(
        uint256 indexed tokenId,
        address indexed student,
        address indexed university,
        string metadataURI
    );
    event CredentialRevoked(uint256 indexed tokenId, address revokedBy);
    
    constructor(address _registryAddress) 
        ERC721("Academic Credential", "ACRED") 
        Ownable(msg.sender) 
    {
        require(_registryAddress != address(0), "Invalid registry address");
        universityRegistry = UniversityRegistry(_registryAddress);
    }
    
    /// @notice Mint a soulbound credential to a student wallet
    /// @param studentWallet The student's wallet address
    /// @param metadataURI IPFS URI containing credential metadata
    function mintCredential(
        address studentWallet,
        string memory metadataURI
    ) external returns (uint256) {
        require(
            universityRegistry.isVerified(msg.sender),
            "Not a verified university"
        );
        require(studentWallet != address(0), "Invalid student address");
        require(bytes(metadataURI).length > 0, "Metadata URI cannot be empty");
        
        uint256 tokenId = _tokenIdCounter++;
        
        _safeMint(studentWallet, tokenId);
        
        credentials[tokenId] = Credential({
            tokenId: tokenId,
            student: studentWallet,
            university: msg.sender,
            metadataURI: metadataURI,
            issuedDate: block.timestamp,
            isRevoked: false
        });
        
        studentCredentials[studentWallet].push(tokenId);
        
        emit CredentialIssued(tokenId, studentWallet, msg.sender, metadataURI);
        
        return tokenId;
    }
    
    // =================== SOULBOUND: Block all transfers ===================
    
    function transferFrom(address, address, uint256) public pure override {
        revert("Soulbound: Transfer not allowed");
    }
    
    function safeTransferFrom(address, address, uint256, bytes memory) 
        public 
        pure 
        override 
    {
        revert("Soulbound: Transfer not allowed");
    }
    
    // ======================================================================
    
    /// @notice Revoke a credential (only issuing university or owner can revoke)
    function revokeCredential(uint256 tokenId) external {
        require(
            credentials[tokenId].university == msg.sender || owner() == msg.sender,
            "Not authorized to revoke"
        );
        require(!credentials[tokenId].isRevoked, "Already revoked");
        credentials[tokenId].isRevoked = true;
        emit CredentialRevoked(tokenId, msg.sender);
    }
    
    /// @notice Get all token IDs owned by a student
    function getStudentCredentials(address student) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return studentCredentials[student];
    }
    
    /// @notice Get credential details by token ID
    function getCredential(uint256 tokenId) 
        external 
        view 
        returns (Credential memory) 
    {
        return credentials[tokenId];
    }
    
    /// @notice Override tokenURI to return stored IPFS metadata URI
    function tokenURI(uint256 tokenId) 
        public 
        view 
        override 
        returns (string memory) 
    {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        return credentials[tokenId].metadataURI;
    }
    
    /// @notice Total number of credentials minted
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }
}
