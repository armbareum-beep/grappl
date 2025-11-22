export enum VideoCategory {
  Technique = 'Technique',
  Drill = 'Drill',
  Sparring = 'Sparring',
  Lecture = 'Lecture',
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
  date: string;
  durationMinutes: number;
  techniques: string[];
  sparringRounds: number;
  notes: string;
  createdAt: string;
}
