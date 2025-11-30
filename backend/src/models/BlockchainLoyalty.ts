import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, Unique, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './User';

@Table({
  tableName: 'blockchain_loyalty',
  timestamps: true,
})
export class BlockchainLoyalty extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Unique
  @Column(DataType.UUID)
  userId!: string;

  @Default(0)
  @Column(DataType.DECIMAL(18, 8))
  tokenBalance!: number;

  @Default(0)
  @Column(DataType.DECIMAL(18, 8))
  totalEarned!: number;

  @Default(0)
  @Column(DataType.DECIMAL(18, 8))
  totalRedeemed!: number;

  @Column(DataType.STRING(42))
  walletAddress?: string;

  @Column(DataType.STRING(42))
  smartContractAddress?: string;

  @Default('polygon')
  @Column(DataType.ENUM('ethereum', 'polygon', 'binance', 'testnet'))
  blockchainNetwork!: 'ethereum' | 'polygon' | 'binance' | 'testnet';

  @Default(0)
  @Column(DataType.DECIMAL(18, 8))
  stakingBalance!: number;

  @Default(0)
  @Column(DataType.DECIMAL(18, 8))
  stakingRewards!: number;

  @Default('bronze')
  @Column(DataType.ENUM('bronze', 'silver', 'gold', 'platinum', 'diamond'))
  loyaltyTier!: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

  @Default(0)
  @Column(DataType.DECIMAL(5, 2))
  tierProgress!: number;

  @Default(0)
  @Column(DataType.DECIMAL(18, 8))
  referralTokens!: number;

  @Default([])
  @Column(DataType.JSONB)
  nftCollectibles!: any[];

  @Default([])
  @Column(DataType.JSONB)
  transactionHistory!: any[];

  @Default(0)
  @Column(DataType.BIGINT)
  lastSyncedBlock!: number;

  @Default(true)
  @Column(DataType.BOOLEAN)
  isActive!: boolean;

  // Associations
  @BelongsTo(() => User)
  user!: User;

  // Helper methods
  public calculateTierProgress(): number {
    const tierThresholds = {
      bronze: 0,
      silver: 1000,
      gold: 5000,
      platinum: 15000,
      diamond: 50000
    };

    const currentThreshold = tierThresholds[this.loyaltyTier];
    const nextTier = this.getNextTier();
    const nextThreshold = nextTier ? tierThresholds[nextTier] : tierThresholds.diamond;

    if (nextTier === null) return 100; // Max tier reached

    return Math.min(100, ((this.totalEarned - currentThreshold) / (nextThreshold - currentThreshold)) * 100);
  }

  public getNextTier(): 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | null {
    const tiers = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    const currentIndex = tiers.indexOf(this.loyaltyTier);
    return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] as any : null;
  }

  public canStake(): boolean {
    return this.tokenBalance >= 100 && this.isActive;
  }

  public calculateStakingReward(stakingPeriodDays: number): number {
    const annualRate = 0.12; // 12% APY
    const dailyRate = annualRate / 365;
    return this.stakingBalance * dailyRate * stakingPeriodDays;
  }
}

