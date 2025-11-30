import { RestaurantOnboarding } from '../models/RestaurantOnboarding';
import { Restaurant } from '../models/Restaurant';
import { RestaurantHours } from '../models/RestaurantHours';
import { Table } from '../models/Table';

export interface OnboardingProgress {
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
  percentComplete: number;
  isComplete: boolean;
}

export class RestaurantOnboardingService {
  /**
   * Initialize onboarding for a new restaurant
   */
  async initializeOnboarding(restaurantId: string, userId: string): Promise<RestaurantOnboarding> {
    // Check if onboarding already exists
    let onboarding = await RestaurantOnboarding.findOne({
      where: { restaurantId },
    });

    if (onboarding) {
      return onboarding;
    }

    // Create new onboarding record
    onboarding = await RestaurantOnboarding.create({
      restaurantId,
      userId,
      currentStep: 1,
      draftData: {},
    });

    return onboarding;
  }

  /**
   * Get onboarding progress
   */
  async getProgress(restaurantId: string): Promise<OnboardingProgress> {
    const onboarding = await RestaurantOnboarding.findOne({
      where: { restaurantId },
    });

    if (!onboarding) {
      return {
        currentStep: 1,
        totalSteps: 7,
        completedSteps: [],
        percentComplete: 0,
        isComplete: false,
      };
    }

    const completedSteps: string[] = [];
    if (onboarding.basicInfoComplete) completedSteps.push('basicInfo');
    if (onboarding.hoursComplete) completedSteps.push('hours');
    if (onboarding.menuComplete) completedSteps.push('menu');
    if (onboarding.tablesComplete) completedSteps.push('tables');
    if (onboarding.photosComplete) completedSteps.push('photos');
    if (onboarding.policiesComplete) completedSteps.push('policies');
    if (onboarding.paymentComplete) completedSteps.push('payment');

    return {
      currentStep: onboarding.currentStep,
      totalSteps: 7,
      completedSteps,
      percentComplete: Math.round((completedSteps.length / 7) * 100),
      isComplete: onboarding.isComplete,
    };
  }

  /**
   * Save step data
   */
  async saveStepData(
    restaurantId: string,
    step: string,
    data: Record<string, any>
  ): Promise<RestaurantOnboarding> {
    const onboarding = await RestaurantOnboarding.findOne({
      where: { restaurantId },
    });

    if (!onboarding) {
      throw new Error('Onboarding not initialized');
    }

    // Update draft data
    const draftData = { ...onboarding.draftData, [step]: data };
    await onboarding.update({ draftData });

    return onboarding;
  }

  /**
   * Complete a step
   */
  async completeStep(restaurantId: string, step: string): Promise<RestaurantOnboarding> {
    const onboarding = await RestaurantOnboarding.findOne({
      where: { restaurantId },
    });

    if (!onboarding) {
      throw new Error('Onboarding not initialized');
    }

    const updates: any = {};

    switch (step) {
      case 'basicInfo':
        updates.basicInfoComplete = true;
        updates.currentStep = Math.max(onboarding.currentStep, 2);
        break;
      case 'hours':
        updates.hoursComplete = true;
        updates.currentStep = Math.max(onboarding.currentStep, 3);
        break;
      case 'menu':
        updates.menuComplete = true;
        updates.currentStep = Math.max(onboarding.currentStep, 4);
        break;
      case 'tables':
        updates.tablesComplete = true;
        updates.currentStep = Math.max(onboarding.currentStep, 5);
        break;
      case 'photos':
        updates.photosComplete = true;
        updates.currentStep = Math.max(onboarding.currentStep, 6);
        break;
      case 'policies':
        updates.policiesComplete = true;
        updates.currentStep = Math.max(onboarding.currentStep, 7);
        break;
      case 'payment':
        updates.paymentComplete = true;
        break;
    }

    await onboarding.update(updates);

    // Check if all steps complete
    await this.checkCompletion(restaurantId);

    return onboarding;
  }

  /**
   * Check if onboarding is complete
   */
  async checkCompletion(restaurantId: string): Promise<boolean> {
    const onboarding = await RestaurantOnboarding.findOne({
      where: { restaurantId },
    });

    if (!onboarding) {
      return false;
    }

    const isComplete =
      onboarding.basicInfoComplete &&
      onboarding.hoursComplete &&
      onboarding.menuComplete &&
      onboarding.tablesComplete &&
      onboarding.photosComplete &&
      onboarding.policiesComplete &&
      onboarding.paymentComplete;

    if (isComplete && !onboarding.isComplete) {
      await onboarding.update({
        isComplete: true,
        completedAt: new Date(),
      });

      // Activate restaurant
      await Restaurant.update(
        { isActive: true },
        { where: { id: restaurantId } }
      );
    }

    return isComplete;
  }

  /**
   * Get onboarding checklist
   */
  async getChecklist(restaurantId: string): Promise<any> {
    const onboarding = await RestaurantOnboarding.findOne({
      where: { restaurantId },
    });

    const restaurant = await Restaurant.findByPk(restaurantId);
    const hours = await RestaurantHours.count({ where: { restaurantId } });
    const tables = await Table.count({ where: { restaurantId } });

    return {
      steps: [
        {
          id: 'basicInfo',
          title: 'Basic Information',
          description: 'Name, cuisine, location, contact',
          complete: onboarding?.basicInfoComplete || false,
          required: true,
        },
        {
          id: 'hours',
          title: 'Operating Hours',
          description: 'Set your hours for each day',
          complete: onboarding?.hoursComplete || hours >= 7,
          required: true,
        },
        {
          id: 'menu',
          title: 'Menu Items',
          description: 'Add your dishes and prices',
          complete: onboarding?.menuComplete || false,
          required: true,
        },
        {
          id: 'tables',
          title: 'Table Setup',
          description: 'Configure your floor plan',
          complete: onboarding?.tablesComplete || tables > 0,
          required: true,
        },
        {
          id: 'photos',
          title: 'Photos',
          description: 'Upload restaurant images',
          complete: onboarding?.photosComplete || (restaurant?.images?.length || 0) >= 3,
          required: true,
        },
        {
          id: 'policies',
          title: 'Policies',
          description: 'Cancellation, deposit, no-show',
          complete: onboarding?.policiesComplete || false,
          required: true,
        },
        {
          id: 'payment',
          title: 'Payment Setup',
          description: 'Connect payment account',
          complete: onboarding?.paymentComplete || false,
          required: true,
        },
      ],
      isComplete: onboarding?.isComplete || false,
    };
  }

  /**
   * Skip optional step
   */
  async skipStep(restaurantId: string, step: string): Promise<void> {
    await this.completeStep(restaurantId, step);
  }

  /**
   * Reset onboarding
   */
  async resetOnboarding(restaurantId: string): Promise<void> {
    await RestaurantOnboarding.update(
      {
        currentStep: 1,
        basicInfoComplete: false,
        hoursComplete: false,
        menuComplete: false,
        tablesComplete: false,
        photosComplete: false,
        policiesComplete: false,
        paymentComplete: false,
        isComplete: false,
        completedAt: null,
      },
      { where: { restaurantId } }
    );
  }
}

export default new RestaurantOnboardingService();
