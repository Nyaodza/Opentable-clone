import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';

@ApiTags('Reservations')
@Controller('reservations')
export class ReservationController {
  constructor() {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get user reservations' })
  @ApiResponse({ status: 200, description: 'List of user reservations' })
  async getUserReservations(
    @Req() req: Request,
    @Query('status') status?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const userId = req.user['id'];
    
    // Mock reservations data
    const mockReservations = [
      {
        id: '1',
        restaurantId: '1',
        restaurantName: 'The Gourmet Kitchen',
        date: '2023-12-15',
        time: '7:00 PM',
        partySize: 4,
        status: 'confirmed',
        confirmationCode: 'ABC123',
        specialRequests: 'Window table preferred',
        createdAt: '2023-12-01T10:00:00Z',
      },
      {
        id: '2',
        restaurantId: '2',
        restaurantName: 'Sakura Sushi Bar',
        date: '2023-12-20',
        time: '6:30 PM',
        partySize: 2,
        status: 'pending',
        confirmationCode: 'DEF456',
        specialRequests: null,
        createdAt: '2023-12-05T15:30:00Z',
      },
    ];

    return {
      reservations: mockReservations,
      total: mockReservations.length,
      page,
      limit,
    };
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get reservation details' })
  @ApiResponse({ status: 200, description: 'Reservation details' })
  async getReservation(@Param('id') id: string, @Req() req: Request) {
    // Mock reservation data
    return {
      id,
      userId: req.user['id'],
      restaurantId: '1',
      restaurant: {
        id: '1',
        name: 'The Gourmet Kitchen',
        address: '123 Main St, Downtown',
        phone: '(555) 123-4567',
        image: 'https://via.placeholder.com/300x200',
      },
      date: '2023-12-15',
      time: '7:00 PM',
      partySize: 4,
      status: 'confirmed',
      confirmationCode: 'ABC123',
      specialRequests: 'Window table preferred',
      occasion: 'Anniversary',
      guestNotes: 'Celebrating our 5th anniversary',
      depositAmount: 50,
      depositPaid: true,
      createdAt: '2023-12-01T10:00:00Z',
      updatedAt: '2023-12-01T10:00:00Z',
    };
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create new reservation' })
  @ApiResponse({ status: 201, description: 'Reservation created successfully' })
  async createReservation(@Body() createReservationDto: any, @Req() req: Request) {
    const userId = req.user['id'];

    // Mock reservation creation
    const newReservation = {
      id: 'new-reservation-id',
      userId,
      ...createReservationDto,
      status: 'pending',
      confirmationCode: this.generateConfirmationCode(),
      createdAt: new Date(),
    };

    return {
      success: true,
      message: 'Reservation created successfully',
      reservation: newReservation,
    };
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update reservation' })
  @ApiResponse({ status: 200, description: 'Reservation updated successfully' })
  async updateReservation(
    @Param('id') id: string,
    @Body() updateReservationDto: any,
    @Req() req: Request,
  ) {
    return {
      success: true,
      message: 'Reservation updated successfully',
      reservation: {
        id,
        ...updateReservationDto,
        updatedAt: new Date(),
      },
    };
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Cancel reservation' })
  @ApiResponse({ status: 200, description: 'Reservation cancelled successfully' })
  async cancelReservation(
    @Param('id') id: string,
    @Body() cancellationDto: { reason?: string },
    @Req() req: Request,
  ) {
    return {
      success: true,
      message: 'Reservation cancelled successfully',
      reservation: {
        id,
        status: 'cancelled',
        cancellationReason: cancellationDto.reason,
        cancelledAt: new Date(),
        cancelledBy: req.user['id'],
      },
    };
  }

  @Post(':id/confirm')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Confirm reservation' })
  @ApiResponse({ status: 200, description: 'Reservation confirmed successfully' })
  async confirmReservation(@Param('id') id: string, @Req() req: Request) {
    return {
      success: true,
      message: 'Reservation confirmed successfully',
      reservation: {
        id,
        status: 'confirmed',
        confirmedAt: new Date(),
        confirmedBy: req.user['id'],
      },
    };
  }

  @Post(':id/check-in')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Check in for reservation' })
  @ApiResponse({ status: 200, description: 'Checked in successfully' })
  async checkIn(@Param('id') id: string, @Req() req: Request) {
    return {
      success: true,
      message: 'Checked in successfully',
      reservation: {
        id,
        status: 'seated',
        seatedAt: new Date(),
      },
    };
  }

  @Get(':id/qr-code')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get reservation QR code' })
  @ApiResponse({ status: 200, description: 'QR code for reservation' })
  async getQRCode(@Param('id') id: string, @Req() req: Request) {
    return {
      qrCode: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`,
      reservationUrl: `${process.env.FRONTEND_URL}/reservations/${id}`,
    };
  }

  @Get('restaurant/:restaurantId')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get restaurant reservations (for restaurant owners)' })
  @ApiResponse({ status: 200, description: 'Restaurant reservations' })
  async getRestaurantReservations(
    @Param('restaurantId') restaurantId: string,
    @Query('date') date?: string,
    @Query('status') status?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Req() req: Request,
  ) {
    // Mock restaurant reservations data
    const mockReservations = [
      {
        id: '1',
        userId: 'user1',
        guestName: 'John Smith',
        guestPhone: '(555) 123-4567',
        guestEmail: 'john@example.com',
        date: date || '2023-12-15',
        time: '7:00 PM',
        partySize: 4,
        status: 'confirmed',
        tableNumber: 'T1',
        specialRequests: 'Window table preferred',
        occasion: 'Anniversary',
        createdAt: '2023-12-01T10:00:00Z',
      },
      {
        id: '2',
        userId: 'user2',
        guestName: 'Sarah Johnson',
        guestPhone: '(555) 987-6543',
        guestEmail: 'sarah@example.com',
        date: date || '2023-12-15',
        time: '6:30 PM',
        partySize: 2,
        status: 'pending',
        tableNumber: null,
        specialRequests: null,
        occasion: null,
        createdAt: '2023-12-05T15:30:00Z',
      },
    ];

    return {
      reservations: mockReservations,
      total: mockReservations.length,
      page,
      limit,
      summary: {
        totalToday: 15,
        confirmed: 12,
        pending: 2,
        cancelled: 1,
        expectedRevenue: 2400,
      },
    };
  }

  private generateConfirmationCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}
