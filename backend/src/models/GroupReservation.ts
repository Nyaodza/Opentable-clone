import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum GroupReservationStatus {
  PLANNING = 'PLANNING',
  VOTING = 'VOTING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED'
}

export enum BillSplitType {
  EQUAL = 'EQUAL',
  BY_ITEM = 'BY_ITEM',
  CUSTOM = 'CUSTOM',
  HOST_PAYS = 'HOST_PAYS'
}

interface GroupReservationAttributes {
  id: string;
  groupId: string;
  reservationId?: string;
  organizerId: string;
  restaurantId: string;
  proposedDate: Date;
  proposedTime: string;
  partySize: number;
  status: GroupReservationStatus;
  billSplitType: BillSplitType;
  specialRequests?: string;
  votingDeadline?: Date;
  finalizedAt?: Date;
  totalAmount?: number;
  metadata: {
    alternativeOptions?: Array<{
      restaurantId: string;
      date: Date;
      time: string;
      votes: number;
    }>;
    memberResponses?: Record<string, {
      status: 'ATTENDING' | 'NOT_ATTENDING' | 'MAYBE';
      respondedAt: Date;
      dietaryRestrictions?: string[];
    }>;
    billSplit?: Record<string, {
      amount: number;
      items?: string[];
      paid: boolean;
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface GroupReservationCreationAttributes 
  extends Optional<GroupReservationAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class GroupReservation extends Model<GroupReservationAttributes, GroupReservationCreationAttributes>
  implements GroupReservationAttributes {
  public id!: string;
  public groupId!: string;
  public reservationId?: string;
  public organizerId!: string;
  public restaurantId!: string;
  public proposedDate!: Date;
  public proposedTime!: string;
  public partySize!: number;
  public status!: GroupReservationStatus;
  public billSplitType!: BillSplitType;
  public specialRequests?: string;
  public votingDeadline?: Date;
  public finalizedAt?: Date;
  public totalAmount?: number;
  public metadata!: {
    alternativeOptions?: Array<{
      restaurantId: string;
      date: Date;
      time: string;
      votes: number;
    }>;
    memberResponses?: Record<string, {
      status: 'ATTENDING' | 'NOT_ATTENDING' | 'MAYBE';
      respondedAt: Date;
      dietaryRestrictions?: string[];
    }>;
    billSplit?: Record<string, {
      amount: number;
      items?: string[];
      paid: boolean;
    }>;
  };
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public group?: any;
  public organizer?: any;
  public restaurant?: any;
  public reservation?: any;
}

GroupReservation.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    groupId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'social_dining_groups',
        key: 'id',
      },
    },
    reservationId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'reservations',
        key: 'id',
      },
    },
    organizerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    restaurantId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'restaurants',
        key: 'id',
      },
    },
    proposedDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    proposedTime: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        is: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      },
    },
    partySize: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 2,
        max: 50,
      },
    },
    status: {
      type: DataTypes.ENUM(...Object.values(GroupReservationStatus)),
      allowNull: false,
      defaultValue: GroupReservationStatus.PLANNING,
    },
    billSplitType: {
      type: DataTypes.ENUM(...Object.values(BillSplitType)),
      allowNull: false,
      defaultValue: BillSplitType.EQUAL,
    },
    specialRequests: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    votingDeadline: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    finalizedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
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
    modelName: 'GroupReservation',
    tableName: 'group_reservations',
    timestamps: true,
    indexes: [
      {
        fields: ['groupId'],
      },
      {
        fields: ['organizerId'],
      },
      {
        fields: ['restaurantId'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['proposedDate'],
      },
    ],
  }
);

export { GroupReservation, GroupReservationAttributes, GroupReservationCreationAttributes };
