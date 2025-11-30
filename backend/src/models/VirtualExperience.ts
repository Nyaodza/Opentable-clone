import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Restaurant } from './Restaurant';

@Table({
  tableName: 'virtual_experiences',
  timestamps: true,
})
export class VirtualExperience extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => Restaurant)
  @AllowNull(false)
  @Column(DataType.UUID)
  restaurantId!: string;

  @AllowNull(false)
  @Column(DataType.STRING(200))
  title!: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  description!: string;

  @AllowNull(false)
  @Column(DataType.ENUM('vr_tour', 'virtual_dining', 'cooking_class', 'chef_table', 'wine_tasting', 'cultural_experience'))
  experienceType!: 'vr_tour' | 'virtual_dining' | 'cooking_class' | 'chef_table' | 'wine_tasting' | 'cultural_experience';

  @AllowNull(false)
  @Column(DataType.INTEGER)
  duration!: number;

  @Default(10)
  @Column(DataType.INTEGER)
  maxParticipants!: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  price!: number;

  @Default('USD')
  @Column(DataType.STRING(3))
  currency!: string;

  @Default([])
  @Column(DataType.JSONB)
  availableSlots!: any[];

  @Default({})
  @Column(DataType.JSONB)
  vrAssets!: any;

  @Column(DataType.STRING(500))
  streamingUrl?: string;

  @Default([])
  @Column(DataType.JSONB)
  interactiveElements!: any[];

  @Default([])
  @Column(DataType.JSONB)
  requirements!: string[];

  @Default('en')
  @Column(DataType.STRING(10))
  language!: string;

  @Default('beginner')
  @Column(DataType.ENUM('beginner', 'intermediate', 'advanced'))
  difficulty!: 'beginner' | 'intermediate' | 'advanced';

  @Default(0)
  @Column(DataType.DECIMAL(3, 2))
  rating!: number;

  @Default(0)
  @Column(DataType.INTEGER)
  totalBookings!: number;

  @Default(true)
  @Column(DataType.BOOLEAN)
  isActive!: boolean;

  @Default({})
  @Column(DataType.JSONB)
  metadata!: any;

  // Associations
  @BelongsTo(() => Restaurant)
  restaurant!: Restaurant;

  // Helper methods
  public getAvailableSlot(date: Date): any | null {
    return this.availableSlots.find(slot => 
      new Date(slot.date).toDateString() === date.toDateString() && 
      slot.available > 0
    );
  }

  public hasVRRequirement(): boolean {
    return this.requirements.includes('vr_headset') || 
           this.requirements.includes('ar_device');
  }

  public getFormattedPrice(): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency
    }).format(this.price);
  }

  public getDifficultyLevel(): number {
    const levels = { beginner: 1, intermediate: 2, advanced: 3 };
    return levels[this.difficulty];
  }

  public canAccommodateParty(partySize: number): boolean {
    return partySize <= this.maxParticipants;
  }
}

