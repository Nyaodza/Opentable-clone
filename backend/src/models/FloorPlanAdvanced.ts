import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum TableShape {
  ROUND = 'round',
  SQUARE = 'square',
  RECTANGLE = 'rectangle',
  OVAL = 'oval',
  BAR = 'bar',
  BOOTH = 'booth',
  CUSTOM = 'custom'
}

export enum TableStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
  PREPARING = 'preparing',
  CLEANING = 'cleaning',
  MAINTENANCE = 'maintenance',
  BLOCKED = 'blocked'
}

export enum SectionType {
  MAIN_DINING = 'main_dining',
  PRIVATE_DINING = 'private_dining',
  BAR = 'bar',
  PATIO = 'patio',
  LOUNGE = 'lounge',
  TERRACE = 'terrace',
  VIP = 'vip',
  EVENT_SPACE = 'event_space'
}

interface FloorPlanAttributes {
  id: number;
  restaurantId: number;
  name: string;
  floor: number;
  isActive: boolean;
  dimensions: {
    width: number;
    height: number;
    unit: 'feet' | 'meters';
  };
  sections: FloorSection[];
  tables: TableConfiguration[];
  features: FloorFeature[];
  capacity: {
    minimum: number;
    maximum: number;
    optimal: number;
  };
  layout: {
    gridSize: number;
    snapToGrid: boolean;
    backgroundColor: string;
    backgroundImage?: string;
  };
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface FloorSection {
  id: string;
  name: string;
  type: SectionType;
  boundaries: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  capacity: number;
  serverId?: number;
  restrictions?: {
    minPartySize?: number;
    maxPartySize?: number;
    requiresReservation?: boolean;
    dresscode?: string;
    ageRestriction?: number;
  };
  ambiance: {
    noiseLevel: 'quiet' | 'moderate' | 'lively';
    lighting: 'dim' | 'moderate' | 'bright';
    music?: boolean;
    tvs?: boolean;
  };
  pricing?: {
    surcharge?: number;
    minimumSpend?: number;
  };
}

interface TableConfiguration {
  id: string;
  tableNumber: string;
  sectionId: string;
  position: {
    x: number;
    y: number;
    rotation: number;
  };
  dimensions: {
    width: number;
    height: number;
  };
  shape: TableShape;
  capacity: {
    standard: number;
    minimum: number;
    maximum: number;
  };
  status: TableStatus;
  features: {
    wheelchairAccessible?: boolean;
    highchair?: boolean;
    boosterSeat?: boolean;
    nearWindow?: boolean;
    nearBar?: boolean;
    nearKitchen?: boolean;
    nearRestroom?: boolean;
    nearEntrance?: boolean;
    quietArea?: boolean;
    powerOutlet?: boolean;
  };
  combinableWith?: string[]; // Table IDs that can be combined
  restrictions?: {
    noChildren?: boolean;
    adultsOnly?: boolean;
    reservationOnly?: boolean;
    vipOnly?: boolean;
  };
  customProperties?: Record<string, any>;
}

interface FloorFeature {
  id: string;
  type: 'entrance' | 'exit' | 'restroom' | 'kitchen' | 'bar' | 'hoststand' |
        'waitstation' | 'stage' | 'dancefloor' | 'fireplace' | 'pillar' | 'wall' | 'window';
  position: {
    x: number;
    y: number;
  };
  dimensions?: {
    width: number;
    height: number;
  };
  label?: string;
  accessible?: boolean;
}

interface FloorPlanCreationAttributes extends Optional<FloorPlanAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class FloorPlanAdvanced extends Model<FloorPlanAttributes, FloorPlanCreationAttributes> implements FloorPlanAttributes {
  public id!: number;
  public restaurantId!: number;
  public name!: string;
  public floor!: number;
  public isActive!: boolean;
  public dimensions!: FloorPlanAttributes['dimensions'];
  public sections!: FloorSection[];
  public tables!: TableConfiguration[];
  public features!: FloorFeature[];
  public capacity!: FloorPlanAttributes['capacity'];
  public layout!: FloorPlanAttributes['layout'];
  public metadata?: Record<string, any>;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Table Management Methods
  public getAvailableTables(partySize: number, dateTime: Date): TableConfiguration[] {
    return this.tables.filter(table =>
      table.status === TableStatus.AVAILABLE &&
      table.capacity.minimum <= partySize &&
      table.capacity.maximum >= partySize
    );
  }

