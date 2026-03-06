// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title UniversityRegistry
/// @notice Registry of verified universities that can issue academic credentials
contract UniversityRegistry is Ownable {
    
    struct University {
        string name;
        bool isVerified;
        bool isActive;
        uint256 registeredDate;
    }
    
    mapping(address => University) public universities;
    address[] public universityList;
    
    event UniversityRegistered(address indexed wallet, string name);
    event UniversityDeactivated(address indexed wallet);
    event UniversityReactivated(address indexed wallet);
    
    constructor() Ownable(msg.sender) {}
    
    /// @notice Register a new verified university
    function registerUniversity(
        address _wallet,
        string memory _name
    ) external onlyOwner {
        require(_wallet != address(0), "Invalid address");
        require(!universities[_wallet].isVerified, "Already registered");
        require(bytes(_name).length > 0, "Name cannot be empty");
        
        universities[_wallet] = University({
            name: _name,
            isVerified: true,
            isActive: true,
            registeredDate: block.timestamp
        });
        
        universityList.push(_wallet);
        
        emit UniversityRegistered(_wallet, _name);
    }
    
    /// @notice Deactivate a university (cannot issue new credentials)
    function deactivateUniversity(address _wallet) external onlyOwner {
        require(universities[_wallet].isVerified, "Not registered");
        require(universities[_wallet].isActive, "Already inactive");
        universities[_wallet].isActive = false;
        emit UniversityDeactivated(_wallet);
    }
    
    /// @notice Reactivate a deactivated university
    function reactivateUniversity(address _wallet) external onlyOwner {
        require(universities[_wallet].isVerified, "Not registered");
        require(!universities[_wallet].isActive, "Already active");
        universities[_wallet].isActive = true;
        emit UniversityReactivated(_wallet);
    }
    
    /// @notice Check if an address is a verified and active university
    function isVerified(address _wallet) external view returns (bool) {
        return universities[_wallet].isVerified && universities[_wallet].isActive;
    }
    
    /// @notice Get total number of registered universities
    function getUniversityCount() external view returns (uint256) {
        return universityList.length;
    }
    
    /// @notice Get university details
    function getUniversityDetails(address _wallet) 
        external 
        view 
        returns (string memory name, bool active, uint256 registeredDate) 
    {
        University memory uni = universities[_wallet];
        return (uni.name, uni.isActive, uni.registeredDate);
    }
}
