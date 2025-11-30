import { Service } from 'typedi';
import { Op } from 'sequelize';
import * as cheerio from 'cheerio';
import * as textToSpeech from '@google-cloud/text-to-speech';
import * as translate from '@google-cloud/translate';
import { Redis } from 'ioredis';
import * as sharp from 'sharp';
import * as pdfParse from 'pdf-parse';

interface AccessibilityProfile {
  userId: string;
  preferences: {
    // Visual
    visualImpairment: 'none' | 'low_vision' | 'color_blind' | 'blind';
    colorBlindType?: 'protanopia' | 'deuteranopia' | 'tritanopia';
    fontSize: 'small' | 'normal' | 'large' | 'extra_large';
    highContrast: boolean;
    reduceMotion: boolean;
    screenReaderMode: boolean;

    // Auditory
    hearingImpairment: 'none' | 'mild' | 'moderate' | 'severe' | 'profound';
    visualAlerts: boolean;
    captionsEnabled: boolean;
    signLanguagePreferred: boolean;

    // Motor
    motorImpairment: 'none' | 'mild' | 'moderate' | 'severe';
    keyboardNavigation: boolean;
    voiceControl: boolean;
    dwellClicking: boolean;
    stickyKeys: boolean;

    // Cognitive
    cognitiveSupport: 'none' | 'mild' | 'moderate' | 'significant';
    simplifiedInterface: boolean;
    readingAssistance: boolean;
    focusMode: boolean;
    reminderFrequency: 'none' | 'low' | 'medium' | 'high';

    // Language
    primaryLanguage: string;
    secondaryLanguages: string[];
    readingLevel: 'basic' | 'intermediate' | 'advanced';
    technicalTermsSimplification: boolean;
  };
  assistiveTechnology: {
    screenReader: string | null;
    brailleDisplay: boolean;
    switchDevice: boolean;
    eyeTracking: boolean;
    voiceRecognition: boolean;
  };
}

interface RestaurantAccessibility {
  restaurantId: string;
  physical: {
    wheelchairAccessible: boolean;
    wheelchairAccessibleRestroom: boolean;
    wheelchairAccessibleParking: boolean;
    automaticDoors: boolean;
    elevatorAvailable: boolean;
    rampAvailable: boolean;
    wideCorridors: boolean;
    accessibleSeating: number;
    adjustableTableHeight: boolean;

    // Navigation
    brailleSignage: boolean;
    tactilePaving: boolean;
    audioGuidance: boolean;
    visualAlarms: boolean;

    // Assistance
    staffTrainedInAccessibility: boolean;
    assistanceAnimalsWelcome: boolean;
    signLanguageStaff: boolean;
    writtenCommunicationAvailable: boolean;
  };

  menu: {
    brailleMenuAvailable: boolean;
    largeMenuAvailable: boolean;
    digitalMenuWithTTS: boolean;
    pictorialMenu: boolean;
    simplifiedMenu: boolean;
    allergenClearlylabeled: boolean;
    nutritionalInfoAccessible: boolean;
  };

  sensory: {
    quietAreas: boolean;
    noiseLevel: 'very_quiet' | 'quiet' | 'moderate' | 'loud';
    lightingAdjustable: boolean;
    fragranceFree: boolean;
    sensoryFriendlyHours: string[];
  };
}

interface AccessibilityAudit {
  targetId: string;
  targetType: 'page' | 'feature' | 'restaurant';
  wcagLevel: 'A' | 'AA' | 'AAA';
  issues: {
    type: string;
    severity: 'critical' | 'major' | 'minor';
    element: string;
    description: string;
    recommendation: string;
    wcagCriteria: string[];
  }[];
  score: number;
  passedCriteria: string[];
  failedCriteria: string[];
}

