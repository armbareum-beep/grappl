export enum VideoCategory {
  Standing = 'Standing',
  Guard = 'Guard',
  GuardPass = 'Guard Pass',
  Side = 'Side',
  Mount = 'Mount',
  Back = 'Back',
  Submission = 'Submission',
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
    wiseAccountNumber?: string;
    wiseRoutingNumber?: string;
    wiseSwiftBic?: string;
    wiseAccountName?: string;
  };
}

export interface Course {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  creatorName: string;
  creatorProfileImage?: string;
  category: VideoCategory;
  difficulty: Difficulty;
  thumbnailUrl: string;
  price: number;
  views: number;
  lessonCount?: number;
  createdAt: string;
  isSubscriptionExcluded?: boolean; // If true, subscribers cannot access for free
  previewVideoUrl?: string; // URL of the first lesson for preview
  published?: boolean;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description: string;
  lessonNumber: number;
  vimeoUrl?: string;
  thumbnailUrl?: string; // Added for dashboard display
  durationMinutes?: number; // Added for dashboard display
  length: string;
  difficulty: Difficulty;
  views?: number; // Added for dashboard display
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

// ==================== Subscription Types ====================

export type SubscriptionTier = 'basic' | 'premium';
export type BillingPeriod = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing';

export interface Subscription {
  id: string;
  userId: string;
  subscriptionTier: SubscriptionTier;
  billingPeriod: BillingPeriod;
  amount: number;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  stripeSubscriptionId?: string;
  createdAt: string;
}

export interface SubscriptionPricing {
  id: string;
  tier: SubscriptionTier;
  billingPeriod: BillingPeriod;
  price: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const SUBSCRIPTION_BENEFITS = {
  basic: [
    '모든 강좌 무제한 시청',
    '매주 업데이트되는 신규 기술',
    '스파링 분석 영상 접근',
    '루틴 30% 할인 구매',
  ],
  premium: [
    '베이직의 모든 혜택',
    '모든 루틴 무제한 접근',
    '신규 루틴 자동 추가',
    '오프라인 세미나 우선권',
    '인스트럭터 Q&A 우선 답변',
  ],
};

// ==================== Revenue Stats ====================

export interface RevenueStats {
  month: string;
  revenue: number;
  watchHours: number;
}

export interface TrainingLog {
  id: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  userBelt?: string;
  date: string;
  durationMinutes: number;
  techniques: string[];
  sparringRounds: number;
  notes: string;
  isPublic: boolean;
  location?: string;
  youtubeUrl?: string; // Legacy support
  mediaUrl?: string; // New: Direct video/image upload
  mediaType?: 'video' | 'image';
  type?: 'routine' | 'sparring' | 'level_up' | 'title_earned' | 'technique' | 'general';
  metadata?: Record<string, any>;
  likes?: number;
  comments?: number;
  createdAt: string;
  user?: {
    name: string;
    email: string;
    belt?: string;
    profileImage?: string;
    isInstructor?: boolean;
  };
}

export interface SparringVideo {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  videoUrl: string; // Vimeo ID or full URL
  thumbnailUrl: string;
  relatedItems: {
    type: 'drill' | 'lesson' | 'course';
    id: string;
    title: string;
  }[];
  views: number;
  likes: number;
  creator?: Creator; // Joined creator profile
  creatorProfileImage?: string; // Add for consistent access
  createdAt?: string; // Standardized to camelCase
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
  creatorProfileImage?: string;
  name?: string; // Optional for backward compatibility
  title: string;
  description: string;
  price: number;
  thumbnailUrl?: string;
  courseIds?: string[];
  course_ids?: string[]; // Database field name compatibility
  courses?: Course[];
  drillIds?: string[];
  drill_ids?: string[]; // Database field name compatibility
  drills?: Drill[];
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  creatorId: string;
  creatorName?: string;
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

// ==================== Gamification Types ====================

export interface UserProgress {
  userId: string;
  beltLevel: number;
  currentXp: number;
  totalXp: number;
  lastQuestReset: string;
  createdAt: string;
  updatedAt: string;
}

export type QuestType = 'write_log' | 'add_skill' | 'play_match' | 'sparring_review' | 'complete_routine' | 'give_feedback';

export interface DailyQuest {
  id: string;
  userId: string;
  questType: QuestType;
  targetCount: number;
  currentCount: number;
  xpReward: number;
  completed: boolean;
  questDate: string;
  createdAt: string;
}

export interface XPTransaction {
  id: string;
  userId: string;
  amount: number;
  source: string;
  sourceId?: string;
  createdAt: string;
}

// ==================== Drill & Routine Types ====================

export interface Drill {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  creatorName?: string;
  category: VideoCategory;
  difficulty: Difficulty;
  thumbnailUrl: string;
  videoUrl?: string; // Direct video URL for Reels
  descriptionVideoUrl?: string; // 설명 영상 URL
  vimeoUrl?: string;
  aspectRatio: '9:16'; // 세로 영상
  durationMinutes: number;
  length?: string; // Alternative format
  duration?: string; // Display duration
  price: number;
  tags?: string[]; // For hashtags
  likes?: number;
  views: number;
  createdAt: string;
}

export interface DrillRoutine {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  creatorName?: string;
  thumbnailUrl: string;
  price: number;
  views: number;
  drillCount?: number;
  drills?: Drill[];
  createdAt: string;
  difficulty?: Difficulty;
  category?: VideoCategory;
  totalDurationMinutes?: number;
  creatorProfileImage?: string;
}

export interface DrillRoutineItem {
  id: string;
  routineId: string;
  drillId: string;
  displayOrder: number;
  createdAt: string;
}

export interface Title {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  conditionType: string;
  conditionValue: number;
  createdAt: string;
}

// ==================== Technique Mastery System ====================

export type TechniqueCategory = 'Standing' | 'Guard' | 'Guard Pass' | 'Side' | 'Mount' | 'Back';

export type MasteryLevel = 1 | 2 | 3 | 4 | 5 | 6;

export const MASTERY_LEVEL_NAMES: Record<MasteryLevel, string> = {
  1: 'Tried',
  2: 'Understood',
  3: 'Can Perform',
  4: 'Succeeds Occasionally',
  5: 'High Success',
  6: 'Competition Ready'
};

export const MASTERY_LEVEL_NAMES_KO: Record<MasteryLevel, string> = {
  1: '시도함',
  2: '이해함',
  3: '수행 가능',
  4: '가끔 성공',
  5: '높은 성공률',
  6: '대회 준비 완료'
};

export const MASTERY_XP_THRESHOLDS: Record<MasteryLevel, number> = {
  1: 0,
  2: 100,
  3: 300,
  4: 600,
  5: 1000,
  6: 1500
};

export interface CombatImpact {
  standing: number;
  guard: number;
  pass: number;
  submission: number;
}

export interface Technique {
  id: string;
  category: TechniqueCategory;
  name: string;
  nameEn?: string;
  description?: string;
  difficulty: Difficulty;

