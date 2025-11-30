import request from 'supertest';
import express from 'express';
import i18nRoutes from '../routes/i18n.routes';

const app = express();
app.use(express.json());
app.use('/api/i18n', i18nRoutes);

describe('I18n API Tests', () => {
  describe('GET /api/i18n/languages', () => {
    it('should return available languages', async () => {
      const response = await request(app)
        .get('/api/i18n/languages')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter inactive languages when activeOnly=true', async () => {
      const response = await request(app)
        .get('/api/i18n/languages?activeOnly=true')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      const languages = response.body.data;
      languages.forEach((lang: any) => {
        expect(lang.isActive).toBe(true);
      });
    });
  });

  describe('POST /api/i18n/translate', () => {
    it('should translate text', async () => {
      const response = await request(app)
        .post('/api/i18n/translate')
        .send({
          text: 'Hello, world!',
          targetLanguage: 'es',
        })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('text');
      expect(response.body.data).toHaveProperty('targetLanguage', 'es');
      expect(response.body.data).toHaveProperty('isAutoTranslated');
    });

    it('should validate required fields', async () => {
      await request(app)
        .post('/api/i18n/translate')
        .send({
          targetLanguage: 'es',
        })
        .expect(400);
    });
  });

  describe('POST /api/i18n/translate/listing/:listingId', () => {
    it('should translate a listing', async () => {
      const listingId = 'test-listing-123';
      const response = await request(app)
        .post(`/api/i18n/translate/listing/${listingId}`)
        .send({
          targetLanguage: 'fr',
        })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('listingId', listingId);
      expect(response.body.data).toHaveProperty('language', 'fr');
    });
  });

  describe('POST /api/i18n/translate/amenities', () => {
    it('should translate amenities', async () => {
      const response = await request(app)
        .post('/api/i18n/translate/amenities')
        .send({
          amenities: ['Pool', 'Gym', 'WiFi'],
          targetLanguage: 'de',
          context: 'hotel',
        })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(3);
    });
  });

  describe('GET /api/i18n/preferences', () => {
    it('should return user language preferences', async () => {
      const response = await request(app)
        .get('/api/i18n/preferences')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });
  });

  describe('PUT /api/i18n/preferences', () => {
    it('should update user language preferences', async () => {
      const response = await request(app)
        .put('/api/i18n/preferences')
        .set('Authorization', 'Bearer test-token')
        .send({
          preferredLanguage: 'ja',
          autoTranslate: true,
          showOriginalText: false,
          preferredCurrency: 'JPY',
          preferredUnits: 'metric',
          dateFormat: 'YYYY-MM-DD',
          timeFormat: '24h',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/i18n/stats', () => {
    it('should return translation statistics', async () => {
      const response = await request(app)
        .get('/api/i18n/stats')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('totalTranslations');
      expect(response.body.data).toHaveProperty('totalCharacters');
      expect(response.body.data).toHaveProperty('totalCost');
      expect(response.body.data).toHaveProperty('byLanguage');
      expect(response.body.data).toHaveProperty('byProvider');
    });
  });
});