  public getCombinableTables(partySize: number): TableConfiguration[][] {
    const combinations: TableConfiguration[][] = [];

    // Find tables that can be combined for larger parties
    for (const table of this.tables) {
      if (table.combinableWith && table.combinableWith.length > 0) {
        const combinable = this.tables.filter(t =>
          table.combinableWith?.includes(t.id)
        );

        const totalCapacity = table.capacity.standard +
          combinable.reduce((sum, t) => sum + t.capacity.standard, 0);

        if (totalCapacity >= partySize) {
          combinations.push([table, ...combinable]);
        }
      }
    }

    return combinations;
  }

  public optimizeTableAssignment(reservations: any[]): Map<string, string> {
    const assignments = new Map<string, string>();

    // Sort reservations by party size (larger parties first)
    const sorted = reservations.sort((a, b) => b.partySize - a.partySize);

    const usedTables = new Set<string>();

    for (const reservation of sorted) {
      // Find best table for this reservation
      const availableTables = this.tables.filter(t =>
        !usedTables.has(t.id) &&
        t.capacity.minimum <= reservation.partySize &&
        t.capacity.maximum >= reservation.partySize
      );

      // Prefer tables that match party size closely
      const bestTable = availableTables.sort((a, b) => {
        const aDiff = Math.abs(a.capacity.standard - reservation.partySize);
        const bDiff = Math.abs(b.capacity.standard - reservation.partySize);
        return aDiff - bDiff;
      })[0];

      if (bestTable) {
        assignments.set(reservation.id, bestTable.id);
        usedTables.add(bestTable.id);
      }
    }

    return assignments;
  }

  public calculateOccupancyRate(): number {
    const occupiedTables = this.tables.filter(t =>
      t.status === TableStatus.OCCUPIED ||
      t.status === TableStatus.RESERVED
    ).length;

    return (occupiedTables / this.tables.length) * 100;
  }

  public getSectionLoad(sectionId: string): number {
    const section = this.sections.find(s => s.id === sectionId);
    if (!section) return 0;

    const sectionTables = this.tables.filter(t => t.sectionId === sectionId);
    const occupiedCount = sectionTables.filter(t =>
      t.status === TableStatus.OCCUPIED
    ).length;

    return (occupiedCount / sectionTables.length) * 100;
  }

  public getAccessibleTables(): TableConfiguration[] {
    return this.tables.filter(t => t.features.wheelchairAccessible);
  }

  public getWindowTables(): TableConfiguration[] {
    return this.tables.filter(t => t.features.nearWindow);
  }

  public getQuietTables(): TableConfiguration[] {
    return this.tables.filter(t => t.features.quietArea);
  }
}

FloorPlanAdvanced.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    restaurantId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'restaurants',
        key: 'id',
      },
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    floor: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    dimensions: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        width: 1000,
        height: 800,
        unit: 'feet',
      },
    },
    sections: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    tables: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    features: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    capacity: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        minimum: 0,
        maximum: 0,
        optimal: 0,
      },
    },
    layout: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        gridSize: 10,
        snapToGrid: true,
        backgroundColor: '#ffffff',
      },
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
    modelName: 'FloorPlanAdvanced',
    tableName: 'floor_plans_advanced',
    timestamps: true,
    indexes: [
      { fields: ['restaurantId'] },
      { fields: ['isActive'] },
      { fields: ['floor'] },
    ],
  }
);

export default FloorPlanAdvanced;