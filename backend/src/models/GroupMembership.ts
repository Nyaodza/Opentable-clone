import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum MembershipRole {
  CREATOR = 'CREATOR',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER'
}

export enum MembershipStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  DECLINED = 'DECLINED',
  REMOVED = 'REMOVED'
}

interface GroupMembershipAttributes {
  id: string;
  groupId: string;
  userId: string;
  role: MembershipRole;
  status: MembershipStatus;
  joinedAt?: Date;
  invitedBy?: string;
  invitedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface GroupMembershipCreationAttributes 
  extends Optional<GroupMembershipAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class GroupMembership extends Model<GroupMembershipAttributes, GroupMembershipCreationAttributes>
  implements GroupMembershipAttributes {
  public id!: string;
  public groupId!: string;
  public userId!: string;
  public role!: MembershipRole;
  public status!: MembershipStatus;
  public joinedAt?: Date;
  public invitedBy?: string;
  public invitedAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public group?: any;
  public user?: any;
  public inviter?: any;
}

GroupMembership.init(
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
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    role: {
      type: DataTypes.ENUM(...Object.values(MembershipRole)),
      allowNull: false,
      defaultValue: MembershipRole.MEMBER,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(MembershipStatus)),
      allowNull: false,
      defaultValue: MembershipStatus.PENDING,
    },
    joinedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    invitedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    invitedAt: {
      type: DataTypes.DATE,
      allowNull: true,
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
    modelName: 'GroupMembership',
    tableName: 'group_memberships',
    timestamps: true,
    indexes: [
      {
        fields: ['groupId', 'userId'],
        unique: true,
      },
      {
        fields: ['userId'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['invitedBy'],
      },
    ],
  }
);

export { GroupMembership, GroupMembershipAttributes, GroupMembershipCreationAttributes };
