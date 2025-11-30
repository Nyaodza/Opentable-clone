import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import Voice, {
  SpeechRecognizedEvent,
  SpeechResultsEvent,
  SpeechErrorEvent,
} from '@react-native-voice/voice';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface VoiceSearchProps {
  onSearchResult: (query: string, intent: VoiceIntent) => void;
  onClose: () => void;
}

interface VoiceIntent {
  type: 'search' | 'book' | 'navigate' | 'filter' | 'unknown';
  cuisine?: string;
  location?: string;
  date?: string;
  time?: string;
  partySize?: number;
  priceRange?: string;
  parameters: Record<string, any>;
}

const VoiceSearch: React.FC<VoiceSearchProps> = ({ onSearchResult, onClose }) => {
  const [isListening, setIsListening] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [waveAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechRecognized = onSpeechRecognized;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechResults = onSpeechResults;

    requestMicrophonePermission();

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  useEffect(() => {
    if (isListening) {
      startPulseAnimation();
      startWaveAnimation();
    } else {
      stopAnimations();
    }
  }, [isListening]);

  const requestMicrophonePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'This app needs access to your microphone for voice search.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      } catch (err) {
        console.warn(err);
        setHasPermission(false);
      }
    } else {
      setHasPermission(true); // iOS permissions handled in Info.plist
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startWaveAnimation = () => {
    Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  };

  const stopAnimations = () => {
    pulseAnim.stopAnimation();
    waveAnim.stopAnimation();
    pulseAnim.setValue(1);
    waveAnim.setValue(0);
  };

  const onSpeechStart = (e: any) => {
    console.log('Speech started');
    setIsListening(true);
  };

  const onSpeechRecognized = (e: SpeechRecognizedEvent) => {
    console.log('Speech recognized');
  };

  const onSpeechEnd = (e: any) => {
    console.log('Speech ended');
    setIsListening(false);
  };

  const onSpeechError = (e: SpeechErrorEvent) => {
    console.log('Speech error:', e.error);
    setIsListening(false);
    setIsProcessing(false);
    Alert.alert('Voice Error', 'Sorry, I couldn\'t understand that. Please try again.');
  };

  const onSpeechResults = (e: SpeechResultsEvent) => {
    console.log('Speech results:', e.value);
    if (e.value && e.value.length > 0) {
      const spokenText = e.value[0];
      setRecognizedText(spokenText);
      setIsProcessing(true);
      processVoiceCommand(spokenText);
    }
  };

  const processVoiceCommand = async (text: string) => {
    try {
      const intent = parseVoiceIntent(text.toLowerCase());
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsProcessing(false);
      onSearchResult(text, intent);
    } catch (error) {
      console.error('Error processing voice command:', error);
      setIsProcessing(false);
      Alert.alert('Processing Error', 'Sorry, I couldn\'t process your request.');
    }
  };

  const parseVoiceIntent = (text: string): VoiceIntent => {
    const intent: VoiceIntent = {
      type: 'unknown',
      parameters: {},
    };

    // Search patterns
    if (text.includes('find') || text.includes('search') || text.includes('look for')) {
      intent.type = 'search';
    }
    
    // Booking patterns
    else if (text.includes('book') || text.includes('reserve') || text.includes('table')) {
      intent.type = 'book';
    }
    
    // Navigation patterns
    else if (text.includes('directions') || text.includes('navigate') || text.includes('how to get')) {
      intent.type = 'navigate';
    }
    
    // Filter patterns
    else if (text.includes('show me') || text.includes('filter')) {
      intent.type = 'filter';
    }
    
    // Default to search
    else {
      intent.type = 'search';
    }

    // Extract cuisine types
    const cuisines = [
      'italian', 'chinese', 'japanese', 'mexican', 'indian', 'french', 'thai',
      'american', 'mediterranean', 'korean', 'vietnamese', 'greek', 'spanish'
    ];
    
    for (const cuisine of cuisines) {
      if (text.includes(cuisine)) {
        intent.cuisine = cuisine;
        intent.parameters.cuisine = cuisine;
        break;
      }
    }

    // Extract location
    const locationKeywords = ['near', 'in', 'at', 'around'];
    for (const keyword of locationKeywords) {
      const index = text.indexOf(keyword);
      if (index !== -1) {
        const locationPart = text.substring(index + keyword.length).trim();
        const locationMatch = locationPart.match(/^([a-zA-Z\s]+)/);
        if (locationMatch) {
          intent.location = locationMatch[1].trim();
          intent.parameters.location = intent.location;
        }
        break;
      }
    }

    // Extract time
    const timePatterns = [
      /(\d{1,2})\s*(am|pm)/gi,
      /(\d{1,2}):(\d{2})\s*(am|pm)/gi,
      /(morning|afternoon|evening|night)/gi,
      /(breakfast|lunch|dinner)/gi
    ];

    for (const pattern of timePatterns) {
      const match = text.match(pattern);
      if (match) {
        intent.time = match[0];
        intent.parameters.time = match[0];
        break;
      }
    }

    // Extract date
    const datePatterns = [
      /(today|tomorrow|tonight)/gi,
      /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
      /(\d{1,2})\s*(st|nd|rd|th)/gi
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        intent.date = match[0];
        intent.parameters.date = match[0];
        break;
      }
    }

    // Extract party size
    const partySizeMatch = text.match(/(\d+)\s*(people|person|guests?)/i);
    if (partySizeMatch) {
      intent.partySize = parseInt(partySizeMatch[1]);
      intent.parameters.partySize = intent.partySize;
    }

    // Extract price range
    const priceKeywords = {
      'cheap': 'BUDGET',
      'budget': 'BUDGET',
      'affordable': 'BUDGET',
      'expensive': 'EXPENSIVE',
      'fancy': 'EXPENSIVE',
      'upscale': 'EXPENSIVE',
      'fine dining': 'VERY_EXPENSIVE',
      'moderate': 'MODERATE'
    };

    for (const [keyword, range] of Object.entries(priceKeywords)) {
      if (text.includes(keyword)) {
        intent.priceRange = range;
        intent.parameters.priceRange = range;
        break;
      }
    }

    return intent;
  };

  const startListening = async () => {
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Microphone permission is required for voice search.');
      return;
    }

    try {
      await Voice.start('en-US');
      setRecognizedText('');
    } catch (e) {
      console.error('Error starting voice recognition:', e);
      Alert.alert('Error', 'Failed to start voice recognition.');
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
    } catch (e) {
      console.error('Error stopping voice recognition:', e);
    }
  };

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Icon name="mic-off" size={48} color="#ccc" />
          <Text style={styles.permissionText}>
            Microphone permission is required for voice search
          </Text>
          <TouchableOpacity 
            style={styles.permissionButton} 
            onPress={requestMicrophonePermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Icon name="close" size={24} color="white" />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Voice Search</Text>
        
        {recognizedText ? (
          <View style={styles.recognizedTextContainer}>
            <Text style={styles.recognizedText}>"{recognizedText}"</Text>
          </View>
        ) : null}

        <View style={styles.microphoneContainer}>
          <Animated.View
            style={[
              styles.microphoneButton,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.micButton,
                isListening && styles.micButtonActive,
                isProcessing && styles.micButtonProcessing,
              ]}
              onPress={isListening ? stopListening : startListening}
              disabled={isProcessing}
            >
              <Icon
                name={isProcessing ? "hourglass-empty" : isListening ? "mic" : "mic-none"}
                size={32}
                color="white"
              />
            </TouchableOpacity>
          </Animated.View>

          {isListening && (
            <Animated.View
              style={[
                styles.waveContainer,
                {
                  opacity: waveAnim,
                },
              ]}
            >
              {[...Array(3)].map((_, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.wave,
                    {
                      transform: [
                        {
                          scale: waveAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.5 + i * 0.5],
                          }),
                        },
                      ],
                      opacity: waveAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.7, 0.1],
                      }),
                    },
                  ]}
                />
              ))}
            </Animated.View>
          )}
        </View>

        <Text style={styles.statusText}>
          {isProcessing
            ? 'Processing your request...'
            : isListening
            ? 'Listening... Speak now'
            : 'Tap the microphone and say something like:'
          }
        </Text>

        {!isListening && !isProcessing && (
          <View style={styles.examplesContainer}>
            <Text style={styles.exampleText}>"Find Italian restaurants near me"</Text>
            <Text style={styles.exampleText}>"Book a table for 4 tonight"</Text>
            <Text style={styles.exampleText}>"Show me cheap Chinese food"</Text>
            <Text style={styles.exampleText}>"Find restaurants open now"</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 40,
  },
  recognizedTextContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 30,
    minWidth: 200,
  },
  recognizedText: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  microphoneContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  microphoneButton: {
    position: 'relative',
    zIndex: 2,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  micButtonActive: {
    backgroundColor: '#FF3B30',
  },
  micButtonProcessing: {
    backgroundColor: '#FF9500',
  },
  waveContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wave: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  statusText: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
    marginBottom: 30,
  },
  examplesContainer: {
    alignItems: 'center',
  },
  exampleText: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionText: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginVertical: 20,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default VoiceSearch;
