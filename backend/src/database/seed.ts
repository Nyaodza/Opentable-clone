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

// Create umzug instance for seeds
const umzug = new Umzug({
  migrations: {
    glob: path.join(__dirname, 'seeds', '*.ts'),
    resolve: ({ name, path: seedPath }) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const seed = require(seedPath!);
      return {
        name,
        up: async () => seed.default.up(sequelize.getQueryInterface()),
        down: async () => seed.default.down(sequelize.getQueryInterface()),
      };
    },
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ 
    sequelize,
    tableName: 'SequelizeSeeds',
  }),
  logger: console,
});

// Run seeds
async function runSeeds() {
  try {
    // Check database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Run pending seeds
    const seeds = await umzug.up();
    
    if (seeds.length === 0) {
      console.log('No pending seeds.');
    } else {
      console.log('Executed seeds:', seeds.map(s => s.name));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

// Rollback seeds
async function rollbackSeeds(steps: number = 1) {
  try {
    // Check database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Rollback seeds
    const seeds = await umzug.down({ step: steps });
    
    if (seeds.length === 0) {
      console.log('No seeds to rollback.');
    } else {
      console.log('Rolled back seeds:', seeds.map(s => s.name));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Rollback failed:', error);
    process.exit(1);
  }
}

// Reset seeds (rollback all and run again)
async function resetSeeds() {
  try {
    // Check database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Get all executed seeds
    const executed = await umzug.executed();
    
    if (executed.length > 0) {
      console.log('Rolling back all seeds...');
      await umzug.down({ to: 0 });
      console.log('Rolled back all seeds.');
    }

    // Run all seeds
    console.log('Running all seeds...');
    const seeds = await umzug.up();
    console.log('Executed seeds:', seeds.map(s => s.name));
    
    process.exit(0);
  } catch (error) {
    console.error('Reset failed:', error);
    process.exit(1);
  }
}

// Check seed status
async function checkStatus() {
  try {
    // Check database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    const executed = await umzug.executed();
    const pending = await umzug.pending();

    console.log('\nExecuted seeds:');
    executed.forEach(s => console.log(`  ✓ ${s.name}`));

    console.log('\nPending seeds:');
    pending.forEach(s => console.log(`  ○ ${s.name}`));

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
  case 'seed':
    runSeeds();
    break;
  case 'down':
  case 'rollback':
    const steps = args[0] ? parseInt(args[0], 10) : 1;
    rollbackSeeds(steps);
    break;
  case 'reset':
    resetSeeds();
    break;
  case 'status':
    checkStatus();
    break;
  default:
    console.log(`
Seed CLI

Usage:
  npm run seed:up          Run all pending seeds
  npm run seed:down [n]    Rollback n seeds (default: 1)
  npm run seed:reset       Rollback all seeds and run again
  npm run seed:status      Show seed status

Commands:
  up, seed               Run pending seeds
  down, rollback [steps] Rollback seeds
  reset                  Reset all seeds
  status                 Show seed status
    `);
    process.exit(0);
}