  // Combat Impact Weights (0.0 - 1.0)
  impactStanding: number;
  impactGuard: number;
  impactPass: number;
  impactSubmission: number;

  // Pre-linked recommendations
  recommendedCourseIds?: string[];
  recommendedDrillIds?: string[];

  createdAt: string;
}

export interface UserTechniqueMastery {
  id: string;
  userId: string;
  techniqueId: string;

  // Mastery Progress
  masteryLevel: MasteryLevel;
  masteryXp: number;
  progressPercent: number;

  // Performance Stats
  totalSuccessCount: number;
  totalAttemptCount: number;
  lastSuccessDate?: string;
  lastPracticeDate?: string;

  // Populated fields
  technique?: Technique;

  createdAt: string;
  updatedAt: string;
}

export type TechniqueXpSourceType =
  | 'course_lesson'
  | 'routine_completion'
  | 'drill_practice'
  | 'sparring_success'
  | 'sparring_attempt'
  | 'training_log'
  | 'feed_post'
  | 'instructor_endorsement'
  | 'manual';

export const TECHNIQUE_XP_AMOUNTS: Record<TechniqueXpSourceType, number> = {
  course_lesson: 30,
  routine_completion: 20,
  drill_practice: 15,
  sparring_success: 10,
  sparring_attempt: 3,
  training_log: 5,
  feed_post: 3,
  instructor_endorsement: 50,
  manual: 0
};

export interface TechniqueXpTransaction {
  id: string;
  userId: string;
  techniqueId: string;

