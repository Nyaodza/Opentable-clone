/**
 * Dynamic Pricing Service
 * Implements intelligent pricing based on demand, time, and other factors
 */

interface PricingFactors {
  basePrice: number;
  demandMultiplier: number;
  timeMultiplier: number;
  dayOfWeekMultiplier: number;
  weatherMultiplier: number;
  eventMultiplier: number;
  occupancyMultiplier: number;
}

interface PricingResult {
  originalPrice: number;
  adjustedPrice: number;
  discount: number;
  surge: number;
  factors: Partial<PricingFactors>;
  reasoning: string[];
}

export class DynamicPricingService {
  /**
   * Calculate dynamic price for a reservation
   */
  async calculatePrice(params: {
    restaurantId: string;
    dateTime: Date;
    partySize: number;
    basePrice?: number;
  }): Promise<PricingResult> {
    const { restaurantId, dateTime, partySize, basePrice = 0 } = params;

    const factors: PricingFactors = {
      basePrice,
      demandMultiplier: await this.getDemandMultiplier(restaurantId, dateTime),
      timeMultiplier: this.getTimeMultiplier(dateTime),
      dayOfWeekMultiplier: this.getDayOfWeekMultiplier(dateTime),
      weatherMultiplier: await this.getWeatherMultiplier(dateTime),
      eventMultiplier: await this.getEventMultiplier(restaurantId, dateTime),
      occupancyMultiplier: await this.getOccupancyMultiplier(restaurantId, dateTime),
    };

    const reasoning: string[] = [];
    
    // Calculate final multiplier
    let finalMultiplier = 1.0;
    
    // Apply demand-based pricing
    if (factors.demandMultiplier > 1.0) {
      finalMultiplier *= factors.demandMultiplier;
      reasoning.push(`High demand period (+${((factors.demandMultiplier - 1) * 100).toFixed(0)}%)`);
    }
    
    // Apply time-based pricing
    if (factors.timeMultiplier !== 1.0) {
      finalMultiplier *= factors.timeMultiplier;
      if (factors.timeMultiplier > 1.0) {
        reasoning.push(`Peak hours (+${((factors.timeMultiplier - 1) * 100).toFixed(0)}%)`);
      } else {
        reasoning.push(`Off-peak discount (-${((1 - factors.timeMultiplier) * 100).toFixed(0)}%)`);
      }
    }
    
    // Apply day of week pricing
    if (factors.dayOfWeekMultiplier !== 1.0) {
      finalMultiplier *= factors.dayOfWeekMultiplier;
      if (factors.dayOfWeekMultiplier > 1.0) {
        reasoning.push(`Weekend premium (+${((factors.dayOfWeekMultiplier - 1) * 100).toFixed(0)}%)`);
      }
    }
    
    // Apply occupancy-based pricing
    if (factors.occupancyMultiplier > 1.0) {
      finalMultiplier *= factors.occupancyMultiplier;
      reasoning.push(`Limited availability (+${((factors.occupancyMultiplier - 1) * 100).toFixed(0)}%)`);
    } else if (factors.occupancyMultiplier < 1.0) {
      finalMultiplier *= factors.occupancyMultiplier;
      reasoning.push(`Low occupancy discount (-${((1 - factors.occupancyMultiplier) * 100).toFixed(0)}%)`);
    }

    const adjustedPrice = basePrice * finalMultiplier;
    const priceDiff = adjustedPrice - basePrice;

    return {
      originalPrice: basePrice,
      adjustedPrice: Math.round(adjustedPrice * 100) / 100,
      discount: priceDiff < 0 ? Math.abs(priceDiff) : 0,
      surge: priceDiff > 0 ? priceDiff : 0,
      factors,
      reasoning: reasoning.length > 0 ? reasoning : ['Standard pricing'],
    };
  }

  /**
   * Get demand multiplier based on historical data
   */
  private async getDemandMultiplier(restaurantId: string, dateTime: Date): Promise<number> {
    // Simulate demand calculation
    // In production, this would query historical booking data
    const hour = dateTime.getHours();
    const isWeekend = dateTime.getDay() === 0 || dateTime.getDay() === 6;
    
    if (isWeekend && (hour >= 18 && hour <= 21)) {
      return 1.3; // 30% surge for weekend dinner
    }
    
    if (hour >= 19 && hour <= 20) {
      return 1.2; // 20% surge for peak dinner time
    }
    
    return 1.0;
  }

  /**
   * Get time-based multiplier
   */
  private getTimeMultiplier(dateTime: Date): number {
    const hour = dateTime.getHours();
    
    // Peak dinner time (6-9 PM): 1.2x
    if (hour >= 18 && hour <= 21) {
      return 1.2;
    }
    
    // Lunch time (11 AM - 2 PM): 1.0x
    if (hour >= 11 && hour <= 14) {
      return 1.0;
    }
    
    // Off-peak (3-5 PM): 0.85x discount
    if (hour >= 15 && hour <= 17) {
      return 0.85;
    }
    
    // Late night (9 PM+): 0.9x discount
    if (hour >= 21) {
      return 0.9;
    }
    
    return 1.0;
  }

  /**
   * Get day of week multiplier
   */
  private getDayOfWeekMultiplier(dateTime: Date): number {
    const day = dateTime.getDay();
    
    // Friday/Saturday: 1.15x
    if (day === 5 || day === 6) {
      return 1.15;
    }
    
    // Sunday: 1.1x
    if (day === 0) {
      return 1.1;
    }
    
    // Monday/Tuesday: 0.9x discount
    if (day === 1 || day === 2) {
      return 0.9;
    }
    
    return 1.0;
  }

  /**
   * Get weather-based multiplier
   */
  private async getWeatherMultiplier(dateTime: Date): Promise<number> {
    // In production, integrate with weather API
    // Bad weather might reduce outdoor dining, adjust pricing
    return 1.0;
  }

  /**
   * Get event-based multiplier
   */
  private async getEventMultiplier(restaurantId: string, dateTime: Date): Promise<number> {
    // In production, check for local events, holidays, concerts, etc.
    // Major events nearby: 1.25x
    return 1.0;
  }

  /**
   * Get occupancy-based multiplier
   */
  private async getOccupancyMultiplier(restaurantId: string, dateTime: Date): Promise<number> {
    // In production, query current reservation count
    // High occupancy (>80%): 1.2x
    // Low occupancy (<30%): 0.85x
    return 1.0;
  }

  /**
   * Get pricing recommendations for a time range
   */
  async getPricingRecommendations(params: {
    restaurantId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<Array<{ date: Date; recommendedMultiplier: number; reasoning: string[] }>> {
    const recommendations = [];
    const currentDate = new Date(params.startDate);
    
    while (currentDate <= params.endDate) {
      const pricing = await this.calculatePrice({
        restaurantId: params.restaurantId,
        dateTime: new Date(currentDate),
        partySize: 2,
        basePrice: 100,
      });
      
      recommendations.push({
        date: new Date(currentDate),
        recommendedMultiplier: pricing.adjustedPrice / pricing.originalPrice,
        reasoning: pricing.reasoning,
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return recommendations;
  }
}

export default new DynamicPricingService();
