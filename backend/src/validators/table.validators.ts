import * as yup from 'yup';

export const createTableSchema = yup.object().shape({
  tableNumber: yup.string()
    .required('Table number is required')
    .min(1, 'Table number must be at least 1 character')
    .max(10, 'Table number must not exceed 10 characters'),
  
  capacity: yup.number()
    .required('Capacity is required')
    .integer('Capacity must be a whole number')
    .min(1, 'Capacity must be at least 1')
    .max(20, 'Capacity must not exceed 20'),
  
  minCapacity: yup.number()
    .required('Minimum capacity is required')
    .integer('Minimum capacity must be a whole number')
    .min(1, 'Minimum capacity must be at least 1')
    .max(yup.ref('capacity'), 'Minimum capacity cannot exceed capacity'),
  
  location: yup.string()
    .optional()
    .max(100, 'Location must not exceed 100 characters'),
  
  notes: yup.string()
    .optional()
    .max(500, 'Notes must not exceed 500 characters'),
  
  isActive: yup.boolean()
    .optional()
    .default(true)
});

export const updateTableSchema = yup.object().shape({
  tableNumber: yup.string()
    .optional()
    .min(1, 'Table number must be at least 1 character')
    .max(10, 'Table number must not exceed 10 characters'),
  
  capacity: yup.number()
    .optional()
    .integer('Capacity must be a whole number')
    .min(1, 'Capacity must be at least 1')
    .max(20, 'Capacity must not exceed 20'),
  
  minCapacity: yup.number()
    .optional()
    .integer('Minimum capacity must be a whole number')
    .min(1, 'Minimum capacity must be at least 1')
    .when('capacity', (capacity, schema) => {
      return capacity ? schema.max(capacity, 'Minimum capacity cannot exceed capacity') : schema;
    }),
  
  location: yup.string()
    .optional()
    .max(100, 'Location must not exceed 100 characters'),
  
  notes: yup.string()
    .optional()
    .max(500, 'Notes must not exceed 500 characters'),
  
  isActive: yup.boolean()
    .optional()
});

export const getTableAvailabilitySchema = yup.object().shape({
  date: yup.date()
    .required('Date is required')
    .min(new Date(), 'Date must be in the future'),
  
  duration: yup.number()
    .optional()
    .integer('Duration must be a whole number')
    .min(30, 'Duration must be at least 30 minutes')
    .max(480, 'Duration must not exceed 480 minutes')
    .default(120)
});

export const findBestTableSchema = yup.object().shape({
  date: yup.date()
    .required('Date is required')
    .min(new Date(), 'Date must be in the future'),
  
  partySize: yup.number()
    .required('Party size is required')
    .integer('Party size must be a whole number')
    .min(1, 'Party size must be at least 1')
    .max(50, 'Party size must not exceed 50'),
  
  duration: yup.number()
    .optional()
    .integer('Duration must be a whole number')
    .min(30, 'Duration must be at least 30 minutes')
    .max(480, 'Duration must not exceed 480 minutes')
    .default(120)
});

export const getTableOccupancySchema = yup.object().shape({
  startDate: yup.date()
    .required('Start date is required'),
  
  endDate: yup.date()
    .required('End date is required')
    .min(yup.ref('startDate'), 'End date must be after start date')
    .test('date-range', 'Date range cannot exceed 1 year', function(value) {
      const startDate = this.parent.startDate;
      if (!startDate || !value) return true;
      
      const oneYearLater = new Date(startDate);
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      
      return value <= oneYearLater;
    })
});

export const bulkUpdateTablesSchema = yup.object().shape({
  tables: yup.array()
    .required('Tables array is required')
    .min(1, 'At least one table is required')
    .max(100, 'Maximum 100 tables allowed')
    .of(
      yup.object().shape({
        id: yup.string().optional(),
        tableNumber: yup.string()
          .required('Table number is required')
          .min(1, 'Table number must be at least 1 character')
          .max(10, 'Table number must not exceed 10 characters'),
        
        capacity: yup.number()
          .required('Capacity is required')
          .integer('Capacity must be a whole number')
          .min(1, 'Capacity must be at least 1')
          .max(20, 'Capacity must not exceed 20'),
        
        minCapacity: yup.number()
          .required('Minimum capacity is required')
          .integer('Minimum capacity must be a whole number')
          .min(1, 'Minimum capacity must be at least 1')
          .max(yup.ref('capacity'), 'Minimum capacity cannot exceed capacity'),
        
        location: yup.string()
          .optional()
          .max(100, 'Location must not exceed 100 characters'),
        
        notes: yup.string()
          .optional()
          .max(500, 'Notes must not exceed 500 characters'),
        
        isActive: yup.boolean()
          .optional()
          .default(true)
      })
    )
    .test('unique-table-numbers', 'Table numbers must be unique', function(tables) {
      if (!tables) return true;
      
      const tableNumbers = tables.map(table => table.tableNumber);
      const uniqueNumbers = new Set(tableNumbers);
      
      return uniqueNumbers.size === tableNumbers.length;
    })
});