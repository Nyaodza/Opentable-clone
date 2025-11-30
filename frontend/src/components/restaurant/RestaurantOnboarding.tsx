'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';

const restaurantSchema = z.object({
  name: z.string().min(2, 'Restaurant name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  address: z.string().min(5, 'Please enter a complete address'),
  city: z.string().min(2, 'Please enter a valid city'),
  state: z.string().min(2, 'Please enter a valid state'),
  zipCode: z.string().min(5, 'Please enter a valid zip code'),
  cuisine: z.string().min(2, 'Please select a cuisine type'),
  description: z.string().min(10, 'Please provide a description (minimum 10 characters)'),
  priceRange: z.enum(['$', '$$', '$$$', '$$$$']),
  capacity: z.number().min(1, 'Capacity must be at least 1'),
  operatingHours: z.object({
    monday: z.object({ open: z.string(), close: z.string(), closed: z.boolean().optional() }),
    tuesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean().optional() }),
    wednesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean().optional() }),
    thursday: z.object({ open: z.string(), close: z.string(), closed: z.boolean().optional() }),
    friday: z.object({ open: z.string(), close: z.string(), closed: z.boolean().optional() }),
    saturday: z.object({ open: z.string(), close: z.string(), closed: z.boolean().optional() }),
    sunday: z.object({ open: z.string(), close: z.string(), closed: z.boolean().optional() }),
  }),
});

type RestaurantFormData = z.infer<typeof restaurantSchema>;

const defaultHours = {
  open: '09:00',
  close: '22:00',
  closed: false,
};

export function RestaurantOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RestaurantFormData>({
    resolver: zodResolver(restaurantSchema),
    defaultValues: {
      priceRange: '$$',
      capacity: 50,
      operatingHours: {
        monday: defaultHours,
        tuesday: defaultHours,
        wednesday: defaultHours,
        thursday: defaultHours,
        friday: defaultHours,
        saturday: defaultHours,
        sunday: defaultHours,
      },
    },
  });

  const onSubmit = async (data: RestaurantFormData) => {
    setIsLoading(true);
    try {
      // Submit to API
      const response = await fetch('/api/restaurants/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setSuccess(true);
      }
    } catch (error) {
      console.error('Failed to submit restaurant:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { title: 'Basic Information', description: 'Tell us about your restaurant' },
    { title: 'Location & Contact', description: 'Where can customers find you?' },
    { title: 'Operating Hours', description: 'When are you open?' },
    { title: 'Review & Submit', description: 'Confirm your details' },
  ];

  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Restaurant Name *</label>
        <Input {...register('name')} placeholder="Enter restaurant name" />
        {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Cuisine Type *</label>
          <Input {...register('cuisine')} placeholder="e.g., Italian, Mexican" />
          {errors.cuisine && <p className="text-sm text-red-500">{errors.cuisine.message}</p>}
        </div>
        <div>
          <label className="text-sm font-medium">Price Range *</label>
          <select {...register('priceRange')} className="w-full p-2 border rounded-md">
            <option value="$">$ - Budget Friendly</option>
            <option value="$$">$$ - Moderate</option>
            <option value="$$$">$$$ - Expensive</option>
            <option value="$$$$">$$$$ - Very Expensive</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Description *</label>
        <textarea 
          {...register('description')} 
          className="w-full p-2 border rounded-md h-24"
          placeholder="Describe your restaurant, atmosphere, and specialties"
        />
        {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
      </div>

      <div>
        <label className="text-sm font-medium">Capacity (Number of Seats) *</label>
        <Input 
          type="number" 
          {...register('capacity', { valueAsNumber: true })} 
          placeholder="50" 
        />
        {errors.capacity && <p className="text-sm text-red-500">{errors.capacity.message}</p>}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Email *</label>
          <Input type="email" {...register('email')} placeholder="restaurant@example.com" />
          {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
        </div>
        <div>
          <label className="text-sm font-medium">Phone *</label>
          <Input {...register('phone')} placeholder="(555) 123-4567" />
          {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Street Address *</label>
        <Input {...register('address')} placeholder="123 Main Street" />
        {errors.address && <p className="text-sm text-red-500">{errors.address.message}</p>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium">City *</label>
          <Input {...register('city')} placeholder="New York" />
          {errors.city && <p className="text-sm text-red-500">{errors.city.message}</p>}
        </div>
        <div>
          <label className="text-sm font-medium">State *</label>
          <Input {...register('state')} placeholder="NY" />
          {errors.state && <p className="text-sm text-red-500">{errors.state.message}</p>}
        </div>
        <div>
          <label className="text-sm font-medium">Zip Code *</label>
          <Input {...register('zipCode')} placeholder="10001" />
          {errors.zipCode && <p className="text-sm text-red-500">{errors.zipCode.message}</p>}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <h3 className="font-medium">Operating Hours</h3>
      {Object.entries(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map(([index, day]) => (
        <div key={day} className="flex items-center space-x-4">
          <div className="w-24 capitalize font-medium">{day}</div>
          <Controller
            name={`operatingHours.${day}.closed`}
            control={control}
            render={({ field }) => (
              <label className="flex items-center">
                <input type="checkbox" checked={field.value} onChange={field.onChange} className="mr-2" />
                Closed
              </label>
            )}
          />
          {!watch(`operatingHours.${day}.closed`) && (
            <>
              <div>
                <label className="text-sm">Open:</label>
                <Input 
                  type="time" 
                  {...register(`operatingHours.${day}.open`)}
                  className="w-32"
                />
              </div>
              <div>
                <label className="text-sm">Close:</label>
                <Input 
                  type="time" 
                  {...register(`operatingHours.${day}.close`)}
                  className="w-32"
                />
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );

  if (success) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-green-500 text-6xl mb-4">✓</div>
            <h2 className="text-2xl font-bold mb-2">Registration Successful!</h2>
            <p className="text-gray-600 mb-4">
              Thank you for joining our platform. Your restaurant registration has been submitted 
              for review. We'll contact you within 24-48 hours with next steps.
            </p>
            <Button onClick={() => window.location.href = '/dashboard'}>
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Restaurant Registration</h1>
        <p className="text-gray-600">Join our platform and reach thousands of potential customers</p>
      </div>

      {/* Step Progress */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              index + 1 <= currentStep ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}>
              {index + 1}
            </div>
            <div className="ml-3">
              <div className="font-medium">{step.title}</div>
              <div className="text-sm text-gray-500">{step.description}</div>
            </div>
            {index < steps.length - 1 && (
              <div className="flex-1 h-1 bg-gray-200 mx-4">
                <div className={`h-full ${
                  index + 1 < currentStep ? 'bg-blue-500' : 'bg-gray-200'
                }`} />
              </div>
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep - 1].title}</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && (
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Please review all information before submitting. You can edit these details later from your dashboard.
                  </AlertDescription>
                </Alert>
                <div className="bg-gray-50 p-4 rounded">
                  <pre className="text-sm">{JSON.stringify(watch(), null, 2)}</pre>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
            >
              Previous
            </Button>
            
            {currentStep < 4 ? (
              <Button
                type="button"
                onClick={() => setCurrentStep(currentStep + 1)}
              >
                Next
              </Button>
            ) : (
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Submitting...' : 'Submit Registration'}
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
