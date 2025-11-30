import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Optional } from 'sequelize';
import { User } from './User';

@Table({
  tableName: 'blockchain_transactions',
  timestamps: true,
})
export class BlockchainTransaction extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.UUID)
  userId!: string;

  @Column(DataType.STRING(66))
  transactionHash?: string;

  @Column(DataType.BIGINT)
  blockNumber?: number;

  @AllowNull(false)
  @Column(DataType.ENUM('earn', 'redeem', 'stake', 'unstake', 'transfer', 'referral', 'nft_mint', 'tier_upgrade'))
  transactionType!: 'earn' | 'redeem' | 'stake' | 'unstake' | 'transfer' | 'referral' | 'nft_mint' | 'tier_upgrade';

  @AllowNull(false)
  @Column(DataType.DECIMAL(18, 8))
  tokenAmount!: number;

  @AllowNull(false)
  @Column(DataType.ENUM('reservation', 'review', 'referral', 'social_share', 'birthday', 'anniversary', 'special_event', 'staking_reward', 'manual'))
  sourceType!: 'reservation' | 'review' | 'referral' | 'social_share' | 'birthday' | 'anniversary' | 'special_event' | 'staking_reward' | 'manual';

  @Column(DataType.UUID)
  sourceId?: string;

  @Column(DataType.STRING(42))
  destinationAddress?: string;

  @Column(DataType.BIGINT)
  gasUsed?: number;

  @Column(DataType.DECIMAL(18, 8))
  gasFee?: number;

  @Default('pending')
  @Column(DataType.ENUM('pending', 'confirmed', 'failed', 'cancelled'))
  status!: 'pending' | 'confirmed' | 'failed' | 'cancelled';

  @Default(0)
  @Column(DataType.INTEGER)
  confirmations!: number;

  @Default({})
  @Column(DataType.JSONB)
  metadata!: any;

  @Column(DataType.TEXT)
  errorMessage?: string;

  @Column(DataType.DATE)
  processedAt?: Date;

  @BelongsTo(() => User)
  user!: User;

  // Helper methods
  public isConfirmed(): boolean {
    return this.status === 'confirmed' && this.confirmations >= 12;
  }

  public isPending(): boolean {
    return this.status === 'pending';
  }

  public canRetry(): boolean {
    return this.status === 'failed' && this.transactionType !== 'transfer';
  }

  public getDisplayAmount(): string {
    return `${this.tokenAmount.toFixed(2)} OTT`;
  }

  public getTransactionUrl(): string | null {
    if (!this.transactionHash) return null;
    
    const networkUrls = {
      ethereum: 'https://etherscan.io/tx/',
      polygon: 'https://polygonscan.com/tx/',
      binance: 'https://bscscan.com/tx/',
      testnet: 'https://goerli.etherscan.io/tx/'
    };

    // Default to polygon for now
    return `${networkUrls.polygon}${this.transactionHash}`;
  }
}

export interface BlockchainTransactionAttributes {
  id: string;
  userId: string;
  transactionHash?: string;
  blockNumber?: number;
  transactionType: 'earn' | 'redeem' | 'stake' | 'unstake' | 'transfer' | 'referral' | 'nft_mint' | 'tier_upgrade';
  tokenAmount: number;
  sourceType: 'reservation' | 'review' | 'referral' | 'social_share' | 'birthday' | 'anniversary' | 'special_event' | 'staking_reward' | 'manual';
  sourceId?: string;
  destinationAddress?: string;
  gasUsed?: number;
  gasFee?: number;
  status: 'pending' | 'confirmed' | 'failed' | 'cancelled';
  confirmations: number;
  metadata?: any;
  errorMessage?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BlockchainTransactionCreationAttributes extends Optional<BlockchainTransactionAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

