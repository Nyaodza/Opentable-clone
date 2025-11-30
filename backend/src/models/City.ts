import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface CityAttributes {
  id: number;
  name: string;
  slug: string;
  country: string;
  countryCode: string;
  state?: string;
  stateCode?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  currency: string;
  locale: string;
  isActive: boolean;
  launchDate?: Date;
  marketManager?: string;
  supportEmail: string;
  supportPhone?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface CityCreationAttributes extends Optional<CityAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class City extends Model<CityAttributes, CityCreationAttributes> implements CityAttributes {
  public id!: number;
  public name!: string;
  public slug!: string;
  public country!: string;
  public countryCode!: string;
  public state?: string;
  public stateCode?: string;
  public latitude!: number;
  public longitude!: number;
  public timezone!: string;
  public currency!: string;
  public locale!: string;
  public isActive!: boolean;
  public launchDate?: Date;
  public marketManager?: string;
  public supportEmail!: string;
  public supportPhone?: string;
  public metadata?: Record<string, any>;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Helper methods
  public getDisplayName(): string {
    return this.state ? `${this.name}, ${this.stateCode || this.state}` : `${this.name}, ${this.countryCode}`;
  }

  public isInTimezone(timezone: string): boolean {
    return this.timezone === timezone;
  }

  public getLocalTime(): Date {
    // This would integrate with a timezone library in production
    return new Date();
  }

  public getCurrencySymbol(): string {
    const currencySymbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      CAD: 'C$',
      AUD: 'A$',
      JPY: '¥',
    };
    return currencySymbols[this.currency] || this.currency;
  }
}

City.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        is: /^[a-z0-9-]+$/,
      },
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    countryCode: {
      type: DataTypes.STRING(3),
      allowNull: false,
      validate: {
        notEmpty: true,
        isUppercase: true,
        len: [2, 3],
      },
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    stateCode: {
      type: DataTypes.STRING(10),
      allowNull: true,
      validate: {
        isUppercase: true,
      },
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false,
      validate: {
        min: -90,
        max: 90,
      },
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: false,
      validate: {
        min: -180,
        max: 180,
      },
    },
    timezone: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'UTC',
      validate: {
        notEmpty: true,
      },
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'USD',
      validate: {
        notEmpty: true,
        isUppercase: true,
        len: [3, 3],
      },
    },
    locale: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'en-US',
      validate: {
        notEmpty: true,
        is: /^[a-z]{2}-[A-Z]{2}$/,
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    launchDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    marketManager: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    supportEmail: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    supportPhone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'City',
    tableName: 'cities',
    timestamps: true,
    indexes: [
      {
        fields: ['slug'],
        unique: true,
      },
      {
        fields: ['country', 'state'],
      },
      {
        fields: ['isActive'],
      },
      {
        fields: ['latitude', 'longitude'],
      },
    ],
  }
);

export { City, CityAttributes, CityCreationAttributes };
export default City;
