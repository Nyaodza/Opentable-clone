'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create listing translations table
    await queryInterface.createTable('listing_translations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      listingId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'unified_listings',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      language: {
        type: Sequelize.STRING(5),
        allowNull: false,
        comment: 'ISO 639-1 language code (e.g., en, es, fr)',
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      highlights: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      included: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      excluded: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      requirements: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      cancellationPolicyText: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      additionalInfo: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      isAutoTranslated: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      translationQuality: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Quality score 0-1 for auto-translations',
      },
      lastReviewed: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      reviewedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create amenity translations table
    await queryInterface.createTable('amenity_translations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      amenityKey: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      language: {
        type: Sequelize.STRING(5),
        allowNull: false,
      },
      translation: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      context: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Context for disambiguation (e.g., hotel, restaurant)',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create category translations table
    await queryInterface.createTable('category_translations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      categoryKey: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      language: {
        type: Sequelize.STRING(5),
        allowNull: false,
      },
      translation: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create location translations table
    await queryInterface.createTable('location_translations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      locationKey: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Could be city, country, region, etc.',
      },
      locationType: {
        type: Sequelize.ENUM('country', 'state', 'city', 'region', 'neighborhood', 'landmark'),
        allowNull: false,
      },
      language: {
        type: Sequelize.STRING(5),
        allowNull: false,
      },
      translation: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      localName: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Name in local script/alphabet',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create translation cache table
    await queryInterface.createTable('translation_cache', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      sourceText: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      sourceLanguage: {
        type: Sequelize.STRING(5),
        allowNull: false,
      },
      targetLanguage: {
        type: Sequelize.STRING(5),
        allowNull: false,
      },
      translatedText: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      provider: {
        type: Sequelize.ENUM('google', 'deepl', 'azure', 'aws', 'manual'),
        allowNull: false,
      },
      confidence: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      cost: {
        type: Sequelize.DECIMAL(10, 6),
        defaultValue: 0,
      },
      characterCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      usageCount: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
      },
      lastUsed: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create language preferences table
    await queryInterface.createTable('user_language_preferences', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      preferredLanguage: {
        type: Sequelize.STRING(5),
        allowNull: false,
        defaultValue: 'en',
      },
      fallbackLanguages: {
        type: Sequelize.ARRAY(Sequelize.STRING(5)),
        defaultValue: ['en'],
      },
      autoTranslate: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      showOriginalText: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      preferredCurrency: {
        type: Sequelize.STRING(3),
        defaultValue: 'USD',
      },
      preferredUnits: {
        type: Sequelize.ENUM('metric', 'imperial'),
        defaultValue: 'metric',
      },
      dateFormat: {
        type: Sequelize.STRING,
        defaultValue: 'YYYY-MM-DD',
      },
      timeFormat: {
        type: Sequelize.ENUM('12h', '24h'),
        defaultValue: '24h',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create supported languages table
    await queryInterface.createTable('supported_languages', {
      code: {
        type: Sequelize.STRING(5),
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      nativeName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      direction: {
        type: Sequelize.ENUM('ltr', 'rtl'),
        defaultValue: 'ltr',
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      isDefault: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      translationProgress: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
        comment: 'Percentage of platform content translated',
      },
      locale: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      flag: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Country flag emoji or icon',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add indexes
    await queryInterface.addIndex('listing_translations', ['listingId', 'language'], {
      unique: true,
      name: 'unique_listing_language',
    });
    await queryInterface.addIndex('listing_translations', ['language']);
    await queryInterface.addIndex('listing_translations', ['isAutoTranslated']);

    await queryInterface.addIndex('amenity_translations', ['amenityKey', 'language', 'context'], {
      unique: true,
      name: 'unique_amenity_translation',
    });
    await queryInterface.addIndex('amenity_translations', ['language']);

    await queryInterface.addIndex('category_translations', ['categoryKey', 'language'], {
      unique: true,
      name: 'unique_category_language',
    });
    await queryInterface.addIndex('category_translations', ['language']);

    await queryInterface.addIndex('location_translations', ['locationKey', 'locationType', 'language'], {
      unique: true,
      name: 'unique_location_translation',
    });
    await queryInterface.addIndex('location_translations', ['language']);

    await queryInterface.addIndex('translation_cache', ['sourceText', 'sourceLanguage', 'targetLanguage'], {
      unique: true,
      name: 'unique_translation_cache',
      // Use hash for long text
      type: 'HASH',
    });
    await queryInterface.addIndex('translation_cache', ['targetLanguage']);
    await queryInterface.addIndex('translation_cache', ['lastUsed']);

    await queryInterface.addIndex('user_language_preferences', ['userId'], {
      unique: true,
    });
    await queryInterface.addIndex('user_language_preferences', ['preferredLanguage']);

    // Add language columns to existing tables
    await queryInterface.addColumn('unified_listings', 'originalLanguage', {
      type: Sequelize.STRING(5),
      defaultValue: 'en',
      allowNull: false,
    });

    await queryInterface.addColumn('unified_listings', 'availableLanguages', {
      type: Sequelize.ARRAY(Sequelize.STRING(5)),
      defaultValue: ['en'],
      allowNull: false,
    });

    // Insert default supported languages
    await queryInterface.bulkInsert('supported_languages', [
      {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        direction: 'ltr',
        isActive: true,
        isDefault: true,
        translationProgress: 100,
        locale: 'en-US',
        flag: '🇺🇸',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        direction: 'ltr',
        isActive: true,
        isDefault: false,
        translationProgress: 0,
        locale: 'es-ES',
        flag: '🇪🇸',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        direction: 'ltr',
        isActive: true,
        isDefault: false,
        translationProgress: 0,
        locale: 'fr-FR',
        flag: '🇫🇷',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: 'de',
        name: 'German',
        nativeName: 'Deutsch',
        direction: 'ltr',
        isActive: true,
        isDefault: false,
        translationProgress: 0,
        locale: 'de-DE',
        flag: '🇩🇪',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: 'it',
        name: 'Italian',
        nativeName: 'Italiano',
        direction: 'ltr',
        isActive: true,
        isDefault: false,
        translationProgress: 0,
        locale: 'it-IT',
        flag: '🇮🇹',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: 'pt',
        name: 'Portuguese',
        nativeName: 'Português',
        direction: 'ltr',
        isActive: true,
        isDefault: false,
        translationProgress: 0,
        locale: 'pt-BR',
        flag: '🇧🇷',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: 'ja',
        name: 'Japanese',
        nativeName: '日本語',
        direction: 'ltr',
        isActive: true,
        isDefault: false,
        translationProgress: 0,
        locale: 'ja-JP',
        flag: '🇯🇵',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: 'zh',
        name: 'Chinese',
        nativeName: '中文',
        direction: 'ltr',
        isActive: true,
        isDefault: false,
        translationProgress: 0,
        locale: 'zh-CN',
        flag: '🇨🇳',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: 'ar',
        name: 'Arabic',
        nativeName: 'العربية',
        direction: 'rtl',
        isActive: true,
        isDefault: false,
        translationProgress: 0,
        locale: 'ar-SA',
        flag: '🇸🇦',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: 'ru',
        name: 'Russian',
        nativeName: 'Русский',
        direction: 'ltr',
        isActive: true,
        isDefault: false,
        translationProgress: 0,
        locale: 'ru-RU',
        flag: '🇷🇺',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove columns from existing tables
    await queryInterface.removeColumn('unified_listings', 'originalLanguage');
    await queryInterface.removeColumn('unified_listings', 'availableLanguages');

    // Drop tables
    await queryInterface.dropTable('user_language_preferences');
    await queryInterface.dropTable('translation_cache');
    await queryInterface.dropTable('location_translations');
    await queryInterface.dropTable('category_translations');
    await queryInterface.dropTable('amenity_translations');
    await queryInterface.dropTable('listing_translations');
    await queryInterface.dropTable('supported_languages');
  },
};