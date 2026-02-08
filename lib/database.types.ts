export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          sender_id: string | null
          target_audience: string
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          sender_id?: string | null
          target_audience?: string
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          sender_id?: string | null
          target_audience?: string
          title?: string
        }
        Relationships: []
      }
      bundle_courses: {
        Row: {
          bundle_id: string | null
          course_id: string | null
          created_at: string | null
          id: string
        }
        Insert: {
          bundle_id?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string
        }
        Update: {
          bundle_id?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundle_courses_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      bundle_drills: {
        Row: {
          bundle_id: string | null
          created_at: string | null
          drill_id: string | null
          id: string
        }
        Insert: {
          bundle_id?: string | null
          created_at?: string | null
          drill_id?: string | null
          id?: string
        }
        Update: {
          bundle_id?: string | null
          created_at?: string | null
          drill_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundle_drills_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_drills_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
        ]
      }
      bundle_sparring: {
        Row: {
          bundle_id: string
          created_at: string | null
          id: string
          sparring_id: string
        }
        Insert: {
          bundle_id: string
          created_at?: string | null
          id?: string
          sparring_id: string
        }
        Update: {
          bundle_id?: string
          created_at?: string | null
          id?: string
          sparring_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundle_sparring_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_sparring_sparring_id_fkey"
            columns: ["sparring_id"]
            isOneToOne: false
            referencedRelation: "sparring_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      bundles: {
        Row: {
          created_at: string | null
          creator_id: string | null
          description: string | null
          id: string
          price: number
          thumbnail_url: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          id?: string
          price?: number
          thumbnail_url?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          id?: string
          price?: number
          thumbnail_url?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundles_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chain_usage: {
        Row: {
          chain_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          chain_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          chain_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chain_usage_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "user_skill_trees"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          creator_id: string | null
          discount_type: string | null
          expires_at: string | null
          id: string
          max_uses: number | null
          used_count: number | null
          value: number
        }
        Insert: {
          code: string
          created_at?: string | null
          creator_id?: string | null
          discount_type?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          used_count?: number | null
          value: number
        }
        Update: {
          code?: string
          created_at?: string | null
          creator_id?: string | null
          discount_type?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          used_count?: number | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      course_drill_bundles: {
        Row: {
          course_id: string | null
          created_at: string | null
          drill_id: string | null
          id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          drill_id?: string | null
          id?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          drill_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_drill_bundles_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_drill_bundles_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
        ]
      }
      course_routine_bundles: {
        Row: {
          course_id: string | null
          created_at: string | null
          id: string
          routine_id: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          routine_id?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          routine_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_routine_bundles_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_routine_bundles_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          created_at: string | null
          creator_id: string | null
          description: string | null
          difficulty: string | null
          id: string
          is_subscription_excluded: boolean | null
          preview_vimeo_id: string | null
          price: number | null
          published: boolean | null
          status: string
          thumbnail_url: string | null
          title: string
          uniform_type: string | null
          views: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          is_subscription_excluded?: boolean | null
          preview_vimeo_id?: string | null
          price?: number | null
          published?: boolean | null
          status?: string
          thumbnail_url?: string | null
          title: string
          uniform_type?: string | null
          views?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          is_subscription_excluded?: boolean | null
          preview_vimeo_id?: string | null
          price?: number | null
          published?: boolean | null
          status?: string
          thumbnail_url?: string | null
          title?: string
          uniform_type?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_applications: {
        Row: {
          bio: string | null
          created_at: string | null
          id: string
          name: string
          profile_image: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          id?: string
          name: string
          profile_image?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          id?: string
          name?: string
          profile_image?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_follows: {
        Row: {
          created_at: string | null
          creator_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          follower_id: string
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          follower_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_follows_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_payouts: {
        Row: {
          amount: number | null
          created_at: string | null
          creator_id: string | null
          id: string
          payout_period_end: string | null
          payout_period_start: string | null
          processed_at: string | null
          status: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          creator_id?: string | null
          id?: string
          payout_period_end?: string | null
          payout_period_start?: string | null
          processed_at?: string | null
          status?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          creator_id?: string | null
          id?: string
          payout_period_end?: string | null
          payout_period_start?: string | null
          processed_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_payouts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creators: {
        Row: {
          approved: boolean | null
          bio: string | null
          created_at: string | null
          direct_share: number | null
          id: string
          name: string
          payout_settings: Json | null
          profile_image: string | null
          stripe_account_id: string | null
          subscriber_count: number | null
          subscription_share: number | null
        }
        Insert: {
          approved?: boolean | null
          bio?: string | null
          created_at?: string | null
          direct_share?: number | null
          id?: string
          name: string
          payout_settings?: Json | null
          profile_image?: string | null
          stripe_account_id?: string | null
          subscriber_count?: number | null
          subscription_share?: number | null
        }
        Update: {
          approved?: boolean | null
          bio?: string | null
          created_at?: string | null
          direct_share?: number | null
          id?: string
          name?: string
          payout_settings?: Json | null
          profile_image?: string | null
          stripe_account_id?: string | null
          subscriber_count?: number | null
          subscription_share?: number | null
        }
        Relationships: []
      }
      daily_featured_content: {
        Row: {
          created_at: string | null
          date: string
          featured_id: string
          featured_type: string
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          featured_id: string
          featured_type: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          featured_id?: string
          featured_type?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      daily_quests: {
        Row: {
          completed: boolean | null
          created_at: string | null
          current_count: number | null
          id: string
          quest_date: string | null
          quest_type: string
          target_count: number
          user_id: string | null
          xp_reward: number
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          current_count?: number | null
          id?: string
          quest_date?: string | null
          quest_type: string
          target_count: number
          user_id?: string | null
          xp_reward: number
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          current_count?: number | null
          id?: string
          quest_date?: string | null
          quest_type?: string
          target_count?: number
          user_id?: string | null
          xp_reward?: number
        }
        Relationships: []
      }
      drills: {
        Row: {
          category: string | null
          created_at: string | null
          creator_id: string
          description: string | null
          description_video_url: string | null
          difficulty: string | null
          duration_minutes: number | null
          id: string
          likes: number | null
          status: string
          thumbnail_url: string | null
          title: string
          uniform_type: string | null
          updated_at: string | null
          views: number | null
          vimeo_url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          creator_id: string
          description?: string | null
          description_video_url?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
          id?: string
          likes?: number | null
          status?: string
          thumbnail_url?: string | null
          title: string
          uniform_type?: string | null
          updated_at?: string | null
          views?: number | null
          vimeo_url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          creator_id?: string
          description?: string | null
          description_video_url?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
          id?: string
          likes?: number | null
          status?: string
          thumbnail_url?: string | null
          title?: string
          uniform_type?: string | null
          updated_at?: string | null
          views?: number | null
          vimeo_url?: string | null
        }
        Relationships: []
      }
      feedback_payments: {
        Row: {
          amount: number
          id: string
          instructor_id: string | null
          instructor_revenue: number
          paid_at: string | null
          platform_fee: number | null
          request_id: string | null
          student_id: string | null
        }
        Insert: {
          amount: number
          id?: string
          instructor_id?: string | null
          instructor_revenue: number
          paid_at?: string | null
          platform_fee?: number | null
          request_id?: string | null
          student_id?: string | null
        }
        Update: {
          amount?: number
          id?: string
          instructor_id?: string | null
          instructor_revenue?: number
          paid_at?: string | null
          platform_fee?: number | null
          request_id?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "feedback_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_requests: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string | null
          feedback_content: string | null
          id: string
          instructor_id: string
          paid_at: string | null
          payment_status: string | null
          price: number
          status: string | null
          student_id: string
          updated_at: string | null
          video_url: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          feedback_content?: string | null
          id?: string
          instructor_id: string
          paid_at?: string | null
          payment_status?: string | null
          price: number
          status?: string | null
          student_id: string
          updated_at?: string | null
          video_url: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          feedback_content?: string | null
          id?: string
          instructor_id?: string
          paid_at?: string | null
          payment_status?: string | null
          price?: number
          status?: string | null
          student_id?: string
          updated_at?: string | null
          video_url?: string
        }
        Relationships: []
      }
      feedback_responses: {
        Row: {
          content: string
          created_at: string | null
          id: string
          request_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          request_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_responses_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "feedback_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_settings: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          instructor_id: string
          max_active_requests: number | null
          price: number | null
          turnaround_days: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          instructor_id: string
          max_active_requests?: number | null
          price?: number | null
          turnaround_days?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          instructor_id?: string
          max_active_requests?: number | null
          price?: number | null
          turnaround_days?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          completed: boolean | null
          created_at: string | null
          id: string
          last_watched_at: string | null
          lesson_id: string
          updated_at: string | null
          user_id: string
          watched_seconds: number | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          last_watched_at?: string | null
          lesson_id: string
          updated_at?: string | null
          user_id: string
          watched_seconds?: number | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          last_watched_at?: string | null
          lesson_id?: string
          updated_at?: string | null
          user_id?: string
          watched_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          category: string | null
          course_id: string | null
          created_at: string | null
          creator_id: string | null
          description: string | null
          difficulty: string | null
          duration: number | null
          duration_minutes: number | null
          id: string
          is_preview: boolean | null
          length: string | null
          lesson_number: number | null
          likes: number | null
          order_index: number | null
          thumbnail_url: string | null
          title: string
          uniform_type: string | null
          video_url: string | null
          views: number | null
          vimeo_url: string | null
        }
        Insert: {
          category?: string | null
          course_id?: string | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          difficulty?: string | null
          duration?: number | null
          duration_minutes?: number | null
          id?: string
          is_preview?: boolean | null
          length?: string | null
          lesson_number?: number | null
          likes?: number | null
          order_index?: number | null
          thumbnail_url?: string | null
          title: string
          uniform_type?: string | null
          video_url?: string | null
          views?: number | null
          vimeo_url?: string | null
        }
        Update: {
          category?: string | null
          course_id?: string | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          difficulty?: string | null
          duration?: number | null
          duration_minutes?: number | null
          id?: string
          is_preview?: boolean | null
          length?: string | null
          lesson_number?: number | null
          likes?: number | null
          order_index?: number | null
          thumbnail_url?: string | null
          title?: string
          uniform_type?: string | null
          video_url?: string | null
          views?: number | null
          vimeo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      match_history: {
        Row: {
          created_at: string | null
          id: string
          opponent_level: number
          opponent_name: string
          points_opponent: number | null
          points_user: number | null
          result: string
          submission_type: string | null
          user_id: string
          user_level: number
          win_type: string | null
          xp_earned: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          opponent_level: number
          opponent_name: string
          points_opponent?: number | null
          points_user?: number | null
          result: string
          submission_type?: string | null
          user_id: string
          user_level: number
          win_type?: string | null
          xp_earned?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          opponent_level?: number
          opponent_name?: string
          points_opponent?: number | null
          points_user?: number | null
          result?: string
          submission_type?: string | null
          user_id?: string
          user_level?: number
          win_type?: string | null
          xp_earned?: number | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number | null
          created_at: string | null
          currency: string | null
          id: string
          mode: string | null
          payment_method: string | null
          paypal_order_id: string | null
          paypal_subscription_id: string | null
          portone_payment_id: string | null
          status: string | null
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
          target_id: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          mode?: string | null
          payment_method?: string | null
          paypal_order_id?: string | null
          paypal_subscription_id?: string | null
          portone_payment_id?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          target_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          mode?: string | null
          payment_method?: string | null
          paypal_order_id?: string | null
          paypal_subscription_id?: string | null
          portone_payment_id?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          target_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          account_holder: string | null
          account_number: string | null
          admin_note: string | null
          amount: number
          bank_name: string | null
          creator_id: string
          id: string
          processed_at: string | null
          requested_at: string | null
          status: string
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          admin_note?: string | null
          amount: number
          bank_name?: string | null
          creator_id: string
          id?: string
          processed_at?: string | null
          requested_at?: string | null
          status?: string
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          admin_note?: string | null
          amount?: number
          bank_name?: string | null
          creator_id?: string
          id?: string
          processed_at?: string | null
          requested_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          post_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "training_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          reason: string
          reporter_id: string | null
          status: string | null
          target_id: string
          target_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          reason: string
          reporter_id?: string | null
          status?: string | null
          target_id: string
          target_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string | null
          status?: string | null
          target_id?: string
          target_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      revenue_ledger: {
        Row: {
          amount: number | null
          created_at: string | null
          creator_id: string | null
          creator_revenue: number | null
          id: string
          payout_request_id: string | null
          platform_fee: number | null
          product_id: string | null
          product_type: string | null
          recognition_date: string | null
          status: string | null
          subscription_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          creator_id?: string | null
          creator_revenue?: number | null
          id?: string
          payout_request_id?: string | null
          platform_fee?: number | null
          product_id?: string | null
          product_type?: string | null
          recognition_date?: string | null
          status?: string | null
          subscription_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          creator_id?: string | null
          creator_revenue?: number | null
          id?: string
          payout_request_id?: string | null
          platform_fee?: number | null
          product_id?: string | null
          product_type?: string | null
          recognition_date?: string | null
          status?: string | null
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revenue_ledger_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_ledger_payout_request_id_fkey"
            columns: ["payout_request_id"]
            isOneToOne: false
            referencedRelation: "payout_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_ledger_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_drills: {
        Row: {
          drill_id: string | null
          id: string
          order_index: number
          routine_id: string | null
        }
        Insert: {
          drill_id?: string | null
          id?: string
          order_index: number
          routine_id?: string | null
        }
        Update: {
          drill_id?: string | null
          id?: string
          order_index?: number
          routine_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routine_drills_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_drills_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          category: string | null
          created_at: string | null
          creator_id: string
          description: string | null
          difficulty: string | null
          drill_count: number | null
          id: string
          price: number
          related_items: Json | null
          thumbnail_url: string | null
          title: string
          total_duration_minutes: number | null
          uniform_type: string | null
          updated_at: string | null
          views: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          creator_id: string
          description?: string | null
          difficulty?: string | null
          drill_count?: number | null
          id?: string
          price: number
          related_items?: Json | null
          thumbnail_url?: string | null
          title: string
          total_duration_minutes?: number | null
          uniform_type?: string | null
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          creator_id?: string
          description?: string | null
          difficulty?: string | null
          drill_count?: number | null
          id?: string
          price?: number
          related_items?: Json | null
          thumbnail_url?: string | null
          title?: string
          total_duration_minutes?: number | null
          uniform_type?: string | null
          updated_at?: string | null
          views?: number | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          footer: Json | null
          hero: Json | null
          id: string
          logos: Json | null
          updated_at: string
        }
        Insert: {
          footer?: Json | null
          hero?: Json | null
          id?: string
          logos?: Json | null
          updated_at?: string
        }
        Update: {
          footer?: Json | null
          hero?: Json | null
          id?: string
          logos?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      skill_subcategories: {
        Row: {
          category: string
          created_at: string | null
          display_order: number | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      sparring_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sparring_comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "sparring_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      sparring_reviews: {
        Row: {
          created_at: string | null
          date: string
          id: string
          notes: string | null
          opponent_belt: string
          opponent_name: string
          result: string | null
          rounds: number | null
          techniques: string[] | null
          user_id: string
          video_url: string | null
          what_to_improve: string | null
          what_worked: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          notes?: string | null
          opponent_belt: string
          opponent_name: string
          result?: string | null
          rounds?: number | null
          techniques?: string[] | null
          user_id: string
          video_url?: string | null
          what_to_improve?: string | null
          what_worked?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          opponent_belt?: string
          opponent_name?: string
          result?: string | null
          rounds?: number | null
          techniques?: string[] | null
          user_id?: string
          video_url?: string | null
          what_to_improve?: string | null
          what_worked?: string | null
        }
        Relationships: []
      }
      sparring_videos: {
        Row: {
          category: string | null
          created_at: string
          creator_id: string
          deleted_at: string | null
          description: string | null
          difficulty: string | null
          id: string
          is_published: boolean | null
          likes: number | null
          preview_vimeo_id: string | null
          price: number | null
          related_items: Json | null
          status: string
          thumbnail_url: string | null
          title: string
          uniform_type: string | null
          video_url: string | null
          views: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          creator_id: string
          deleted_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          is_published?: boolean | null
          likes?: number | null
          preview_vimeo_id?: string | null
          price?: number | null
          related_items?: Json | null
          status?: string
          thumbnail_url?: string | null
          title: string
          uniform_type?: string | null
          video_url?: string | null
          views?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          creator_id?: string
          deleted_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          is_published?: boolean | null
          likes?: number | null
          preview_vimeo_id?: string | null
          price?: number | null
          related_items?: Json | null
          status?: string
          thumbnail_url?: string | null
          title?: string
          uniform_type?: string | null
          video_url?: string | null
          views?: number | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          paypal_order_id: string | null
          paypal_subscription_id: string | null
          plan_interval: string | null
          portone_payment_id: string | null
          status: string | null
          stripe_subscription_id: string | null
          subscription_tier: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          paypal_order_id?: string | null
          paypal_subscription_id?: string | null
          plan_interval?: string | null
          portone_payment_id?: string | null
          status?: string | null
          stripe_subscription_id?: string | null
          subscription_tier?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          paypal_order_id?: string | null
          paypal_subscription_id?: string | null
          plan_interval?: string | null
          portone_payment_id?: string | null
          status?: string | null
          stripe_subscription_id?: string | null
          subscription_tier?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_response: string | null
          category: string | null
          created_at: string | null
          id: string
          message: string
          priority: string | null
          responded_at: string | null
          responded_by: string | null
          status: string | null
          subject: string
          updated_at: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          admin_response?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          message: string
          priority?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          admin_response?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          message?: string
          priority?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          level: string | null
          message: string | null
          process_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          level?: string | null
          message?: string | null
          process_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          level?: string | null
          message?: string | null
          process_id?: string | null
        }
        Relationships: []
      }
      technique_course_links: {
        Row: {
          course_id: string | null
          created_at: string | null
          id: string
          technique_id: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          technique_id?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          technique_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technique_course_links_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technique_course_links_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      technique_drill_links: {
        Row: {
          created_at: string | null
          drill_id: string | null
          id: string
          technique_id: string | null
        }
        Insert: {
          created_at?: string | null
          drill_id?: string | null
          id?: string
          technique_id?: string | null
        }
        Update: {
          created_at?: string | null
          drill_id?: string | null
          id?: string
          technique_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technique_drill_links_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technique_drill_links_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      technique_routine_links: {
        Row: {
          created_at: string | null
          id: string
          routine_id: string | null
          technique_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          routine_id?: string | null
          technique_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          routine_id?: string | null
          technique_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technique_routine_links_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technique_routine_links_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      technique_xp_transactions: {
        Row: {
          created_at: string | null
          id: string
          new_level: number | null
          new_xp: number | null
          old_level: number | null
          old_xp: number | null
          source_id: string | null
          source_type: string
          technique_id: string
          user_id: string
          xp_amount: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          new_level?: number | null
          new_xp?: number | null
          old_level?: number | null
          old_xp?: number | null
          source_id?: string | null
          source_type: string
          technique_id: string
          user_id: string
          xp_amount: number
        }
        Update: {
          created_at?: string | null
          id?: string
          new_level?: number | null
          new_xp?: number | null
          old_level?: number | null
          old_xp?: number | null
          source_id?: string | null
          source_type?: string
          technique_id?: string
          user_id?: string
          xp_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "technique_xp_transactions_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      techniques: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          difficulty: string | null
          id: string
          impact_guard: number | null
          impact_pass: number | null
          impact_standing: number | null
          impact_submission: number | null
          name: string
          name_en: string | null
          recommended_course_ids: string[] | null
          recommended_drill_ids: string[] | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          impact_guard?: number | null
          impact_pass?: number | null
          impact_standing?: number | null
          impact_submission?: number | null
          name: string
          name_en?: string | null
          recommended_course_ids?: string[] | null
          recommended_drill_ids?: string[] | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          impact_guard?: number | null
          impact_pass?: number | null
          impact_standing?: number | null
          impact_submission?: number | null
          name?: string
          name_en?: string | null
          recommended_course_ids?: string[] | null
          recommended_drill_ids?: string[] | null
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          belt: string
          comment: string
          created_at: string
          id: string
          name: string
          profile_image: string | null
          rating: number | null
        }
        Insert: {
          belt: string
          comment: string
          created_at?: string
          id?: string
          name: string
          profile_image?: string | null
          rating?: number | null
        }
        Update: {
          belt?: string
          comment?: string
          created_at?: string
          id?: string
          name?: string
          profile_image?: string | null
          rating?: number | null
        }
        Relationships: []
      }
      titles: {
        Row: {
          created_at: string | null
          criteria_type: string
          criteria_value: number
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          criteria_type: string
          criteria_value: number
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          criteria_type?: string
          criteria_value?: number
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      training_log_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          log_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          log_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          log_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_log_comments_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "training_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      training_log_likes: {
        Row: {
          created_at: string | null
          id: string
          log_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          log_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          log_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_log_likes_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "training_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      training_logs: {
        Row: {
          created_at: string | null
          date: string
          duration: number | null
          duration_minutes: number | null
          id: string
          intensity: number | null
          is_public: boolean | null
          location: string | null
          metadata: Json | null
          notes: string | null
          sparring_rounds: number | null
          techniques: string[] | null
          type: string | null
          user_id: string | null
          youtube_url: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          duration?: number | null
          duration_minutes?: number | null
          id?: string
          intensity?: number | null
          is_public?: boolean | null
          location?: string | null
          metadata?: Json | null
          notes?: string | null
          sparring_rounds?: number | null
          techniques?: string[] | null
          type?: string | null
          user_id?: string | null
          youtube_url?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          duration?: number | null
          duration_minutes?: number | null
          id?: string
          intensity?: number | null
          is_public?: boolean | null
          location?: string | null
          metadata?: Json | null
          notes?: string | null
          sparring_rounds?: number | null
          techniques?: string[] | null
          type?: string | null
          user_id?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_arena_stats: {
        Row: {
          back_power: number | null
          guard_pass_power: number | null
          guard_power: number | null
          mount_power: number | null
          side_power: number | null
          standing_power: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          back_power?: number | null
          guard_pass_power?: number | null
          guard_power?: number | null
          mount_power?: number | null
          side_power?: number | null
          standing_power?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          back_power?: number | null
          guard_pass_power?: number | null
          guard_power?: number | null
          mount_power?: number | null
          side_power?: number | null
          standing_power?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_challenge_progress: {
        Row: {
          challenge_id: string
          completed: boolean | null
          completed_at: string | null
          current_value: number | null
          id: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed?: boolean | null
          completed_at?: string | null
          current_value?: number | null
          id?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed?: boolean | null
          completed_at?: string | null
          current_value?: number | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "weekly_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_course_completions: {
        Row: {
          completed_at: string | null
          course_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_course_completions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_courses: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          price_paid: number | null
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          price_paid?: number | null
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          price_paid?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_drill_likes: {
        Row: {
          created_at: string | null
          drill_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          drill_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          drill_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_drill_purchases: {
        Row: {
          course_id: string | null
          drill_id: string
          id: string
          purchased_at: string | null
          source: string | null
          user_id: string
        }
        Insert: {
          course_id?: string | null
          drill_id: string
          id?: string
          purchased_at?: string | null
          source?: string | null
          user_id: string
        }
        Update: {
          course_id?: string | null
          drill_id?: string
          id?: string
          purchased_at?: string | null
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_drill_purchases_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_drill_purchases_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
        ]
      }
      user_drill_views: {
        Row: {
          created_at: string
          drill_id: string
          id: string
          last_watched_at: string
          user_id: string
          view_count: number | null
        }
        Insert: {
          created_at?: string
          drill_id: string
          id?: string
          last_watched_at?: string
          user_id: string
          view_count?: number | null
        }
        Update: {
          created_at?: string
          drill_id?: string
          id?: string
          last_watched_at?: string
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_drill_views_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
        ]
      }
      user_drills: {
        Row: {
          drill_id: string
          price_paid: number
          purchased_at: string | null
          user_id: string
        }
        Insert: {
          drill_id: string
          price_paid?: number
          purchased_at?: string | null
          user_id: string
        }
        Update: {
          drill_id?: string
          price_paid?: number
          purchased_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_drills_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interactions: {
        Row: {
          content_id: string
          content_type: string
          created_at: string | null
          id: string
          interaction_type: string
          last_interacted_at: string | null
          user_id: string
          view_count: number | null
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string | null
          id?: string
          interaction_type: string
          last_interacted_at?: string | null
          user_id: string
          view_count?: number | null
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string | null
          id?: string
          interaction_type?: string
          last_interacted_at?: string | null
          user_id?: string
          view_count?: number | null
        }
        Relationships: []
      }
      user_login_streak: {
        Row: {
          current_streak: number | null
          last_login_date: string | null
          longest_streak: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          current_streak?: number | null
          last_login_date?: string | null
          longest_streak?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          current_streak?: number | null
          last_login_date?: string | null
          longest_streak?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          belt_level: number | null
          created_at: string | null
          current_xp: number | null
          last_quest_reset: string | null
          total_xp: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          belt_level?: number | null
          created_at?: string | null
          current_xp?: number | null
          last_quest_reset?: string | null
          total_xp?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          belt_level?: number | null
          created_at?: string | null
          current_xp?: number | null
          last_quest_reset?: string | null
          total_xp?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_routine_purchases: {
        Row: {
          course_id: string | null
          id: string
          purchased_at: string | null
          routine_id: string
          source: string | null
          user_id: string
        }
        Insert: {
          course_id?: string | null
          id?: string
          purchased_at?: string | null
          routine_id: string
          source?: string | null
          user_id: string
        }
        Update: {
          course_id?: string | null
          id?: string
          purchased_at?: string | null
          routine_id?: string
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_routine_purchases_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_routine_purchases_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      user_routines: {
        Row: {
          price_paid: number
          purchased_at: string | null
          routine_id: string
          user_id: string
        }
        Insert: {
          price_paid?: number
          purchased_at?: string | null
          routine_id: string
          user_id: string
        }
        Update: {
          price_paid?: number
          purchased_at?: string | null
          routine_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_routines_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      user_saved_courses: {
        Row: {
          course_id: string | null
          created_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_saved_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_saved_drills: {
        Row: {
          created_at: string | null
          drill_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          drill_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          drill_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_saved_lessons: {
        Row: {
          created_at: string | null
          id: string
          lesson_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_saved_lessons_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_saved_routines: {
        Row: {
          created_at: string | null
          id: string
          routine_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          routine_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          routine_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_saved_routines_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      user_saved_sparring: {
        Row: {
          created_at: string | null
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      user_skill_trees: {
        Row: {
          created_at: string | null
          description: string | null
          difficulty: string | null
          id: string
          is_featured: boolean | null
          is_public: boolean | null
          like_count: number | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string | null
          tree_data: Json
          updated_at: string | null
          usage_count: number | null
          user_id: string
          view_count: number | null
          views: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          like_count?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string | null
          tree_data?: Json
          updated_at?: string | null
          usage_count?: number | null
          user_id: string
          view_count?: number | null
          views?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          like_count?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string | null
          tree_data?: Json
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string
          view_count?: number | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_skill_trees_user_id_fkey_public_users"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_skills: {
        Row: {
          category: string
          course_id: string
          created_at: string | null
          id: string
          status: string
          subcategory_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: string
          course_id: string
          created_at?: string | null
          id?: string
          status?: string
          subcategory_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string
          course_id?: string
          created_at?: string | null
          id?: string
          status?: string
          subcategory_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_skills_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_skills_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "skill_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sparring_likes: {
        Row: {
          created_at: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sparring_likes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "sparring_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sparring_views: {
        Row: {
          created_at: string
          id: string
          last_watched_at: string
          user_id: string
          video_id: string
          view_count: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_watched_at?: string
          user_id: string
          video_id: string
          view_count?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          last_watched_at?: string
          user_id?: string
          video_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_sparring_views_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "sparring_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stats: {
        Row: {
          log_count: number | null
          total_points: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          log_count?: number | null
          total_points?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          log_count?: number | null
          total_points?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_technique_goals: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          target_level: number | null
          target_month: string
          technique_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          target_level?: number | null
          target_month: string
          technique_id: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          target_level?: number | null
          target_month?: string
          technique_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_technique_goals_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      user_technique_mastery: {
        Row: {
          created_at: string | null
          id: string
          last_practice_date: string | null
          last_success_date: string | null
          mastery_level: number | null
          mastery_xp: number | null
          progress_percent: number | null
          technique_id: string
          total_attempt_count: number | null
          total_success_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_practice_date?: string | null
          last_success_date?: string | null
          mastery_level?: number | null
          mastery_xp?: number | null
          progress_percent?: number | null
          technique_id: string
          total_attempt_count?: number | null
          total_success_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_practice_date?: string | null
          last_success_date?: string | null
          mastery_level?: number | null
          mastery_xp?: number | null
          progress_percent?: number | null
          technique_id?: string
          total_attempt_count?: number | null
          total_success_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_technique_mastery_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      user_titles: {
        Row: {
          earned_at: string | null
          id: string
          title_id: string
          user_id: string
        }
        Insert: {
          earned_at?: string | null
          id?: string
          title_id: string
          user_id: string
        }
        Update: {
          earned_at?: string | null
          id?: string
          title_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_titles_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_training_streak: {
        Row: {
          current_streak: number | null
          last_training_date: string | null
          longest_streak: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          current_streak?: number | null
          last_training_date?: string | null
          longest_streak?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          current_streak?: number | null
          last_training_date?: string | null
          longest_streak?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_videos: {
        Row: {
          purchased_at: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          purchased_at?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          purchased_at?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_videos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_videos_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          is_admin: boolean | null
          is_complimentary_subscription: boolean | null
          is_subscriber: boolean | null
          name: string | null
          paypal_subscription_id: string | null
          portone_subscription_id: string | null
          profile_image_url: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_end_date: string | null
          subscription_tier: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id: string
          is_admin?: boolean | null
          is_complimentary_subscription?: boolean | null
          is_subscriber?: boolean | null
          name?: string | null
          paypal_subscription_id?: string | null
          portone_subscription_id?: string | null
          profile_image_url?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_admin?: boolean | null
          is_complimentary_subscription?: boolean | null
          is_subscriber?: boolean | null
          name?: string | null
          paypal_subscription_id?: string | null
          portone_subscription_id?: string | null
          profile_image_url?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      video_view_logs: {
        Row: {
          id: string
          user_id: string | null
          video_id: string
          viewed_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          video_id: string
          viewed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          video_id?: string
          viewed_at?: string | null
        }
        Relationships: []
      }
      video_watch_logs: {
        Row: {
          date: string | null
          drill_id: string | null
          id: string
          lesson_id: string | null
          updated_at: string | null
          user_id: string
          video_id: string | null
          watch_seconds: number | null
        }
        Insert: {
          date?: string | null
          drill_id?: string | null
          id?: string
          lesson_id?: string | null
          updated_at?: string | null
          user_id: string
          video_id?: string | null
          watch_seconds?: number | null
        }
        Update: {
          date?: string | null
          drill_id?: string | null
          id?: string
          lesson_id?: string | null
          updated_at?: string | null
          user_id?: string
          video_id?: string | null
          watch_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "video_watch_logs_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_watch_logs_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_watch_logs_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          category: string
          created_at: string | null
          creator_id: string | null
          description: string | null
          difficulty: string
          id: string
          length: string | null
          price: number | null
          thumbnail_url: string | null
          title: string
          views: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          difficulty: string
          id?: string
          length?: string | null
          price?: number | null
          thumbnail_url?: string | null
          title: string
          views?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          difficulty?: string
          id?: string
          length?: string | null
          price?: number | null
          thumbnail_url?: string | null
          title?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_challenges: {
        Row: {
          challenge_type: string
          created_at: string | null
          description: string | null
          id: string
          reward_xp: number
          target_value: number
          week_start: string
        }
        Insert: {
          challenge_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          reward_xp: number
          target_value: number
          week_start: string
        }
        Update: {
          challenge_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          reward_xp?: number
          target_value?: number
          week_start?: string
        }
        Relationships: []
      }
      weekly_routine_plans: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          schedule: Json
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          user_id: string
          view_count: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          schedule: Json
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          view_count?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          schedule?: Json
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          view_count?: number | null
        }
        Relationships: []
      }
      xp_activities: {
        Row: {
          activity_type: string
          created_at: string | null
          id: string
          user_id: string
          xp_earned: number
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          id?: string
          user_id: string
          xp_earned: number
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          id?: string
          user_id?: string
          xp_earned?: number
        }
        Relationships: []
      }
      xp_transactions: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          source: string
          source_id: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          source: string
          source_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          source?: string
          source_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      creator_monthly_settlements: {
        Row: {
          creator_email: string | null
          creator_id: string | null
          creator_name: string | null
          payout_settings: Json | null
          platform_fee: number | null
          settlement_amount: number | null
          settlement_month: string | null
          total_revenue: number | null
          total_sales_count: number | null
        }
        Relationships: []
      }
      daily_sales_stats: {
        Row: {
          sale_date: string | null
          sales_count: number | null
          total_amount: number | null
        }
        Relationships: []
      }
      daily_user_growth: {
        Row: {
          signup_date: string | null
          user_count: number | null
        }
        Relationships: []
      }
      drill_like_counts: {
        Row: {
          drill_id: string | null
          like_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_xp: {
        Args: {
          p_amount: number
          p_source: string
          p_source_id?: string
          p_user_id: string
        }
        Returns: undefined
      }
      award_daily_login_xp: {
        Args: { p_user_id: string }
        Returns: {
          bonus_awarded: boolean
          streak: number
          xp_earned: number
        }[]
      }
      award_social_xp: {
        Args: {
          p_activity_type: string
          p_user_id: string
          p_xp_amount: number
        }
        Returns: number
      }
      award_technique_xp: {
        Args: {
          p_is_success?: boolean
          p_source_id?: string
          p_source_type: string
          p_technique_id: string
          p_user_id: string
          p_xp_amount: number
        }
        Returns: {
          combat_stats_updated: Json
          leveled_up: boolean
          new_level: number
          new_xp: number
          old_level: number
        }[]
      }
      award_training_xp: {
        Args: { p_activity_type: string; p_base_xp: number; p_user_id: string }
        Returns: {
          already_completed_today: boolean
          bonus_xp: number
          streak: number
          xp_earned: number
        }[]
      }
      calculate_mastery_level: { Args: { xp: number }; Returns: number }
      calculate_mastery_progress: {
        Args: { level: number; xp: number }
        Returns: number
      }
      calculate_monthly_subscription_distribution: {
        Args: { target_month: string }
        Returns: undefined
      }
      check_and_award_titles: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string | null
          criteria_type: string
          criteria_value: number
          description: string | null
          icon: string | null
          id: string
          name: string
        }[]
        SetofOptions: {
          from: "*"
          to: "titles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      check_and_grant_course_completion: {
        Args: { p_course_id: string; p_user_id: string }
        Returns: Json
      }
      check_is_admin: { Args: never; Returns: boolean }
      create_notification: {
        Args: {
          p_link?: string
          p_message: string
          p_title: string
          p_type?: string
          p_user_id: string
        }
        Returns: string
      }
      ensure_user_for_post: {
        Args: { p_avatar_url: string; p_name: string; p_user_id: string }
        Returns: undefined
      }
      generate_daily_quests: { Args: { p_user_id: string }; Returns: undefined }
      get_admin_creators_with_email: {
        Args: never
        Returns: {
          approved: boolean
          bio: string
          created_at: string
          email: string
          id: string
          name: string
          profile_image: string
          subscriber_count: number
        }[]
      }
      get_admin_dashboard_stats: { Args: never; Returns: Json }
      get_all_users_admin: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          is_admin: boolean
          is_complimentary_subscription: boolean
          is_creator: boolean
          is_subscriber: boolean
          name: string
          subscription_end_date: string
          subscription_tier: string
        }[]
      }
      get_creator_balance: { Args: { p_creator_id: string }; Returns: number }
      get_daily_free_lesson_id: { Args: never; Returns: string }
      get_lesson_content: {
        Args: { p_lesson_id: string }
        Returns: {
          description: string
          id: string
          is_preview: boolean
          title: string
          vimeo_url: string
        }[]
      }
      get_lesson_content_v2: {
        Args: { p_lesson_id: string }
        Returns: {
          course_id: string
          created_at: string
          description: string
          duration_minutes: number
          id: string
          is_preview: boolean
          is_preview_available: boolean
          is_subscription_excluded: boolean
          lesson_number: number
          thumbnail_url: string
          title: string
          vimeo_url: string
        }[]
      }
      get_technique_xp_for_level: { Args: { level: number }; Returns: number }
      get_user_streak: { Args: { p_user_id: string }; Returns: number }
      get_user_technique_summary: {
        Args: { p_user_id: string }
        Returns: {
          avg_mastery_level: number
          category: string
          mastered_techniques: number
          total_techniques: number
          total_xp: number
        }[]
      }
      get_user_training_streak: {
        Args: { p_user_id: string }
        Returns: {
          current_streak: number
          last_training_date: string
          longest_streak: number
        }[]
      }
      get_xp_for_level: { Args: { level: number }; Returns: number }
      grant_complimentary_subscription: {
        Args: { end_date: string; target_user_id: string }
        Returns: undefined
      }
      increment_course_views: {
        Args: { course_id: string }
        Returns: undefined
      }
      increment_drill_views: {
        Args: { p_drill_id: string }
        Returns: undefined
      }
      increment_lesson_views: {
        Args: { lesson_id: string }
        Returns: undefined
      }
      increment_routine_views: {
        Args: { p_routine_id: string }
        Returns: undefined
      }
      increment_skill_tree_views: {
        Args: { tree_id: string }
        Returns: undefined
      }
      increment_sparring_view: { Args: { p_id: string }; Returns: undefined }
      increment_sparring_views: {
        Args: { p_video_id: string }
        Returns: undefined
      }
      increment_video_views:
      | {
        Args: { p_user_id?: string; p_video_id: string }
        Returns: undefined
      }
      | { Args: { video_id: string }; Returns: undefined }
      initialize_user_skill_tree: {
        Args: { p_user_id: string }
        Returns: string
      }
      notify_all_admins: {
        Args: {
          p_link: string
          p_message: string
          p_title: string
          p_type?: string
        }
        Returns: undefined
      }
      promote_to_creator: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      recalculate_user_combat_power: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      record_content_view: {
        Args: {
          p_content_id: string
          p_content_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      revoke_complimentary_subscription: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      submit_payout_request:
      | {
        Args: { p_amount: number }
        Returns: {
          error: true
        } & "Could not choose the best candidate function between: public.submit_payout_request(p_amount => int4), public.submit_payout_request(p_amount => numeric). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
      }
      | {
        Args: { p_amount: number }
        Returns: {
          error: true
        } & "Could not choose the best candidate function between: public.submit_payout_request(p_amount => int4), public.submit_payout_request(p_amount => numeric). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
      }
      toggle_user_interaction: {
        Args: {
          p_content_id: string
          p_content_type: string
          p_interaction_type: string
          p_user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
    DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
    DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
