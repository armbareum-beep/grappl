export enum VideoCategory {
  Standing = 'Standing',
  Guard = 'Guard',
  GuardPass = 'Guard Pass',
  Side = 'Side',
  Mount = 'Mount',
  Back = 'Back',
}

export enum Difficulty {
  Beginner = 'Beginner',
  Intermediate = 'Intermediate',
  Advanced = 'Advanced',
}

export interface Creator {
  id: string;
  name: string;
  bio: string;
  profileImage: string;
  subscriberCount: number;
  stripeAccountId?: string;
  payoutSettings?: {
    type: 'individual' | 'business';
  };
}

export interface Course {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  creatorName: string;
  category: VideoCategory;
  difficulty: Difficulty;
  thumbnailUrl: string;
  price: number;
  views: number;
  lessonCount?: number;
  createdAt: string;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description: string;
  lessonNumber: number;
  vimeoUrl?: string;
  length: string;
  difficulty: Difficulty;
  createdAt: string;
}

// Keep Video interface for backward compatibility
export interface Video {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  creatorName: string;
  category: VideoCategory;
  difficulty: Difficulty;
  thumbnailUrl: string;
  vimeoUrl?: string;
  length: string;
  price: number;
  views: number;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  isSubscriber: boolean;
  ownedVideoIds: string[];
}

export interface RevenueStats {
  month: string;
  revenue: number;
  watchHours: number;
}

export interface TrainingLog {
  id: string;
  userId: string;
  userName?: string;
  date: string;
  durationMinutes: number;
  techniques: string[];
  sparringRounds: number;
  notes: string;
  isPublic: boolean;
  location?: string;
  youtubeUrl?: string;
  createdAt: string;
  user?: {
    name: string;
    email: string;
    belt?: string;
  };
}

export interface LogFeedback {
  id: string;
  logId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

export type SkillCategory = 'Standing' | 'Guard' | 'Guard Pass' | 'Side' | 'Mount' | 'Back';
export type SkillStatus = 'learning' | 'mastered';

export interface SkillSubcategory {
  id: string;
  userId: string;
  category: SkillCategory;
  name: string;
  displayOrder: number;
  createdAt: string;
}

export interface UserSkill {
  id: string;
  userId: string;
  category: SkillCategory;
  subcategoryId?: string;
  subcategoryName?: string;
  courseId: string;
  courseTitle?: string;
  creatorName?: string;
  status: SkillStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Bundle {
  id: string;
  creatorId: string;
  creatorName?: string;
  title: string;
  description: string;
  price: number;
  thumbnailUrl?: string;
  courseIds?: string[];
  courses?: Course[];
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  creatorId: string;
  discountType: 'percent' | 'fixed';
  value: number;
  maxUses?: number;
  usedCount: number;
  expiresAt?: string;
  createdAt?: string;
}

export type BeltLevel = 'White' | 'Blue' | 'Purple' | 'Brown' | 'Black';

// Feedback System Types
export interface FeedbackSettings {
  id: string;
  instructorId: string;
  enabled: boolean;
  price: number;
  turnaroundDays: number;
  maxActiveRequests: number;
  updatedAt: string;
}

export type FeedbackStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface FeedbackRequest {
  id: string;
  studentId: string;
  studentName?: string;
  instructorId: string;
  instructorName?: string;
  videoUrl: string;
  description: string;
  status: FeedbackStatus;
  price: number;
  feedbackContent?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface FeedbackResponse {
  id: string;
  requestId: string;
  content: string;
  createdAt: string;
}

export interface FeedbackPayment {
  id: string;
  requestId: string;
  studentId: string;
  instructorId: string;
  amount: number;
  platformFee: number;
  instructorRevenue: number;
  paidAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}
