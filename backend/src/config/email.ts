import nodemailer from 'nodemailer';
import { format } from 'date-fns';
import { Reservation } from '../models/Reservation';
import { Restaurant } from '../models/Restaurant';
import { User } from '../models/User';

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Email templates
const getBaseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #DA3743; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f4f4f4; }
    .footer { text-align: center; padding: 20px; color: #666; }
    .button { display: inline-block; padding: 10px 20px; background-color: #DA3743; color: white; text-decoration: none; border-radius: 5px; }
    .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>OpenTable Clone</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} OpenTable Clone. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

export const sendReservationConfirmation = async (
  reservation: Reservation & { restaurant?: Restaurant; user?: User }
) => {
  const restaurant = reservation.restaurant!;
  const user = reservation.user!;
  
  const content = `
    <h2>Reservation Confirmed!</h2>
    <p>Hi ${user.firstName},</p>
    <p>Your reservation has been confirmed. Here are the details:</p>
    
    <div class="details">
      <h3>${restaurant.name}</h3>
      <p><strong>Date:</strong> ${format(new Date(reservation.dateTime), 'EEEE, MMMM d, yyyy')}</p>
      <p><strong>Time:</strong> ${format(new Date(reservation.dateTime), 'h:mm a')}</p>
      <p><strong>Party Size:</strong> ${reservation.partySize} ${reservation.partySize === 1 ? 'person' : 'people'}</p>
      <p><strong>Confirmation Code:</strong> ${reservation.confirmationCode}</p>
      <p><strong>Location:</strong> ${restaurant.address}, ${restaurant.city}, ${restaurant.state}</p>
      ${reservation.specialRequests ? `<p><strong>Special Requests:</strong> ${reservation.specialRequests}</p>` : ''}
    </div>
    
    <p>Need to make changes? <a href="${process.env.FRONTEND_URL}/my-reservations" class="button">Manage Reservation</a></p>
    
    <p>We look forward to seeing you!</p>
  `;

  await transporter.sendMail({
    from: `"OpenTable Clone" <${process.env.SMTP_USER}>`,
    to: user.email,
    subject: `Reservation Confirmed at ${restaurant.name}`,
    html: getBaseTemplate(content),
  });
};

export const sendReservationCancellation = async (
  reservation: Reservation & { restaurant?: Restaurant; user?: User }
) => {
  const restaurant = reservation.restaurant!;
  const user = reservation.user!;
  
  const content = `
    <h2>Reservation Cancelled</h2>
    <p>Hi ${user.firstName},</p>
    <p>Your reservation has been cancelled. Here were the details:</p>
    
    <div class="details">
      <h3>${restaurant.name}</h3>
      <p><strong>Date:</strong> ${format(new Date(reservation.dateTime), 'EEEE, MMMM d, yyyy')}</p>
      <p><strong>Time:</strong> ${format(new Date(reservation.dateTime), 'h:mm a')}</p>
      <p><strong>Confirmation Code:</strong> ${reservation.confirmationCode}</p>
    </div>
    
    <p>Want to book again? <a href="${process.env.FRONTEND_URL}/restaurants/${restaurant.id}" class="button">Make New Reservation</a></p>
  `;

  await transporter.sendMail({
    from: `"OpenTable Clone" <${process.env.SMTP_USER}>`,
    to: user.email,
    subject: `Reservation Cancelled at ${restaurant.name}`,
    html: getBaseTemplate(content),
  });
};

export const sendReservationReminder = async (
  reservation: Reservation & { restaurant?: Restaurant; user?: User }
) => {
  const restaurant = reservation.restaurant!;
  const user = reservation.user!;
  
  const content = `
    <h2>Reservation Reminder</h2>
    <p>Hi ${user.firstName},</p>
    <p>This is a reminder about your upcoming reservation tomorrow:</p>
    
    <div class="details">
      <h3>${restaurant.name}</h3>
      <p><strong>Date:</strong> ${format(new Date(reservation.dateTime), 'EEEE, MMMM d, yyyy')}</p>
      <p><strong>Time:</strong> ${format(new Date(reservation.dateTime), 'h:mm a')}</p>
      <p><strong>Party Size:</strong> ${reservation.partySize} ${reservation.partySize === 1 ? 'person' : 'people'}</p>
      <p><strong>Location:</strong> ${restaurant.address}, ${restaurant.city}, ${restaurant.state}</p>
      <p><strong>Phone:</strong> ${restaurant.phone}</p>
    </div>
    
    <p>Need to make changes? <a href="${process.env.FRONTEND_URL}/my-reservations" class="button">Manage Reservation</a></p>
    
    <p>See you tomorrow!</p>
  `;

  await transporter.sendMail({
    from: `"OpenTable Clone" <${process.env.SMTP_USER}>`,
    to: user.email,
    subject: `Reminder: Reservation Tomorrow at ${restaurant.name}`,
    html: getBaseTemplate(content),
  });
};

export const sendWelcomeEmail = async (user: User) => {
  const content = `
    <h2>Welcome to OpenTable Clone!</h2>
    <p>Hi ${user.firstName},</p>
    <p>Thank you for joining OpenTable Clone. We're excited to help you discover amazing dining experiences!</p>
    
    <p>Here's what you can do:</p>
    <ul>
      <li>Search thousands of restaurants</li>
      <li>Make instant reservations</li>
      <li>Earn loyalty points</li>
      <li>Share reviews and photos</li>
    </ul>
    
    <p><a href="${process.env.FRONTEND_URL}/restaurants" class="button">Find Restaurants</a></p>
    
    <p>Happy dining!</p>
  `;

  await transporter.sendMail({
    from: `"OpenTable Clone" <${process.env.SMTP_USER}>`,
    to: user.email,
    subject: 'Welcome to OpenTable Clone!',
    html: getBaseTemplate(content),
  });
};

// Restaurant owner notifications
export const sendNewReservationToOwner = async (
  reservation: Reservation & { restaurant?: Restaurant; user?: User }
) => {
  const restaurant = reservation.restaurant!;
  const user = reservation.user!;
  const owner = await restaurant.$get('owner') as User;
  
  const content = `
    <h2>New Reservation</h2>
    <p>Hi ${owner.firstName},</p>
    <p>You have a new reservation at ${restaurant.name}:</p>
    
    <div class="details">
      <p><strong>Guest:</strong> ${user.firstName} ${user.lastName}</p>
      <p><strong>Date:</strong> ${format(new Date(reservation.dateTime), 'EEEE, MMMM d, yyyy')}</p>
      <p><strong>Time:</strong> ${format(new Date(reservation.dateTime), 'h:mm a')}</p>
      <p><strong>Party Size:</strong> ${reservation.partySize} ${reservation.partySize === 1 ? 'person' : 'people'}</p>
      <p><strong>Phone:</strong> ${user.phone || 'Not provided'}</p>
      ${reservation.specialRequests ? `<p><strong>Special Requests:</strong> ${reservation.specialRequests}</p>` : ''}
    </div>
    
    <p><a href="${process.env.FRONTEND_URL}/dashboard" class="button">View in Dashboard</a></p>
  `;

  await transporter.sendMail({
    from: `"OpenTable Clone" <${process.env.SMTP_USER}>`,
    to: owner.email,
    subject: `New Reservation at ${restaurant.name}`,
    html: getBaseTemplate(content),
  });
};