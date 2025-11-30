import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { Play, Calendar, Users, Clock, Star, Headphones, Monitor, Smartphone } from 'lucide-react';
import { gql } from '@apollo/client';

interface VirtualExperience {
  id: number;
  title: string;
  restaurant: string;
  duration: number;
  price: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  image: string;
  description: string;
  features: string[];
  rating?: number;
  participants?: number;
  category?: string;
  vrRequired?: boolean;
  ingredients?: string[];
  chef?: {
    name: string;
    avatar: string;
    rating: number;
  };
}

interface VirtualExperienceHubProps {
  experiences: VirtualExperience[];
  setExperiences: React.Dispatch<React.SetStateAction<VirtualExperience[]>>;
}

const GET_VIRTUAL_EXPERIENCES = gql`
  query GetVirtualExperiences($input: VirtualExperienceSearchInput!) {
    virtualExperiences(input: $input) {
      id
      title
      description
      experienceType
      duration
      maxParticipants
      price
      currency
      rating
      totalBookings
      difficulty
      language
      requirements
      restaurant {
        id
        name
        cuisine
        rating
      }
      vrAssets {
        thumbnailUrl
        sceneUrl
      }
      availableSlots {
        date
        startTime
        endTime
        available
      }
    }
    popularVirtualExperiences(limit: 6) {
      id
      title
      experienceType
      price
      rating
      restaurant {
        name
      }
      vrAssets {
        thumbnailUrl
      }
    }
  }
`;

const GET_USER_VIRTUAL_BOOKINGS = gql`
  query GetUserVirtualBookings($userId: ID!) {
    virtualBookings(userId: $userId) {
      id
      bookingDate
      startTime
      endTime
      status
      joinUrl
      sessionId
      totalPrice
      virtualExperience {
        id
        title
        experienceType
        restaurant {
          name
        }
      }
    }
  }
`;

const CREATE_VIRTUAL_BOOKING = gql`
  mutation CreateVirtualBooking($input: VirtualBookingInput!) {
    createVirtualBooking(input: $input) {
      id
      bookingDate
      startTime
      joinUrl
      sessionId
      totalPrice
    }
  }
`;

const START_VR_SESSION = gql`
  mutation StartVRSession($bookingId: ID!) {
    startVRSession(bookingId: $bookingId)
  }
`;

interface VirtualExperienceHubProps {
  userId: string;
}

