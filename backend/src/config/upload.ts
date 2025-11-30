import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';

// Configure AWS S3
const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  },
  region: process.env.AWS_REGION || 'us-east-1'
});

// File filter for images
const imageFileFilter = (req: Request, file: Express.Multer.File, callback: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return callback(null, true);
  } else {
    callback(new Error('Only image files are allowed'));
  }
};

// Local storage configuration (for development)
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// S3 storage configuration (for production)
const s3Storage = multerS3({
  s3: s3,
  bucket: process.env.AWS_S3_BUCKET || 'opentable-clone',
  metadata: (req, file, cb) => {
    cb(null, { fieldName: file.fieldname });
  },
  key: (req, file, cb) => {
    const folder = file.fieldname === 'restaurantImages' ? 'restaurants' : 'reviews';
    const uniqueName = `${folder}/${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Create multer upload instance
export const upload = multer({
  storage: process.env.NODE_ENV === 'production' ? s3Storage : localStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Upload configurations for different use cases
export const uploadReviewPhotos = upload.array('photos', 5); // Max 5 photos per review
export const uploadRestaurantImages = upload.array('images', 10); // Max 10 images per restaurant
export const uploadUserAvatar = upload.single('avatar');

// Helper function to delete files from S3
export const deleteFromS3 = async (fileUrl: string) => {
  if (!fileUrl.includes('amazonaws.com')) return;

  const key = fileUrl.split('.com/')[1];
  const params = {
    Bucket: process.env.AWS_S3_BUCKET || 'opentable-clone',
    Key: key
  };

  try {
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
    await s3.send(new DeleteObjectCommand(params));
  } catch (error) {
    console.error('Error deleting file from S3:', error);
  }
};

// Helper to get file URL
export const getFileUrl = (file: Express.Multer.File): string => {
  if (process.env.NODE_ENV === 'production') {
    return (file as any).location; // S3 URL
  } else {
    return `${process.env.BACKEND_URL || 'http://localhost:3001'}/uploads/${file.filename}`;
  }
};