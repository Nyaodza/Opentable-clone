import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Optional } from 'sequelize';
import { Restaurant } from './Restaurant';

@Table({
  tableName: 'sustainability_metrics',
  timestamps: true,
})
export class SustainabilityMetrics extends Model {

  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => Restaurant)
  @AllowNull(false)
  @Column(DataType.UUID)
  restaurantId!: string;

  @Default(0)
  @Column(DataType.DECIMAL(10, 2))
  carbonFootprint!: number;

  @Default(0)
  @Column(DataType.DECIMAL(5, 2))
  localSourcingPercentage!: number;

  @Default(0)
  @Column(DataType.DECIMAL(5, 2))
  wasteReductionScore!: number;

  @Default(0)
  @Column(DataType.DECIMAL(5, 2))
  communityImpactScore!: number;

  @Default([])
  @Column(DataType.ARRAY(DataType.TEXT))
  certifications!: string[];

  @Default(0)
  @Column(DataType.DECIMAL(3, 2))
  sustainabilityRating!: number;

  @Default(DataType.NOW)
  @Column(DataType.DATE)
  lastUpdated!: Date;

  // Associations
  @BelongsTo(() => Restaurant)
  restaurant!: Restaurant;

  // Helper methods
  public calculateOverallScore(): number {
    return Math.round((this.carbonFootprint + this.localSourcingPercentage + this.wasteReductionScore + this.communityImpactScore) / 4);
  }

  public hasActiveCertifications(): boolean {
    return this.certifications.length > 0;
  }

  public getGrade(): string {
    const score = this.sustainabilityRating;
    if (score >= 4.5) return 'A+';
    if (score >= 4.0) return 'A';
    if (score >= 3.5) return 'B+';
    if (score >= 3.0) return 'B';
    if (score >= 2.5) return 'C+';
    if (score >= 2.0) return 'C';
    return 'D';
  }
}

export interface SustainabilityMetricsAttributes {
  id: string;
  restaurantId: string;
  carbonFootprint: number;
  localSourcingPercentage: number;
  wasteReductionScore: number;
  communityImpactScore: number;
  certifications: string[];
  sustainabilityRating: number;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SustainabilityMetricsCreationAttributes extends Optional<SustainabilityMetricsAttributes, 'id' | 'createdAt' | 'updatedAt'> {}