const VirtualExperienceHub: React.FC<VirtualExperienceHubProps> = ({ userId }) => {
  const [activeTab, setActiveTab] = useState('explore');
  const [selectedExperience, setSelectedExperience] = useState<any>(null);
  const [bookingForm, setBookingForm] = useState({
    date: '',
    time: '',
    participants: [{ name: '', email: '' }],
    deviceType: 'vr_headset',
  });

  const { data: experiencesData, loading: experiencesLoading } = useQuery(GET_VIRTUAL_EXPERIENCES, {
    variables: {
      input: {
        limit: 20,
        isActive: true,
      },
    },
  });

  const { data: bookingsData, loading: bookingsLoading, refetch: refetchBookings } = useQuery(GET_USER_VIRTUAL_BOOKINGS, {
    variables: { userId },
  });

  const [createBooking] = useMutation(CREATE_VIRTUAL_BOOKING);
  const [startVRSession] = useMutation(START_VR_SESSION);

  const handleBookExperience = async () => {
    try {
      const result = await createBooking({
        variables: {
          input: {
            virtualExperienceId: selectedExperience.id,
            bookingDate: bookingForm.date,
            startTime: bookingForm.time,
            participants: bookingForm.participants.filter(p => p.name),
            deviceInfo: {
              type: bookingForm.deviceType,
              capabilities: getDeviceCapabilities(bookingForm.deviceType),
            },
          },
        },
      });

      if (result.data?.createVirtualBooking) {
        alert('Virtual experience booked successfully!');
        setSelectedExperience(null);
        refetchBookings();
      }
    } catch (error) {
      console.error('Error booking virtual experience:', error);
      alert('Failed to book virtual experience. Please try again.');
    }
  };

  const handleJoinSession = async (bookingId: string, joinUrl: string) => {
    try {
      await startVRSession({ variables: { bookingId } });
      window.open(joinUrl, '_blank');
    } catch (error) {
      console.error('Error starting VR session:', error);
    }
  };

  const getDeviceCapabilities = (deviceType: string) => {
    const capabilities = {
      vr_headset: ['3d_rendering', 'spatial_audio', 'hand_tracking', 'room_scale'],
      mobile: ['gyroscope', 'accelerometer', 'camera', 'microphone'],
      desktop: ['high_resolution', 'surround_sound', 'keyboard_mouse'],
      tablet: ['touch_screen', 'gyroscope', 'camera', 'microphone'],
    };
    return capabilities[deviceType as keyof typeof capabilities] || [];
  };

  const getExperienceTypeIcon = (type: string) => {
    const icons = {
      vr_tour: '🏛️',
      virtual_dining: '🍽️',
      cooking_class: '👨‍🍳',
      chef_table: '🔥',
      wine_tasting: '🍷',
      cultural_experience: '🎭',
    };
    return icons[type as keyof typeof icons] || '🎮';
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      beginner: 'bg-green-100 text-green-800',
      intermediate: 'bg-yellow-100 text-yellow-800',
      advanced: 'bg-red-100 text-red-800',
    };
    return colors[difficulty as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getDeviceIcon = (deviceType: string) => {
    const icons = {
      vr_headset: Headphones,
      mobile: Smartphone,
      desktop: Monitor,
      tablet: Smartphone,
    };
    return icons[deviceType as keyof typeof icons] || Monitor;
  };

  if (experiencesLoading || bookingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const experiences = experiencesData?.virtualExperiences || [];
  const popularExperiences = experiencesData?.popularVirtualExperiences || [];
  const bookings = bookingsData?.virtualBookings || [];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Virtual Restaurant Experiences</h1>
        <p className="text-gray-600">Immersive dining experiences from the comfort of your home</p>
      </div>

      {/* Popular Experiences Carousel */}
      <Card>
        <CardHeader>
          <CardTitle>🔥 Popular Virtual Experiences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularExperiences.map((experience: any) => (
              <div
                key={experience.id}
                className="relative overflow-hidden rounded-lg cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedExperience(experience)}
              >
                <img
                  src={experience.vrAssets?.thumbnailUrl || '/placeholder-vr.jpg'}
                  alt={experience.title}
                  className="w-full h-32 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-2 left-2 right-2 text-white">
                  <p className="font-semibold text-sm">{experience.title}</p>
                  <p className="text-xs opacity-90">{experience.restaurant.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs">${experience.price}</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-current" />
                      <span className="text-xs">{experience.rating}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="explore">Explore</TabsTrigger>
          <TabsTrigger value="bookings">My Bookings</TabsTrigger>
          <TabsTrigger value="live">Live Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="explore" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {experiences.map((experience: any) => (
              <Card key={experience.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  <img
                    src={experience.vrAssets?.thumbnailUrl || '/placeholder-vr.jpg'}
                    alt={experience.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-black/70 text-white">
                      {getExperienceTypeIcon(experience.experienceType)} {experience.experienceType.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge className={getDifficultyColor(experience.difficulty)}>
                      {experience.difficulty}
                    </Badge>
                  </div>
                </div>
                
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{experience.title}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{experience.description}</p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Restaurant:</span>
                      <span className="font-medium">{experience.restaurant.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {experience.duration} min
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Max Participants:</span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {experience.maxParticipants}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Price:</span>
                      <span className="font-bold text-lg">${experience.price}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-current text-yellow-400" />
                      <span className="text-sm">{experience.rating} ({experience.totalBookings} bookings)</span>
                    </div>
                    <Button
                      onClick={() => setSelectedExperience(experience)}
                      size="sm"
                    >
                      Book Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="bookings" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bookings.map((booking: any) => (
              <Card key={booking.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">{booking.virtualExperience.title}</h3>
                    <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                      {booking.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{booking.bookingDate} at {booking.startTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{booking.virtualExperience.restaurant.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Total: ${booking.totalPrice}</span>
                    </div>
                  </div>

                  {booking.status === 'confirmed' && booking.joinUrl && (
                    <Button
                      onClick={() => handleJoinSession(booking.id, booking.joinUrl)}
                      className="w-full"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Join Experience
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
            
            {bookings.length === 0 && (
              <div className="col-span-2 text-center py-12">
                <p className="text-gray-500 mb-4">No virtual experiences booked yet</p>
                <Button onClick={() => setActiveTab('explore')}>
                  Explore Experiences
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="live" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>🔴 Live Virtual Experiences</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-500 py-8">
                No live sessions available at the moment. Check back later!
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Booking Dialog */}
      <Dialog open={!!selectedExperience} onOpenChange={() => setSelectedExperience(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Book Virtual Experience</DialogTitle>
          </DialogHeader>
          
          {selectedExperience && (
            <div className="space-y-6">
              <div>
                <img
                  src={selectedExperience.vrAssets?.thumbnailUrl || '/placeholder-vr.jpg'}
                  alt={selectedExperience.title}
                  className="w-full h-48 object-cover rounded-lg"
                />
                <h3 className="text-xl font-semibold mt-4">{selectedExperience.title}</h3>
                <p className="text-gray-600">{selectedExperience.restaurant.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Date</label>
                  <input
                    type="date"
                    value={bookingForm.date}
                    onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                    className="w-full p-3 border rounded-lg"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Time</label>
                  <select
                    value={bookingForm.time}
                    onChange={(e) => setBookingForm({ ...bookingForm, time: e.target.value })}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="">Select time</option>
                    {selectedExperience.availableSlots?.map((slot: any) => (
                      <option key={slot.startTime} value={slot.startTime}>
                        {slot.startTime} - {slot.endTime} ({slot.available} spots available)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Device Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {['vr_headset', 'mobile', 'desktop', 'tablet'].map((device) => {
                    const Icon = getDeviceIcon(device);
                    return (
                      <button
                        key={device}
                        onClick={() => setBookingForm({ ...bookingForm, deviceType: device })}
                        className={`p-3 border rounded-lg flex items-center gap-2 ${
                          bookingForm.deviceType === device ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-sm capitalize">{device.replace('_', ' ')}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Participants</label>
                {bookingForm.participants.map((participant, index) => (
                  <div key={index} className="grid grid-cols-2 gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Name"
                      value={participant.name}
                      onChange={(e) => {
                        const newParticipants = [...bookingForm.participants];
                        newParticipants[index].name = e.target.value;
                        setBookingForm({ ...bookingForm, participants: newParticipants });
                      }}
                      className="p-2 border rounded"
                    />
                    <input
                      type="email"
                      placeholder="Email (optional)"
                      value={participant.email}
                      onChange={(e) => {
                        const newParticipants = [...bookingForm.participants];
                        newParticipants[index].email = e.target.value;
                        setBookingForm({ ...bookingForm, participants: newParticipants });
                      }}
                      className="p-2 border rounded"
                    />
                  </div>
                ))}
                {bookingForm.participants.length < selectedExperience.maxParticipants && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBookingForm({
                      ...bookingForm,
                      participants: [...bookingForm.participants, { name: '', email: '' }]
                    })}
                  >
                    Add Participant
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <p className="text-lg font-semibold">
                    Total: ${selectedExperience.price * bookingForm.participants.filter(p => p.name).length}
                  </p>
                  <p className="text-sm text-gray-600">
                    {bookingForm.participants.filter(p => p.name).length} participant(s) × ${selectedExperience.price}
                  </p>
                </div>
                <Button
                  onClick={handleBookExperience}
                  disabled={!bookingForm.date || !bookingForm.time || !bookingForm.participants.some(p => p.name)}
                >
                  Book Experience
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VirtualExperienceHub;
