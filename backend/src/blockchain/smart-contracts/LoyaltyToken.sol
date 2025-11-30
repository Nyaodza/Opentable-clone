// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract OpenTableToken is ERC20, ERC20Burnable, Pausable, Ownable, ReentrancyGuard {
    uint256 public constant MAX_SUPPLY = 1000000000 * 10**18; // 1 billion tokens
    uint256 public constant INITIAL_SUPPLY = 100000000 * 10**18; // 100 million tokens
    
    mapping(address => uint256) public stakingBalance;
    mapping(address => uint256) public stakingTimestamp;
    mapping(address => uint256) public stakingDuration;
    mapping(address => bool) public isRestaurant;
    mapping(address => uint256) public loyaltyTier;
    
    uint256 public constant BRONZE_THRESHOLD = 100 * 10**18;
    uint256 public constant SILVER_THRESHOLD = 500 * 10**18;
    uint256 public constant GOLD_THRESHOLD = 1000 * 10**18;
    uint256 public constant PLATINUM_THRESHOLD = 5000 * 10**18;
    
    event TokensEarned(address indexed user, uint256 amount, string reason);
    event TokensStaked(address indexed user, uint256 amount, uint256 duration);
    event TokensUnstaked(address indexed user, uint256 amount, uint256 rewards);
    event RestaurantRegistered(address indexed restaurant);
    event LoyaltyTierUpdated(address indexed user, uint256 newTier);
    
    constructor() ERC20("OpenTable Token", "OTT") {
        _mint(msg.sender, INITIAL_SUPPLY);
    }
    
    function pause() public onlyOwner {
        _pause();
    }
    
    function unpause() public onlyOwner {
        _unpause();
    }
    
    function mint(address to, uint256 amount) public onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds maximum supply");
        _mint(to, amount);
    }
    
    function earnTokens(address user, uint256 amount, string memory reason) external onlyOwner {
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be greater than 0");
        
        _mint(user, amount);
        updateLoyaltyTier(user);
        
        emit TokensEarned(user, amount, reason);
    }
    
    function stakeTokens(uint256 amount, uint256 duration) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        require(duration >= 30 days, "Minimum staking period is 30 days");
        require(stakingBalance[msg.sender] == 0, "Already staking tokens");
        
        _transfer(msg.sender, address(this), amount);
        
        stakingBalance[msg.sender] = amount;
        stakingTimestamp[msg.sender] = block.timestamp;
        stakingDuration[msg.sender] = duration;
        
        emit TokensStaked(msg.sender, amount, duration);
    }
    
    function unstakeTokens() external nonReentrant whenNotPaused {
        require(stakingBalance[msg.sender] > 0, "No tokens staked");
        require(
            block.timestamp >= stakingTimestamp[msg.sender] + stakingDuration[msg.sender],
            "Staking period not completed"
        );
        
        uint256 stakedAmount = stakingBalance[msg.sender];
        uint256 rewards = calculateStakingRewards(msg.sender);
        
        stakingBalance[msg.sender] = 0;
        stakingTimestamp[msg.sender] = 0;
        stakingDuration[msg.sender] = 0;
        
        _transfer(address(this), msg.sender, stakedAmount);
        if (rewards > 0) {
            _mint(msg.sender, rewards);
        }
        
        updateLoyaltyTier(msg.sender);
        
        emit TokensUnstaked(msg.sender, stakedAmount, rewards);
    }
    
    function calculateStakingRewards(address user) public view returns (uint256) {
        if (stakingBalance[user] == 0) return 0;
        
        uint256 stakingPeriod = block.timestamp - stakingTimestamp[user];
        uint256 annualRewardRate = getAnnualRewardRate(stakingDuration[user]);
        
        // Calculate rewards based on time staked and annual rate
        uint256 rewards = (stakingBalance[user] * annualRewardRate * stakingPeriod) / (365 days * 100);
        
        return rewards;
    }
    
    function getAnnualRewardRate(uint256 duration) internal pure returns (uint256) {
        if (duration >= 365 days) return 18; // 18% APY for 1 year
        if (duration >= 180 days) return 12; // 12% APY for 6 months
        if (duration >= 90 days) return 8;   // 8% APY for 3 months
        return 5; // 5% APY for 1 month
    }
    
    function registerRestaurant(address restaurant) external onlyOwner {
        require(restaurant != address(0), "Invalid restaurant address");
        isRestaurant[restaurant] = true;
        emit RestaurantRegistered(restaurant);
    }
    
    function updateLoyaltyTier(address user) internal {
        uint256 totalBalance = balanceOf(user) + stakingBalance[user];
        uint256 newTier = 0;
        
        if (totalBalance >= PLATINUM_THRESHOLD) newTier = 4;
        else if (totalBalance >= GOLD_THRESHOLD) newTier = 3;
        else if (totalBalance >= SILVER_THRESHOLD) newTier = 2;
        else if (totalBalance >= BRONZE_THRESHOLD) newTier = 1;
        
        if (loyaltyTier[user] != newTier) {
            loyaltyTier[user] = newTier;
            emit LoyaltyTierUpdated(user, newTier);
        }
    }
    
    function getLoyaltyTier(address user) external view returns (string memory) {
        uint256 tier = loyaltyTier[user];
        if (tier == 4) return "Platinum";
        if (tier == 3) return "Gold";
        if (tier == 2) return "Silver";
        if (tier == 1) return "Bronze";
        return "None";
    }
    
    function getUserStakingInfo(address user) external view returns (
        uint256 stakedAmount,
        uint256 stakingStart,
        uint256 stakingEnd,
        uint256 currentRewards
    ) {
        stakedAmount = stakingBalance[user];
        stakingStart = stakingTimestamp[user];
        stakingEnd = stakingTimestamp[user] + stakingDuration[user];
        currentRewards = calculateStakingRewards(user);
    }
    
    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        whenNotPaused
        override
    {
        super._beforeTokenTransfer(from, to, amount);
    }
    
    // Emergency functions
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyOwner {
        IERC20(tokenAddress).transfer(owner(), tokenAmount);
    }
}
