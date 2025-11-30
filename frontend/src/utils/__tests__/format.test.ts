import {
  formatCurrency,
  formatDate,
  formatTime,
  formatPhoneNumber,
  formatRating,
  formatDistance,
  formatDuration,
  formatPercentage,
  pluralize,
  truncate,
} from '../format';

describe('Format Utilities', () => {
  describe('formatCurrency', () => {
    it('should format currency correctly', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatCurrency(999999.99)).toBe('$999,999.99');
    });

    it('should handle negative values', () => {
      expect(formatCurrency(-50)).toBe('-$50.00');
    });

    it('should handle different locales', () => {
      expect(formatCurrency(1234.56, 'EUR', 'de-DE')).toBe('1.234,56 €');
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15T10:30:00');
      expect(formatDate(date)).toMatch(/Jan 15, 2024/);
      expect(formatDate(date, 'short')).toMatch(/1\/15\/24/);
      expect(formatDate(date, 'long')).toMatch(/January 15, 2024/);
    });

    it('should handle string dates', () => {
      expect(formatDate('2024-01-15')).toMatch(/Jan 15, 2024/);
    });
  });

  describe('formatTime', () => {
    it('should format time correctly', () => {
      const date = new Date('2024-01-15T14:30:00');
      expect(formatTime(date)).toMatch(/2:30 PM/);
      expect(formatTime(date, true)).toMatch(/14:30/);
    });

    it('should handle edge cases', () => {
      const midnight = new Date('2024-01-15T00:00:00');
      expect(formatTime(midnight)).toMatch(/12:00 AM/);
      
      const noon = new Date('2024-01-15T12:00:00');
      expect(formatTime(noon)).toMatch(/12:00 PM/);
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format US phone numbers', () => {
      expect(formatPhoneNumber('1234567890')).toBe('(123) 456-7890');
      expect(formatPhoneNumber('11234567890')).toBe('+1 (123) 456-7890');
    });

    it('should handle invalid phone numbers', () => {
      expect(formatPhoneNumber('123')).toBe('123');
      expect(formatPhoneNumber('')).toBe('');
    });
  });

  describe('formatRating', () => {
    it('should format ratings correctly', () => {
      expect(formatRating(4.5)).toBe('4.5');
      expect(formatRating(4)).toBe('4.0');
      expect(formatRating(3.67)).toBe('3.7');
    });

    it('should handle edge cases', () => {
      expect(formatRating(0)).toBe('0.0');
      expect(formatRating(5)).toBe('5.0');
    });
  });

  describe('formatDistance', () => {
    it('should format distances correctly', () => {
      expect(formatDistance(0.5)).toBe('0.5 mi');
      expect(formatDistance(1)).toBe('1.0 mi');
      expect(formatDistance(10.7)).toBe('10.7 mi');
    });

    it('should format in kilometers', () => {
      expect(formatDistance(1.6, 'km')).toBe('1.6 km');
    });
  });

  describe('formatDuration', () => {
    it('should format durations correctly', () => {
      expect(formatDuration(30)).toBe('30 mins');
      expect(formatDuration(60)).toBe('1 hr');
      expect(formatDuration(90)).toBe('1 hr 30 mins');
      expect(formatDuration(120)).toBe('2 hrs');
    });

    it('should handle edge cases', () => {
      expect(formatDuration(0)).toBe('0 mins');
      expect(formatDuration(1)).toBe('1 min');
      expect(formatDuration(61)).toBe('1 hr 1 min');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentages correctly', () => {
      expect(formatPercentage(0.5)).toBe('50%');
      expect(formatPercentage(0.755)).toBe('76%');
      expect(formatPercentage(1)).toBe('100%');
    });

    it('should handle decimals', () => {
      expect(formatPercentage(0.755, 1)).toBe('75.5%');
      expect(formatPercentage(0.1234, 2)).toBe('12.34%');
    });
  });

  describe('pluralize', () => {
    it('should pluralize correctly', () => {
      expect(pluralize(0, 'item')).toBe('0 items');
      expect(pluralize(1, 'item')).toBe('1 item');
      expect(pluralize(5, 'item')).toBe('5 items');
    });

    it('should handle custom plurals', () => {
      expect(pluralize(1, 'person', 'people')).toBe('1 person');
      expect(pluralize(2, 'person', 'people')).toBe('2 people');
    });
  });

  describe('truncate', () => {
    it('should truncate long text', () => {
      const text = 'This is a very long text that needs to be truncated';
      expect(truncate(text, 20)).toBe('This is a very long...');
      expect(truncate(text, 50)).toBe(text); // No truncation needed
    });

    it('should handle custom ellipsis', () => {
      const text = 'Long text here';
      expect(truncate(text, 10, '…')).toBe('Long text…');
    });

    it('should handle edge cases', () => {
      expect(truncate('', 10)).toBe('');
      expect(truncate('Short', 10)).toBe('Short');
    });
  });
});