@Service()
export class AccessibilityService {
  private redis: Redis;
  private ttsClient: any;
  private translateClient: any;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
    this.ttsClient = new textToSpeech.TextToSpeechClient();
    this.translateClient = new translate.v2.Translate();
  }

  async createAccessibilityProfile(
    userId: string,
    preferences: Partial<AccessibilityProfile['preferences']>
  ): Promise<AccessibilityProfile> {
    const defaultProfile: AccessibilityProfile = {
      userId,
      preferences: {
        visualImpairment: 'none',
        fontSize: 'normal',
        highContrast: false,
        reduceMotion: false,
        screenReaderMode: false,
        hearingImpairment: 'none',
        visualAlerts: false,
        captionsEnabled: false,
        signLanguagePreferred: false,
        motorImpairment: 'none',
        keyboardNavigation: false,
        voiceControl: false,
        dwellClicking: false,
        stickyKeys: false,
        cognitiveSupport: 'none',
        simplifiedInterface: false,
        readingAssistance: false,
        focusMode: false,
        reminderFrequency: 'none',
        primaryLanguage: 'en',
        secondaryLanguages: [],
        readingLevel: 'intermediate',
        technicalTermsSimplification: false,
        ...preferences
      },
      assistiveTechnology: {
        screenReader: null,
        brailleDisplay: false,
        switchDevice: false,
        eyeTracking: false,
        voiceRecognition: false
      }
    };

    await this.redis.set(
      `accessibility:profile:${userId}`,
      JSON.stringify(defaultProfile),
      'EX',
      86400 * 30
    );

    return defaultProfile;
  }

  async getAdaptedContent(
    content: string,
    profile: AccessibilityProfile
  ): Promise<{
    adapted: string;
    format: 'text' | 'html' | 'audio';
    metadata: any;
  }> {
    let adapted = content;
    const metadata: any = {};

    // Simplify language if needed
    if (profile.preferences.cognitiveSupport !== 'none' ||
        profile.preferences.readingLevel === 'basic') {
      adapted = await this.simplifyLanguage(adapted);
      metadata.simplified = true;
    }

    // Translate if needed
    if (profile.preferences.primaryLanguage !== 'en') {
      adapted = await this.translateContent(
        adapted,
        profile.preferences.primaryLanguage
      );
      metadata.translated = true;
      metadata.targetLanguage = profile.preferences.primaryLanguage;
    }

    // Apply visual adaptations
    if (profile.preferences.visualImpairment !== 'none') {
      adapted = this.applyVisualAdaptations(adapted, profile);
      metadata.visuallyAdapted = true;
    }

    // Generate audio if screen reader mode
    if (profile.preferences.screenReaderMode) {
      const audio = await this.generateAudio(adapted, profile);
      return {
        adapted: audio.url,
        format: 'audio',
        metadata: { ...metadata, audioFormat: audio.format }
      };
    }

    return {
      adapted,
      format: 'html',
      metadata
    };
  }

  private async simplifyLanguage(text: string): Promise<string> {
    // Implement language simplification
    const simplifications: Record<string, string> = {
      'utilize': 'use',
      'implement': 'do',
      'demonstrate': 'show',
      'subsequent': 'next',
      'prior to': 'before',
      'in order to': 'to',
      'at this point in time': 'now',
      'due to the fact that': 'because'
    };

    let simplified = text;
    for (const [complex, simple] of Object.entries(simplifications)) {
      const regex = new RegExp(complex, 'gi');
      simplified = simplified.replace(regex, simple);
    }

    // Break long sentences
    const sentences = simplified.split(/[.!?]+/);
    const shortSentences = sentences.map(s => {
      if (s.split(' ').length > 15) {
        // Break into shorter sentences
        const words = s.split(' ');
        const chunks = [];
        for (let i = 0; i < words.length; i += 10) {
          chunks.push(words.slice(i, i + 10).join(' '));
        }
        return chunks.join('. ');
      }
      return s;
    });

    return shortSentences.join('. ');
  }

  private async translateContent(
    text: string,
    targetLanguage: string
  ): Promise<string> {
    try {
      const [translation] = await this.translateClient.translate(
        text,
        targetLanguage
      );
      return translation;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  }

  private applyVisualAdaptations(
    content: string,
    profile: AccessibilityProfile
  ): string {
    const $ = cheerio.load(content);

    // Apply font size
    const fontSizeMap = {
      small: '14px',
      normal: '16px',
      large: '20px',
      extra_large: '24px'
    };
    $('body').css('font-size', fontSizeMap[profile.preferences.fontSize]);

    // Apply high contrast
    if (profile.preferences.highContrast) {
      $('body').addClass('high-contrast');
      $('*').css({
        'background-color': '#000',
        'color': '#fff',
        'border-color': '#fff'
      });
    }

    // Apply color blind filters
    if (profile.preferences.colorBlindType) {
      const filterMap = {
        protanopia: 'url(#protanopia-filter)',
        deuteranopia: 'url(#deuteranopia-filter)',
        tritanopia: 'url(#tritanopia-filter)'
      };
      $('body').css('filter', filterMap[profile.preferences.colorBlindType]);
    }

    // Reduce motion
    if (profile.preferences.reduceMotion) {
      $('*').css({
        'animation': 'none',
        'transition': 'none'
      });
    }

    return $.html();
  }

  async generateAudio(
    text: string,
    profile: AccessibilityProfile
  ): Promise<{ url: string; format: string }> {
    const request = {
      input: { text },
      voice: {
        languageCode: profile.preferences.primaryLanguage,
        ssmlGender: 'NEUTRAL'
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: profile.preferences.cognitiveSupport === 'none' ? 1.0 : 0.85,
        pitch: 0,
        volumeGainDb: 0
      }
    };

    const [response] = await this.ttsClient.synthesizeSpeech(request);

    // Store audio in cloud storage and return URL
    const audioUrl = await this.storeAudio(response.audioContent);

    return {
      url: audioUrl,
      format: 'mp3'
    };
  }

  private async storeAudio(audioContent: Buffer): Promise<string> {
    // Implementation for storing audio in cloud storage
    // This would typically use AWS S3, Google Cloud Storage, etc.
    const audioId = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const url = `https://storage.example.com/audio/${audioId}.mp3`;

    // Store the audio content
    await this.redis.set(
      `audio:${audioId}`,
      audioContent.toString('base64'),
      'EX',
      3600
    );

    return url;
  }

  async findAccessibleRestaurants(
    requirements: Partial<RestaurantAccessibility['physical']>,
    location: { lat: number; lng: number },
    radius: number
  ): Promise<RestaurantAccessibility[]> {
    // Query restaurants with accessibility features
    const query: any = {};

    if (requirements.wheelchairAccessible) {
      query['accessibility.physical.wheelchairAccessible'] = true;
    }
    if (requirements.assistanceAnimalsWelcome) {
      query['accessibility.physical.assistanceAnimalsWelcome'] = true;
    }
    if (requirements.signLanguageStaff) {
      query['accessibility.physical.signLanguageStaff'] = true;
    }

    // Add location filter
    const restaurants = await this.searchNearbyRestaurants(
      location,
      radius,
      query
    );

    return restaurants;
  }

  private async searchNearbyRestaurants(
    location: { lat: number; lng: number },
    radius: number,
    accessibilityQuery: any
  ): Promise<RestaurantAccessibility[]> {
    // Implementation for searching restaurants with accessibility features
    // This would query the database with location and accessibility filters
    const mockRestaurants: RestaurantAccessibility[] = [
      {
        restaurantId: 'rest_1',
        physical: {
          wheelchairAccessible: true,
          wheelchairAccessibleRestroom: true,
          wheelchairAccessibleParking: true,
          automaticDoors: true,
          elevatorAvailable: false,
          rampAvailable: true,
          wideCorridors: true,
          accessibleSeating: 6,
          adjustableTableHeight: true,
          brailleSignage: true,
          tactilePaving: true,
          audioGuidance: false,
          visualAlarms: true,
          staffTrainedInAccessibility: true,
          assistanceAnimalsWelcome: true,
          signLanguageStaff: false,
          writtenCommunicationAvailable: true
        },
        menu: {
          brailleMenuAvailable: true,
          largeMenuAvailable: true,
          digitalMenuWithTTS: true,
          pictorialMenu: true,
          simplifiedMenu: true,
          allergenClearlylabeled: true,
          nutritionalInfoAccessible: true
        },
        sensory: {
          quietAreas: true,
          noiseLevel: 'moderate',
          lightingAdjustable: true,
          fragranceFree: false,
          sensoryFriendlyHours: ['10:00-12:00', '14:00-16:00']
        }
      }
    ];

    return mockRestaurants;
  }

  async performAccessibilityAudit(
    targetId: string,
    targetType: 'page' | 'feature' | 'restaurant',
    wcagLevel: 'A' | 'AA' | 'AAA' = 'AA'
  ): Promise<AccessibilityAudit> {
    const issues: AccessibilityAudit['issues'] = [];
    const passedCriteria: string[] = [];
    const failedCriteria: string[] = [];

    // Perform automated accessibility testing
    if (targetType === 'page') {
      // Check for common issues
      const pageIssues = await this.auditPage(targetId);
      issues.push(...pageIssues);
    } else if (targetType === 'restaurant') {
      // Check restaurant accessibility compliance
      const restaurantIssues = await this.auditRestaurant(targetId);
      issues.push(...restaurantIssues);
    }

    // Calculate score based on passed/failed criteria
    const totalCriteria = passedCriteria.length + failedCriteria.length;
    const score = totalCriteria > 0
      ? (passedCriteria.length / totalCriteria) * 100
      : 0;

    return {
      targetId,
      targetType,
      wcagLevel,
      issues,
      score,
      passedCriteria,
      failedCriteria
    };
  }

  private async auditPage(pageId: string): Promise<AccessibilityAudit['issues']> {
    // Implement page accessibility audit
    return [
      {
        type: 'missing_alt_text',
        severity: 'critical',
        element: 'img#hero-banner',
        description: 'Image missing alternative text',
        recommendation: 'Add descriptive alt text to the image',
        wcagCriteria: ['1.1.1']
      },
      {
        type: 'low_contrast',
        severity: 'major',
        element: '.subtitle',
        description: 'Text color contrast ratio is 3.5:1 (below WCAG AA requirement of 4.5:1)',
        recommendation: 'Increase contrast between text and background colors',
        wcagCriteria: ['1.4.3']
      }
    ];
  }

  private async auditRestaurant(
    restaurantId: string
  ): Promise<AccessibilityAudit['issues']> {
    // Implement restaurant accessibility audit
    return [
      {
        type: 'missing_accessibility_info',
        severity: 'major',
        element: 'restaurant_profile',
        description: 'Restaurant accessibility information not provided',
        recommendation: 'Add comprehensive accessibility information',
        wcagCriteria: ['2.4.6']
      }
    ];
  }

  async generateAccessibilityReport(
    restaurantId: string
  ): Promise<{
    summary: string;
    details: RestaurantAccessibility;
    recommendations: string[];
    certifications: string[];
  }> {
    // Fetch restaurant accessibility data
    const accessibility = await this.getRestaurantAccessibility(restaurantId);

    const recommendations: string[] = [];
    const certifications: string[] = [];

    // Analyze and generate recommendations
    if (!accessibility.physical.wheelchairAccessible) {
      recommendations.push('Install wheelchair ramps and widen doorways');
    }
    if (!accessibility.menu.brailleMenuAvailable) {
      recommendations.push('Provide Braille menus for visually impaired customers');
    }
    if (!accessibility.physical.signLanguageStaff) {
      recommendations.push('Train staff in basic sign language');
    }

    // Check for certifications
    if (this.meetsAccessibilityCriteria(accessibility)) {
      certifications.push('ADA Compliant');
    }

    const summary = `This restaurant has ${
      certifications.length > 0 ? 'achieved' : 'not yet achieved'
    } full accessibility compliance. ${
      recommendations.length
    } improvements recommended.`;

    return {
      summary,
      details: accessibility,
      recommendations,
      certifications
    };
  }

  private async getRestaurantAccessibility(
    restaurantId: string
  ): Promise<RestaurantAccessibility> {
    // Fetch from database or cache
    const cached = await this.redis.get(`accessibility:restaurant:${restaurantId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Return mock data for now
    return {
      restaurantId,
      physical: {
        wheelchairAccessible: true,
        wheelchairAccessibleRestroom: true,
        wheelchairAccessibleParking: false,
        automaticDoors: true,
        elevatorAvailable: true,
        rampAvailable: true,
        wideCorridors: true,
        accessibleSeating: 4,
        adjustableTableHeight: false,
        brailleSignage: false,
        tactilePaving: false,
        audioGuidance: false,
        visualAlarms: true,
        staffTrainedInAccessibility: true,
        assistanceAnimalsWelcome: true,
        signLanguageStaff: false,
        writtenCommunicationAvailable: true
      },
      menu: {
        brailleMenuAvailable: false,
        largeMenuAvailable: true,
        digitalMenuWithTTS: true,
        pictorialMenu: false,
        simplifiedMenu: false,
        allergenClearlylabeled: true,
        nutritionalInfoAccessible: true
      },
      sensory: {
        quietAreas: true,
        noiseLevel: 'moderate',
        lightingAdjustable: false,
        fragranceFree: false,
        sensoryFriendlyHours: []
      }
    };
  }

  private meetsAccessibilityCriteria(
    accessibility: RestaurantAccessibility
  ): boolean {
    // Check if restaurant meets minimum accessibility criteria
    const requiredFeatures = [
      accessibility.physical.wheelchairAccessible,
      accessibility.physical.assistanceAnimalsWelcome,
      accessibility.menu.allergenClearlylabeled
    ];

    return requiredFeatures.every(feature => feature === true);
  }

  async provideNavigationAssistance(
    userId: string,
    restaurantId: string
  ): Promise<{
    instructions: string[];
    audioGuide?: string;
    visualMap?: string;
    estimatedTime: number;
  }> {
    const profile = await this.getUserProfile(userId);
    const restaurant = await this.getRestaurantAccessibility(restaurantId);

    const instructions: string[] = [];
    let audioGuide: string | undefined;
    let visualMap: string | undefined;

    // Generate appropriate navigation based on user needs
    if (profile.preferences.visualImpairment === 'blind') {
      // Detailed audio instructions
      instructions.push(
        'From entrance, proceed straight 10 steps',
        'Turn right at the host stand',
        'Your table is 5 steps ahead on the left'
      );

      audioGuide = await this.generateAudioGuide(instructions, profile);
    } else if (profile.preferences.motorImpairment !== 'none') {
      // Wheelchair accessible route
      instructions.push(
        'Use ramp entrance on the left side',
        'Automatic doors will open',
        'Accessible seating area is to your right'
      );

      visualMap = await this.generateVisualMap(restaurantId, 'accessible');
    }

    return {
      instructions,
      audioGuide,
      visualMap,
      estimatedTime: instructions.length * 30 // seconds per instruction
    };
  }

  private async getUserProfile(userId: string): Promise<AccessibilityProfile> {
    const cached = await this.redis.get(`accessibility:profile:${userId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Return default profile
    return this.createAccessibilityProfile(userId, {});
  }

  private async generateAudioGuide(
    instructions: string[],
    profile: AccessibilityProfile
  ): Promise<string> {
    const combinedText = instructions.join('. ');
    const audio = await this.generateAudio(combinedText, profile);
    return audio.url;
  }

  private async generateVisualMap(
    restaurantId: string,
    type: 'accessible' | 'standard'
  ): Promise<string> {
    // Generate visual map with accessible routes highlighted
    return `https://maps.example.com/restaurant/${restaurantId}/${type}`;
  }
}