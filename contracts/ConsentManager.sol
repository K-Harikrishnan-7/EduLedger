// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ConsentManager
/// @notice Manages student consent for company access to academic credentials
contract ConsentManager {
    
    struct ConsentRequest {
        address company;
        address student;
        bool isApproved;
        uint256 expiryDate;
        bool isActive;
        uint256 requestedDate;
        string companyName;  // stored for display
    }
    
    mapping(bytes32 => ConsentRequest) public consents;
    mapping(address => bytes32[]) public studentConsents;
    mapping(address => bytes32[]) public companyConsents;
    
    event ConsentRequested(bytes32 indexed consentId, address indexed company, address indexed student, string companyName);
    event ConsentApproved(bytes32 indexed consentId, uint256 expiryDate);
    event ConsentRevoked(bytes32 indexed consentId);
    
    /// @notice Company requests consent from a student
    /// @param student Student's wallet address
    /// @param companyName Human-readable company name
    function requestConsent(address student, string memory companyName) external returns (bytes32) {
        require(student != address(0), "Invalid student address");
        require(bytes(companyName).length > 0, "Company name required");
        
        bytes32 consentId = keccak256(
            abi.encodePacked(msg.sender, student, block.timestamp)
        );
        
        consents[consentId] = ConsentRequest({
            company: msg.sender,
            student: student,
            isApproved: false,
            expiryDate: 0,
            isActive: true,
            requestedDate: block.timestamp,
            companyName: companyName
        });
        
        studentConsents[student].push(consentId);
        companyConsents[msg.sender].push(consentId);
        
        emit ConsentRequested(consentId, msg.sender, student, companyName);
        
        return consentId;
    }
    
    /// @notice Student approves a consent request
    /// @param consentId The consent request ID
    /// @param durationDays How many days the consent lasts
    function approveConsent(bytes32 consentId, uint256 durationDays) external {
        ConsentRequest storage consent = consents[consentId];
        require(consent.student == msg.sender, "Not your consent request");
        require(consent.isActive, "Consent not active");
        require(!consent.isApproved, "Already approved");
        require(durationDays > 0 && durationDays <= 365, "Duration must be 1-365 days");
        
        consent.isApproved = true;
        consent.expiryDate = block.timestamp + (durationDays * 1 days);
        
        emit ConsentApproved(consentId, consent.expiryDate);
    }
    
    /// @notice Student revokes a previously approved consent
    function revokeConsent(bytes32 consentId) external {
        ConsentRequest storage consent = consents[consentId];
        require(consent.student == msg.sender, "Not your consent request");
        require(consent.isActive, "Already inactive");
        
        consent.isActive = false;
        consent.isApproved = false;
        
        emit ConsentRevoked(consentId);
    }
    
    /// @notice Check if a company has valid (active + approved + not expired) access to a student
    function hasAccess(address company, address student) 
        external 
        view 
        returns (bool) 
    {
        bytes32[] memory studentConsentIds = studentConsents[student];
        
        for (uint i = 0; i < studentConsentIds.length; i++) {
            ConsentRequest memory consent = consents[studentConsentIds[i]];
            
            if (
                consent.company == company &&
                consent.student == student &&
                consent.isApproved &&
                consent.isActive &&
                consent.expiryDate > block.timestamp
            ) {
                return true;
            }
        }
        
        return false;
    }
    
    /// @notice Get all consent IDs for a student
    function getStudentConsents(address student) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return studentConsents[student];
    }
    
    /// @notice Get all consent IDs created by a company
    function getCompanyConsents(address company) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return companyConsents[company];
    }
    
    /// @notice Get details of a consent request
    function getConsentDetails(bytes32 consentId) 
        external 
        view 
        returns (ConsentRequest memory) 
    {
        return consents[consentId];
    }
}