  xpAmount: number;
  sourceType: TechniqueXpSourceType;
  sourceId?: string;

  // Snapshot
  oldLevel: number;
  newLevel: number;
  oldXp: number;
  newXp: number;

  createdAt: string;
}

export interface TechniqueGoal {
  id: string;
  userId: string;
  techniqueId: string;
  targetLevel: MasteryLevel;
  targetMonth: string; // YYYY-MM-DD
  completed: boolean;
  completedAt?: string;

  technique?: Technique;

  createdAt: string;
}

export interface TechniqueSummary {
  category: TechniqueCategory;
  totalTechniques: number;
  masteredTechniques: number;
  avgMasteryLevel: number;
  totalXp: number;
}

export interface TechniqueDetailData {
  mastery: UserTechniqueMastery;
  technique: Technique;

  // Related content
  relatedCourses: Course[];
  relatedDrills: Drill[];
  relatedRoutines: DrillRoutine[];

  // History
  xpHistory: TechniqueXpTransaction[];
  sparringHistory: any[]; // TODO: Define sparring log type
  feedPosts: any[]; // TODO: Define feed post type

  // Analytics
  weeklyXpTrend: { week: string; xp: number }[];
  successRate: number;
}

export interface TechniqueRecommendation {
  technique: Technique;
  reason: 'weakest' | 'trending' | 'related' | 'goal';
  priority: number;
}

// ==================== Skill Tree Types ====================

export interface SkillTreeNode {
  id: string;
  contentType: 'technique' | 'lesson' | 'drill' | 'text';
  contentId: string;
  position: { x: number; y: number };
  type: 'content' | 'text';
  data?: any; // For text content, styles, etc.
}

export interface SkillTreeEdge {
  id: string;
  source: string;
  target: string;
  type: 'default' | 'animated';
}

export interface UserSkillTree {
  id: string;
  userId: string;
  title?: string;
  nodes: SkillTreeNode[];
  edges: SkillTreeEdge[];
  createdAt: string;
  updatedAt: string;
}

// ==================== Admin & Reporting ====================

export type ReportTargetType = 'video' | 'comment' | 'user' | 'drill' | 'routine';
export type ReportStatus = 'pending' | 'resolved' | 'dismissed';

export interface Report {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  targetContent?: string; // Preview of the reported content
  reporterId: string;
  reporterName?: string;
  reason: string;
  status: ReportStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

// ==================== Tournament Management ====================

export type TournamentStatus = 'upcoming' | 'registration_open' | 'in_progress' | 'completed' | 'cancelled';
export type TournamentFormat = 'single_elimination' | 'double_elimination' | 'round_robin';

export interface Tournament {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  format: TournamentFormat;
  status: TournamentStatus;
  maxParticipants: number;
  currentParticipants: number;
  imageUrl?: string;
  registrationFee: number;
  prizePool?: string;
  createdAt: string;
}

// ==================== Support System ====================

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketCategory = 'general' | 'account' | 'payment' | 'technical' | 'report';

export interface SupportTicket {
  id: string;
  userId?: string; // Optional for guests
  userName?: string;
  userEmail?: string;
  subject: string;
  message: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  adminResponse?: string;
  respondedAt?: string;
  respondedBy?: string;
}
export interface SparringReview {
  id: string;
  userId: string;
  date: string;
  opponentName: string;
  opponentBelt: string;
  rounds: number;
  result: 'win' | 'loss' | 'draw';
  notes: string;
  techniques: string[];
  whatWorked: string;
  whatToImprove: string;
  videoUrl?: string;
  createdAt: string;
}

// ==================== Testimonials ====================

export interface Testimonial {
  id: string;
  name: string;
  belt: string;
  comment: string;
  rating: number;
  createdAt: string;
}


