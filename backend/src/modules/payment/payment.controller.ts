import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {

  @Post('process')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process a payment for reservation' })
  @ApiResponse({ status: 201, type: PaymentResponseDto })
  async processPayment(@Body() createPaymentDto: CreatePaymentDto, @Req() req: any) {
    const payment = {
      id: 'payment-' + Date.now(),
      reservationId: createPaymentDto.reservationId,
      userId: req.user.sub,
      amount: createPaymentDto.amount,
      currency: createPaymentDto.currency || 'USD',
      paymentMethod: createPaymentDto.paymentMethod,
      status: 'completed',
      transactionId: 'txn_' + Math.random().toString(36).substring(7),
      stripePaymentIntentId: 'pi_' + Math.random().toString(36).substring(7),
      fee: Math.round(createPaymentDto.amount * 0.029 + 30), // Stripe fee simulation
      netAmount: createPaymentDto.amount - Math.round(createPaymentDto.amount * 0.029 + 30),
      description: createPaymentDto.description,
      metadata: createPaymentDto.metadata,
      createdAt: new Date(),
      processedAt: new Date(),
    };

    return {
      success: true,
      data: payment,
      message: 'Payment processed successfully',
    };
  }

  @Get(':paymentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment details' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  async getPayment(@Param('paymentId') paymentId: string, @Req() req: any) {
    const payment = {
      id: paymentId,
      reservationId: 'reservation-123',
      userId: req.user.sub,
      amount: 5000, // $50.00 in cents
      currency: 'USD',
      paymentMethod: 'card',
      status: 'completed',
      transactionId: 'txn_abc123',
      stripePaymentIntentId: 'pi_def456',
      fee: 175,
      netAmount: 4825,
      description: 'Dinner reservation deposit',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      processedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    };

    return {
      success: true,
      data: payment,
    };
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user payment history' })
  @ApiResponse({ status: 200, type: [PaymentResponseDto] })
  async getUserPayments(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
    @Req() req: any,
  ) {
    const mockPayments = Array.from({ length: limit }, (_, idx) => ({
      id: `payment-${userId}-${idx}`,
      reservationId: `reservation-${idx}`,
      restaurantName: `Restaurant ${idx + 1}`,
      amount: Math.floor(Math.random() * 10000) + 1000,
      currency: 'USD',
      paymentMethod: ['card', 'paypal', 'apple_pay'][Math.floor(Math.random() * 3)],
      status: status || ['completed', 'pending', 'failed', 'refunded'][Math.floor(Math.random() * 4)],
      transactionId: `txn_${Math.random().toString(36).substring(7)}`,
      description: `Payment for reservation at Restaurant ${idx + 1}`,
      createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
    }));

    return {
      success: true,
      data: {
        payments: mockPayments,
        pagination: {
          page,
          limit,
          total: 45,
          totalPages: Math.ceil(45 / limit),
        },
        summary: {
          totalSpent: 125000, // $1,250.00
          totalTransactions: 45,
          averageTransaction: 2778, // $27.78
        },
      },
    };
  }

  @Post(':paymentId/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('restaurant_owner', 'restaurant_staff', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process a refund' })
  @ApiResponse({ status: 200 })
  async refundPayment(
    @Param('paymentId') paymentId: string,
    @Body() refundDto: RefundPaymentDto,
    @Req() req: any,
  ) {
    const refund = {
      id: 'refund-' + Date.now(),
      paymentId,
      amount: refundDto.amount,
      reason: refundDto.reason,
      description: refundDto.description,
      status: 'processed',
      stripeRefundId: 're_' + Math.random().toString(36).substring(7),
      processedBy: req.user.sub,
      estimatedArrival: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
      createdAt: new Date(),
      processedAt: new Date(),
    };

    return {
      success: true,
      data: refund,
      message: 'Refund processed successfully',
    };
  }

  @Post('webhook/stripe')
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  @ApiResponse({ status: 200 })
  async stripeWebhook(@Body() body: any, @Req() req: any) {
    // Mock webhook processing
    const event = body;

    switch (event.type) {
      case 'payment_intent.succeeded':
        // Handle successful payment
        break;
      case 'payment_intent.payment_failed':
        // Handle failed payment
        break;
      case 'charge.dispute.created':
        // Handle dispute creation
        break;
      default:
        // Handle unknown event
        break;
    }

    return { received: true };
  }

  @Get('methods/user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user saved payment methods' })
  @ApiResponse({ status: 200 })
  async getPaymentMethods(@Param('userId') userId: string, @Req() req: any) {
    const mockMethods = [
      {
        id: 'pm_card_visa',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '4242',
          expMonth: 12,
          expYear: 2025,
        },
        isDefault: true,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'pm_card_mastercard',
        type: 'card',
        card: {
          brand: 'mastercard',
          last4: '5555',
          expMonth: 8,
          expYear: 2024,
        },
        isDefault: false,
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      },
    ];

    return {
      success: true,
      data: mockMethods,
    };
  }

  @Post('methods')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add new payment method' })
  @ApiResponse({ status: 201 })
  async addPaymentMethod(
    @Body() body: { paymentMethodId: string; setAsDefault?: boolean },
    @Req() req: any,
  ) {
    const paymentMethod = {
      id: body.paymentMethodId,
      type: 'card',
      card: {
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2025,
      },
      isDefault: body.setAsDefault || false,
      createdAt: new Date(),
    };

    return {
      success: true,
      data: paymentMethod,
      message: 'Payment method added successfully',
    };
  }

  @Delete('methods/:paymentMethodId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove payment method' })
  @ApiResponse({ status: 200 })
  async removePaymentMethod(
    @Param('paymentMethodId') paymentMethodId: string,
    @Req() req: any,
  ) {
    return {
      success: true,
      message: 'Payment method removed successfully',
    };
  }

  @Get('analytics/restaurant/:restaurantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('restaurant_owner', 'restaurant_staff', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment analytics for restaurant' })
  @ApiResponse({ status: 200 })
  async getPaymentAnalytics(@Param('restaurantId') restaurantId: string) {
    return {
      success: true,
      data: {
        totalRevenue: 125000, // $1,250.00
        totalTransactions: 250,
        averageTransaction: 500, // $5.00
        revenueByMonth: [
          { month: 'Jan', revenue: 35000, transactions: 70 },
          { month: 'Feb', revenue: 42000, transactions: 84 },
          { month: 'Mar', revenue: 48000, transactions: 96 },
        ],
        paymentMethods: {
          card: 180,
          paypal: 45,
          apple_pay: 25,
        },
        refundRate: 2.5,
        disputeRate: 0.8,
        processingFees: 3625, // Total fees
        netRevenue: 121375, // After fees
      },
    };
  }

  @Post('setup-intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create setup intent for saving payment method' })
  @ApiResponse({ status: 201 })
  async createSetupIntent(@Req() req: any) {
    return {
      success: true,
      data: {
        clientSecret: 'seti_' + Math.random().toString(36).substring(7) + '_secret_' + Math.random().toString(36).substring(7),
        setupIntentId: 'seti_' + Math.random().toString(36).substring(7),
      },
    };
  }

  @Post('payment-intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create payment intent for reservation' })
  @ApiResponse({ status: 201 })
  async createPaymentIntent(
    @Body() body: { amount: number; currency?: string; reservationId: string },
    @Req() req: any,
  ) {
    return {
      success: true,
      data: {
        clientSecret: 'pi_' + Math.random().toString(36).substring(7) + '_secret_' + Math.random().toString(36).substring(7),
        paymentIntentId: 'pi_' + Math.random().toString(36).substring(7),
        amount: body.amount,
        currency: body.currency || 'USD',
      },
    };
  }
}