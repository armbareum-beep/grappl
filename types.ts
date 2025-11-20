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

export interface Video {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  creatorName: string; // Denormalized for ease
  category: VideoCategory;
  difficulty: Difficulty;
  thumbnailUrl: string;
  length: string; // e.g., "12:30"
  price: number; // 0 if free/subscription only
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
