'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Enable PostGIS extension
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS postgis;');
    
    // Add geometry column for point-based location
    await queryInterface.addColumn('unified_listings', 'location_point', {
      type: 'GEOMETRY(POINT, 4326)',
      allowNull: true,
    });
    
    // Create spatial index on the geometry column
    await queryInterface.sequelize.query(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unified_listings_location_point ON unified_listings USING GIST (location_point);'
    );
    
    // Create function to update geometry from lat/lng
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION update_location_point()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.location IS NOT NULL AND 
           NEW.location::jsonb ? 'lat' AND 
           NEW.location::jsonb ? 'lng' THEN
          NEW.location_point = ST_SetSRID(
            ST_MakePoint(
              (NEW.location::jsonb->>'lng')::float,
              (NEW.location::jsonb->>'lat')::float
            ),
            4326
          );
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Create trigger to automatically update geometry
    await queryInterface.sequelize.query(`
      CREATE TRIGGER trigger_update_location_point
        BEFORE INSERT OR UPDATE ON unified_listings
        FOR EACH ROW
        EXECUTE FUNCTION update_location_point();
    `);
    
    // Update existing records to populate geometry
    await queryInterface.sequelize.query(`
      UPDATE unified_listings 
      SET location_point = ST_SetSRID(
        ST_MakePoint(
          (location::jsonb->>'lng')::float,
          (location::jsonb->>'lat')::float
        ),
        4326
      )
      WHERE location IS NOT NULL 
        AND location::jsonb ? 'lat' 
        AND location::jsonb ? 'lng'
        AND (location::jsonb->>'lat')::text != '0'
        AND (location::jsonb->>'lng')::text != '0';
    `);
    
    // Add indexes for common spatial queries
    await queryInterface.sequelize.query(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unified_listings_service_location ON unified_listings USING GIST (location_point) WHERE "serviceType" IS NOT NULL;'
    );
    
    await queryInterface.sequelize.query(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unified_listings_active_location ON unified_listings USING GIST (location_point) WHERE status = \'active\';'
    );
  },

  down: async (queryInterface, Sequelize) => {
    // Drop trigger and function
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS trigger_update_location_point ON unified_listings;');
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS update_location_point();');
    
    // Drop indexes
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_unified_listings_location_point;');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_unified_listings_service_location;');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_unified_listings_active_location;');
    
    // Remove geometry column
    await queryInterface.removeColumn('unified_listings', 'location_point');
    
    // Note: We don't drop the PostGIS extension as it might be used by other parts of the system
  },
};