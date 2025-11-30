import { sequelize } from '../src/config/database';
import { UnifiedListing } from '../src/models/UnifiedListing';
import { TranslationService } from '../src/services/TranslationService';
import { QueryTypes } from 'sequelize';

async function demonstrateI18n() {
  try {
    console.log('🌍 Internationalization (i18n) Demo');
    console.log('===================================\n');

    // Initialize translation service
    const translationService = TranslationService.getInstance();

    // 1. Available Languages
    console.log('1. Available Languages:');
    const languages = await sequelize.query(`
      SELECT * FROM supported_languages WHERE is_active = true
    `, { type: QueryTypes.SELECT });
    
    if (languages.length === 0) {
      console.log('   Adding default languages...');
      await sequelize.query(`
        INSERT INTO supported_languages (code, name, native_name, direction, is_active, is_default, translation_progress, locale, flag)
        VALUES 
          ('en', 'English', 'English', 'ltr', true, true, 100, 'en-US', '🇺🇸'),
          ('es', 'Spanish', 'Español', 'ltr', true, false, 85, 'es-ES', '🇪🇸'),
          ('fr', 'French', 'Français', 'ltr', true, false, 80, 'fr-FR', '🇫🇷'),
          ('de', 'German', 'Deutsch', 'ltr', true, false, 75, 'de-DE', '🇩🇪'),
          ('ja', 'Japanese', '日本語', 'ltr', true, false, 70, 'ja-JP', '🇯🇵'),
          ('zh', 'Chinese', '中文', 'ltr', true, false, 65, 'zh-CN', '🇨🇳'),
          ('ar', 'Arabic', 'العربية', 'rtl', true, false, 60, 'ar-SA', '🇸🇦')
      `);
    }

    console.log('   Available languages: EN, ES, FR, DE, JA, ZH, AR\n');

    // 2. Text Translation
    console.log('2. Text Translation Examples:');
    const textExamples = [
      { text: 'Welcome to our travel marketplace', lang: 'es' },
      { text: 'Book your next adventure', lang: 'fr' },
      { text: 'Exclusive deals and offers', lang: 'de' },
      { text: 'Search hotels worldwide', lang: 'ja' },
    ];

    for (const example of textExamples) {
      console.log(`   Translating to ${example.lang.toUpperCase()}:`);
      console.log(`   Original: "${example.text}"`);
      const result = await translationService.translateText(example.text, {
        targetLanguage: example.lang,
        sourceLanguage: 'en',
      });
      console.log(`   Translated: "${result.text}"`);
      console.log(`   Provider: ${result.provider}, Confidence: ${(result.confidence || 0) * 100}%\n`);
    }

    // 3. Listing Translation
    console.log('3. Listing Translation Example:');
    
    // Create a sample listing
    const sampleListing = await UnifiedListing.create({
      title: 'Sunset Beach Resort & Spa',
      description: 'Experience luxury at our beachfront resort with world-class amenities and stunning ocean views.',
      serviceType: 'hotel',
      providerName: 'local',
      providerId: 'sample-hotel-001',
      location: {
        address: '123 Beach Drive',
        city: 'Miami',
        state: 'FL',
        country: 'USA',
        latitude: 25.7617,
        longitude: -80.1918,
      },
      price: 299.99,
      currency: 'USD',
      amenities: ['Pool', 'Spa', 'Beach Access', 'Restaurant', 'Gym', 'WiFi'],
      images: [],
      categories: ['Luxury', 'Beach', 'Resort'],
      details: {
        highlights: [
          'Private beach access',
          'Award-winning spa',
          'Gourmet dining options',
          'Infinity pool overlooking the ocean',
        ],
        included: [
          'Daily breakfast buffet',
          'Airport shuttle service',
          'Beach equipment rental',
        ],
        excluded: [
          'Alcoholic beverages',
          'Spa treatments',
          'Room service',
        ],
      },
    });

    console.log(`   Created sample listing: ${sampleListing.title}`);
    console.log('   Translating to Spanish...');

    const translatedListing = await translationService.translateListing(
      sampleListing.id,
      'es',
      'en'
    );

    console.log(`   Title (ES): ${translatedListing.title}`);
    console.log(`   Description (ES): ${translatedListing.description}\n`);

    // 4. Batch Translation
    console.log('4. Batch Translation of Amenities:');
    const amenities = ['Pool', 'Gym', 'WiFi', 'Parking', 'Restaurant'];
    const targetLanguages = ['es', 'fr', 'de'];

    for (const lang of targetLanguages) {
      const translatedAmenities = await translationService.translateAmenities(
        amenities,
        lang,
        'hotel'
      );
      console.log(`   ${lang.toUpperCase()}: ${translatedAmenities.join(', ')}`);
    }

    // 5. Translation Cache
    console.log('\n5. Translation Cache Statistics:');
    const cacheStats = await sequelize.query(`
      SELECT 
        COUNT(*) as total_cached,
        COUNT(DISTINCT source_language || '-' || target_language) as language_pairs,
        AVG(usage_count) as avg_usage,
        SUM(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 ELSE 0 END) as recent_translations
      FROM translation_cache
    `, { type: QueryTypes.SELECT });

    console.log(`   Total cached translations: ${cacheStats[0]?.total_cached || 0}`);
    console.log(`   Language pairs: ${cacheStats[0]?.language_pairs || 0}`);
    console.log(`   Average cache usage: ${Math.round(cacheStats[0]?.avg_usage || 0)}`);
    console.log(`   Recent translations (last hour): ${cacheStats[0]?.recent_translations || 0}`);

    // 6. User Preferences
    console.log('\n6. User Language Preferences Example:');
    const userPrefs = {
      userId: 'demo-user-123',
      preferredLanguage: 'es',
      fallbackLanguages: ['en', 'pt'],
      autoTranslate: true,
      showOriginalText: false,
      preferredCurrency: 'EUR',
      preferredUnits: 'metric',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
    };

    console.log('   Sample user preferences:');
    console.log(`   - Preferred language: ${userPrefs.preferredLanguage}`);
    console.log(`   - Auto-translate: ${userPrefs.autoTranslate}`);
    console.log(`   - Currency: ${userPrefs.preferredCurrency}`);
    console.log(`   - Units: ${userPrefs.preferredUnits}`);

    // Clean up
    await sampleListing.destroy();

    console.log('\n✅ I18n demo completed successfully!');
    console.log('\n📝 Key Features Demonstrated:');
    console.log('   - Multi-language support (7 languages)');
    console.log('   - Text and content translation');
    console.log('   - Listing localization');
    console.log('   - Amenity translation with context');
    console.log('   - Translation caching for performance');
    console.log('   - User preference management');
    console.log('   - RTL language support (Arabic)');

  } catch (error) {
    console.error('❌ Error in i18n demo:', error);
  }
}

// Run the demo
if (require.main === module) {
  demonstrateI18n()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { demonstrateI18n };