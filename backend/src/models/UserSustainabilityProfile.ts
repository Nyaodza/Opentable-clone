import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface UserSustainabilityProfileAttributes {
  id: string;
  userId: string;
  preferences: {
    prioritizeLocalSourcing: boolean;
    prioritizeLowCarbon: boolean;
    prioritizeWasteReduction: boolean;
    prioritizeCommunityImpact: boolean;
    minimumSustainabilityScore: number; // 0-100
    certificationPreferences: string[]; // preferred certifications
  };
  impact: {
    totalDiningEvents: number;
    sustainableDiningEvents: number;
    carbonFootprintSaved: number; // kg CO2 equivalent
    localBusinessesSupported: number;
    wasteReduced: number; // estimated kg
    communityImpactScore: number;
  };
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    earnedAt: Date;
    category: 'carbon' | 'local' | 'waste' | 'community';
    badgeUrl?: string;
  }>;
  goals: {
    monthlyTarget: number; // percentage of sustainable dining
    yearlyTarget: number;
    currentStreak: number; // consecutive sustainable dining events
    longestStreak: number;
  };
  insights: {
    favoriteEcoFriendlyRestaurants: string[]; // restaurant IDs
    topSustainabilityCategories: string[];
    monthlyProgress: Array<{
      month: string;
      sustainablePercentage: number;
      carbonSaved: number;
      localSupported: number;
    }>;
  };
  notifications: {
    sustainabilityTips: boolean;
    achievementAlerts: boolean;
    monthlyReports: boolean;
    newSustainableRestaurants: boolean;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface UserSustainabilityProfileCreationAttributes 
  extends Optional<UserSustainabilityProfileAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class UserSustainabilityProfile extends Model<UserSustainabilityProfileAttributes, UserSustainabilityProfileCreationAttributes>
  implements UserSustainabilityProfileAttributes {
  public id!: string;
  public userId!: string;
  public preferences!: {
    prioritizeLocalSourcing: boolean;
    prioritizeLowCarbon: boolean;
    prioritizeWasteReduction: boolean;
    prioritizeCommunityImpact: boolean;
    minimumSustainabilityScore: number;
    certificationPreferences: string[];
  };
  public impact!: {
    totalDiningEvents: number;
    sustainableDiningEvents: number;
    carbonFootprintSaved: number;
    localBusinessesSupported: number;
    wasteReduced: number;
    communityImpactScore: number;
  };
  public achievements!: Array<{
    id: string;
    name: string;
    description: string;
    earnedAt: Date;
    category: 'carbon' | 'local' | 'waste' | 'community';
    badgeUrl?: string;
  }>;
  public goals!: {
    monthlyTarget: number;
    yearlyTarget: number;
    currentStreak: number;
    longestStreak: number;
  };
  public insights!: {
    favoriteEcoFriendlyRestaurants: string[];
    topSustainabilityCategories: string[];
    monthlyProgress: Array<{
      month: string;
      sustainablePercentage: number;
      carbonSaved: number;
      localSupported: number;
    }>;
  };
  public notifications!: {
    sustainabilityTips: boolean;
    achievementAlerts: boolean;
    monthlyReports: boolean;
    newSustainableRestaurants: boolean;
  };
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public user?: any;
}

UserSustainabilityProfile.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      unique: true,
    },
    preferences: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        prioritizeLocalSourcing: true,
        prioritizeLowCarbon: true,
        prioritizeWasteReduction: false,
        prioritizeCommunityImpact: false,
        minimumSustainabilityScore: 50,
        certificationPreferences: [],
      },
    },
    impact: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        totalDiningEvents: 0,
        sustainableDiningEvents: 0,
        carbonFootprintSaved: 0,
        localBusinessesSupported: 0,
        wasteReduced: 0,
        communityImpactScore: 0,
      },
    },
    achievements: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    goals: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        monthlyTarget: 50, // 50% sustainable dining
        yearlyTarget: 60,
        currentStreak: 0,
        longestStreak: 0,
      },
    },
    insights: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        favoriteEcoFriendlyRestaurants: [],
        topSustainabilityCategories: [],
        monthlyProgress: [],
      },
    },
    notifications: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        sustainabilityTips: true,
        achievementAlerts: true,
        monthlyReports: true,
        newSustainableRestaurants: true,
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
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
    modelName: 'UserSustainabilityProfile',
    tableName: 'user_sustainability_profiles',
    timestamps: true,
    indexes: [
      {
        fields: ['userId'],
        unique: true,
      },
      {
        fields: ['isActive'],
      },
    ],
  }
);

export { UserSustainabilityProfile, UserSustainabilityProfileAttributes, UserSustainabilityProfileCreationAttributes };
