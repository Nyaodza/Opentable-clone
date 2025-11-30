import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './User';

@Table({
  tableName: 'gift_cards',
  timestamps: true,
})
export class GiftCard extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id!: string;

  @Column({
    type: DataType.STRING,
    unique: true,
    allowNull: false,
  })
  code!: string;

  @Column({
    type: DataType.STRING,
    unique: true,
    allowNull: false,
  })
  pin!: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: true,
    comment: 'User who purchased the gift card',
  })
  purchasedBy!: string | null;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: true,
    comment: 'User who redeemed the gift card',
  })
  redeemedBy!: string | null;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  initialAmount!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  currentBalance!: number;

  @Column({
    type: DataType.STRING,
    defaultValue: 'USD',
  })
  currency!: string;

  @Column({
    type: DataType.ENUM('active', 'redeemed', 'expired', 'cancelled'),
    defaultValue: 'active',
  })
  status!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  recipientEmail!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  recipientName!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  message!: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  expirationDate!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  activationDate!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  redeemedAt!: Date;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  stripePaymentIntentId!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  designTemplate!: string;

  @Column({
    type: DataType.JSONB,
    defaultValue: [],
  })
  transactionHistory!: Array<{
    date: string;
    amount: number;
    type: 'purchase' | 'redemption' | 'refund';
    description: string;
  }>;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  isPhysicalCard!: boolean;

  @Column({
    type: DataType.JSONB,
    defaultValue: {},
  })
  shippingAddress!: Record<string, any>;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  emailSent!: boolean;

  @BelongsTo(() => User, 'purchasedBy')
  purchaser!: User;

  @BelongsTo(() => User, 'redeemedBy')
  redeemer!: User;
}

export default GiftCard;
