import { Sequelize } from 'sequelize';
import { Umzug, SequelizeStorage } from 'umzug';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create sequelize instance
const sequelize = new Sequelize(process.env.DATABASE_URL!, {
  dialect: 'postgres',
  logging: console.log,
});

// Create umzug instance
const umzug = new Umzug({
  migrations: {
    glob: path.join(__dirname, 'migrations', '*.ts'),
    resolve: ({ name, path: migrationPath }) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const migration = require(migrationPath!);
      return {
        name,
        up: async () => migration.default.up(sequelize.getQueryInterface()),
        down: async () => migration.default.down(sequelize.getQueryInterface()),
      };
    },
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

// Run migrations
async function runMigrations() {
  try {
    // Check database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Run pending migrations
    const migrations = await umzug.up();
    
    if (migrations.length === 0) {
      console.log('No pending migrations.');
    } else {
      console.log('Executed migrations:', migrations.map(m => m.name));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Rollback migrations
async function rollbackMigrations(steps: number = 1) {
  try {
    // Check database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Rollback migrations
    const migrations = await umzug.down({ step: steps });
    
    if (migrations.length === 0) {
      console.log('No migrations to rollback.');
    } else {
      console.log('Rolled back migrations:', migrations.map(m => m.name));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Rollback failed:', error);
    process.exit(1);
  }
}

// Check migration status
async function checkStatus() {
  try {
    // Check database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    const executed = await umzug.executed();
    const pending = await umzug.pending();

    console.log('\nExecuted migrations:');
    executed.forEach(m => console.log(`  ✓ ${m.name}`));

    console.log('\nPending migrations:');
    pending.forEach(m => console.log(`  ○ ${m.name}`));

    process.exit(0);
  } catch (error) {
    console.error('Status check failed:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const command = process.argv[2];
const args = process.argv.slice(3);

switch (command) {
  case 'up':
  case 'migrate':
    runMigrations();
    break;
  case 'down':
  case 'rollback':
    const steps = args[0] ? parseInt(args[0], 10) : 1;
    rollbackMigrations(steps);
    break;
  case 'status':
    checkStatus();
    break;
  default:
    console.log(`
Migration CLI

Usage:
  npm run migrate:up          Run all pending migrations
  npm run migrate:down [n]    Rollback n migrations (default: 1)
  npm run migrate:status      Show migration status

Commands:
  up, migrate                 Run pending migrations
  down, rollback [steps]      Rollback migrations
  status                      Show migration status
    `);
    process.exit(0);
}