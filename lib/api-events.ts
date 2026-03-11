import { supabase } from './supabase';
import {
  Event, EventType, EventStatus, PaymentType,
  EventRegistration, RegistrationPaymentStatus, WeighInStatus,
  CompetitionCategory, CompetitionMatch, CompetitionTeam, TeamMatch
} from '../types';

// ==================== Transform Functions ====================

export function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function transformEvent(data: any): Event {
  const now = getTodayString();
  const baseEvent = {
    id: data.id,
    organizerId: data.organizer_id,
    organizerName: data.organizer?.name,
    organizerProfileImage: data.organizer?.profile_image,
    brandId: data.brand_id,
    brand: data.brand ? {
      id: data.brand.id,
      creatorId: data.brand.creator_id,
      name: data.brand.name,
      logo: data.brand.logo,
    } : undefined,
    type: data.type as EventType,
    title: data.title,
    description: data.description,
    coverImage: data.cover_image,

    venueName: data.venue_name,
    address: data.address,
    addressDetail: data.address_detail,
    region: data.region,
    latitude: data.latitude ? parseFloat(data.latitude) : undefined,
    longitude: data.longitude ? parseFloat(data.longitude) : undefined,
    kakaoPlaceId: data.kakao_place_id,

    eventDate: data.event_date,
    startTime: data.start_time,
    endTime: data.end_time,
    registrationDeadline: data.registration_deadline,
    registrationDeadlineDays: data.registration_deadline_days,

    isRecurring: data.is_recurring,
    recurrencePattern: data.recurrence_pattern,
    recurrenceDayOfWeek: data.recurrence_day_of_week ?? undefined,
    recurrenceDays: data.recurrence_days ?? [],
    monthlyOption: data.monthly_option ?? undefined,
    recurrenceWeeks: data.recurrence_weeks ?? [],
    recurrenceMonthsDates: data.recurrence_months_dates ?? [],
    recurrenceEndDate: data.recurrence_end_date,
    parentEventId: data.parent_event_id,
    useInternalRegistration: data.use_internal_registration ?? true,

    eligibility: data.eligibility,
    maxParticipants: data.max_participants,
    currentParticipants: data.current_participants || data.registration_count || 0,

    price: data.price || 0,
    paymentType: data.payment_type as PaymentType,
    externalPaymentLink: data.external_payment_link,
    bankAccount: data.bank_account,

    competitionFormat: data.competition_format,
    teamSize: data.team_size,
    winsRequired: data.wins_required,

    publicScoreboard: data.public_scoreboard,
    scoreboardUrlKey: data.scoreboard_url_key,

    status: data.status as EventStatus,
    viewCount: data.view_count || 0,

    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };

  return {
    ...(baseEvent as Event),
    nextOccurrence: getNextOccurrence(baseEvent as Event, now)
  };
}

/**
 * Calculates the next occurrence of a recurring event from a given date.
 */
export function getNextOccurrence(event: Event, fromDate: string): string {
  if (!event.isRecurring || !event.eventDate) return event.eventDate;

  const start = new Date(event.eventDate);
  const from = new Date(fromDate);

  // If the event is in the future, return it
  if (event.eventDate >= fromDate) return event.eventDate;

  // If we have an end date and we're past it, return original
  if (event.recurrenceEndDate && event.recurrenceEndDate < fromDate) return event.eventDate;

  let current = new Date(start);

  // Safety break to prevent infinite loops (max 2 years in future)
  const maxSearch = new Date(from);
  maxSearch.setFullYear(maxSearch.getFullYear() + 2);

  while (current <= maxSearch) {
    if (event.recurrencePattern === 'weekly') {
      // Find the next occurrence in weekly pattern
      const targetDays = (event.recurrenceDays && event.recurrenceDays.length > 0)
        ? event.recurrenceDays
        : [event.recurrenceDayOfWeek ?? start.getDay()];

      // Check from current date forward
      for (let i = 1; i <= 7; i++) {
        const next = new Date(current);
        next.setDate(current.getDate() + i);
        const dayString = next.toISOString().split('T')[0];

        if (targetDays.includes(next.getDay())) {
          if (dayString >= fromDate) {
            // Check end date
            if (event.recurrenceEndDate && dayString > event.recurrenceEndDate) return event.eventDate;
            return dayString;
          }
        }
      }
      // If none in this week, jump to next loop iteration from the last day checked
      current.setDate(current.getDate() + 7);
    } else if (event.recurrencePattern === 'biweekly') {
      // Every 2 weeks
      current.setDate(current.getDate() + 14);
      const dayString = current.toISOString().split('T')[0];
      if (dayString >= fromDate) {
        if (event.recurrenceEndDate && dayString > event.recurrenceEndDate) return event.eventDate;
        return dayString;
      }
    } else if (event.recurrencePattern === 'monthly') {
      if (event.monthlyOption === 'date') {
        // Specific dates of the month
        const targetDates = (event.recurrenceMonthsDates && event.recurrenceMonthsDates.length > 0)
          ? event.recurrenceMonthsDates
          : [start.getDate()];

        current.setDate(1); // Start of month
        let monthsToTry = 24;
        while (monthsToTry--) {
          for (const d of targetDates) {
            const next = new Date(current.getFullYear(), current.getMonth(), d);
            const dayString = next.toISOString().split('T')[0];
            if (dayString >= fromDate) {
              if (event.recurrenceEndDate && dayString > event.recurrenceEndDate) return event.eventDate;
              return dayString;
            }
          }
          current.setMonth(current.getMonth() + 1);
        }
        break;
      } else {
        // Nth weekday of the month
        const targetWeeks = (event.recurrenceWeeks && event.recurrenceWeeks.length > 0)
          ? event.recurrenceWeeks
          : [Math.ceil(start.getDate() / 7)];
        const targetDay = event.recurrenceDayOfWeek ?? start.getDay();

        current.setDate(1);
        let monthsToTry = 24;
        while (monthsToTry--) {
          for (const week of targetWeeks) {
            // Find Nth targetDay of current month
            let found = 0;
            for (let d = 1; d <= 31; d++) {
              const test = new Date(current.getFullYear(), current.getMonth(), d);
              if (test.getMonth() !== current.getMonth()) break;
              if (test.getDay() === targetDay) {
                found++;
                if (found === week || (week === -1)) { // -1 could mean last week, but simplified here
                  const dayString = test.toISOString().split('T')[0];
                  if (dayString >= fromDate) {
                    if (event.recurrenceEndDate && dayString > event.recurrenceEndDate) return event.eventDate;
                    return dayString;
                  }
                  if (found === week) break;
                }
              }
            }
          }
          current.setMonth(current.getMonth() + 1);
        }
        break;
      }
    } else {
      // Default daily or other
      current.setDate(current.getDate() + 1);
      const dayString = current.toISOString().split('T')[0];
      if (dayString >= fromDate) {
        if (event.recurrenceEndDate && dayString > event.recurrenceEndDate) return event.eventDate;
        return dayString;
      }
    }
  }

  return event.eventDate;
}

export function transformRegistration(data: any): EventRegistration {
  return {
    id: data.id,
    eventId: data.event_id,
    userId: data.user_id,

    participantName: data.participant_name,
    phone: data.phone,
    email: data.email,
    beltLevel: data.belt_level,
    weightClass: data.weight_class,
    teamName: data.team_name,

    isManualEntry: data.is_manual_entry ?? false,

    paymentStatus: data.payment_status as RegistrationPaymentStatus,
    paymentProofImage: data.payment_proof_image,
    paidAmount: data.paid_amount,
    paidAt: data.paid_at,

    confirmedByOrganizer: data.confirmed_by_organizer ?? false,
    confirmedAt: data.confirmed_at,

    organizerNote: data.organizer_note,
    participantNote: data.participant_note,

    cancelledAt: data.cancelled_at,
    cancelReason: data.cancel_reason,

    waitlistPosition: data.waitlist_position,

    weighInStatus: data.weigh_in_status as WeighInStatus,
    weighInWeight: data.weigh_in_weight ? parseFloat(data.weigh_in_weight) : undefined,
    weighInAt: data.weigh_in_at,
    weighInNote: data.weigh_in_note,

    result: data.result,
    resultNote: data.result_note,

    createdAt: data.created_at,

    event: data.event ? transformEvent(data.event) : undefined,
    user: data.user ? {
      name: data.user.name,
      profileImage: data.user.profile_image,
    } : undefined,
  };
}

export function transformCategory(data: any): CompetitionCategory {
  return {
    id: data.id,
    eventId: data.event_id,
    name: data.name,
    beltLevel: data.belt_level,
    weightClass: data.weight_class,
    gender: data.gender,
    ageGroup: data.age_group,
    isTeamEvent: data.is_team_event ?? false,
    bracketType: data.bracket_type || 'single_elimination',
    bracketData: data.bracket_data,
    participantCount: data.participant_count,
    createdAt: data.created_at,
  };
}

export function transformMatch(data: any): CompetitionMatch {
  return {
    id: data.id,
    categoryId: data.category_id,
    round: data.round,
    matchNumber: data.match_number,

    player1Id: data.player1_id,
    player2Id: data.player2_id,
    player1: data.player1 ? transformRegistration(data.player1) : undefined,
    player2: data.player2 ? transformRegistration(data.player2) : undefined,

    player1Bye: data.player1_bye ?? false,
    player2Bye: data.player2_bye ?? false,

    winnerId: data.winner_id,
    winMethod: data.win_method,

    player1Points: data.player1_points || 0,
    player2Points: data.player2_points || 0,
    player1Advantages: data.player1_advantages || 0,
    player2Advantages: data.player2_advantages || 0,
    player1Penalties: data.player1_penalties || 0,
    player2Penalties: data.player2_penalties || 0,

    matchDuration: data.match_duration,

    nextMatchId: data.next_match_id,
    nextMatchSlot: data.next_match_slot,

    status: data.status || 'pending',
    liveStatus: data.live_status || 'waiting',

    matNumber: data.mat_number || 1,
    videoUrl: data.video_url,

    createdAt: data.created_at,
  };
}

// ==================== Event CRUD ====================

export async function fetchEvents(filters?: {
  type?: EventType;
  status?: EventStatus | 'all';
  region?: string;
  organizerId?: string;
  limit?: number;
  offset?: number;
}) {
  let query = supabase
    .from('events')
    .select(`
      *,
      organizer:creators(id, name, profile_image),
      brand:event_brands(id, name, logo, creator_id)
    `)
    .order('event_date', { ascending: true });

  if (filters?.type) {
    query = query.eq('type', filters.type);
  }
  if (filters?.organizerId) {
    // 주최자 본인의 이벤트는 모든 상태 표시 (draft 포함)
    query = query.eq('organizer_id', filters.organizerId);
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
  } else {
    // 공개 목록에서는 published/completed만 표시
    // status가 'all'이면 필터링 없이 모두 표시 (관리자용)
    if (filters?.status === 'all') {
      // No status filter
    } else if (filters?.status) {
      query = query.eq('status', filters.status);
    } else {
      query = query.in('status', ['published', 'completed']);
    }
  }
  if (filters?.region) {
    query = query.eq('region', filters.region);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((item: any) => transformEvent(item));
}

export async function fetchEventById(eventId: string) {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      organizer:creators(id, name, profile_image, bio),
      brand:event_brands(id, name, logo, creator_id)
    `)
    .eq('id', eventId)
    .single();

  if (error) throw error;

  return transformEvent(data);
}

export async function fetchEventByScoreboardKey(urlKey: string) {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      organizer:creators(id, name, profile_image)
    `)
    .eq('scoreboard_url_key', urlKey)
    .single();

  if (error) throw error;
  return transformEvent(data);
}

export async function createEvent(eventData: Partial<Event>) {
  const scoreboardKey = crypto.randomUUID().slice(0, 8);

  const { data, error } = await supabase
    .from('events')
    .insert([{
      organizer_id: eventData.organizerId,
      brand_id: eventData.brandId,
      type: eventData.type,
      title: eventData.title,
      description: eventData.description,
      cover_image: eventData.coverImage,
      venue_name: eventData.venueName,
      address: eventData.address,
      address_detail: eventData.addressDetail,
      region: eventData.region,
      latitude: eventData.latitude,
      longitude: eventData.longitude,
      kakao_place_id: eventData.kakaoPlaceId,
      event_date: eventData.eventDate,
      start_time: eventData.startTime,
      end_time: eventData.endTime,
      registration_deadline: eventData.registrationDeadline,
      registration_deadline_days: eventData.registrationDeadlineDays,
      is_recurring: eventData.isRecurring || false,
      recurrence_pattern: eventData.recurrencePattern || null,
      recurrence_day_of_week: eventData.recurrenceDayOfWeek ?? null,
      recurrence_days: eventData.recurrenceDays || null,
      monthly_option: eventData.monthlyOption || null,
      recurrence_weeks: eventData.recurrenceWeeks || null,
      recurrence_months_dates: eventData.recurrenceMonthsDates || null,
      recurrence_end_date: eventData.recurrenceEndDate || null,
      use_internal_registration: eventData.useInternalRegistration ?? true,
      eligibility: eventData.eligibility,
      max_participants: eventData.maxParticipants,
      price: eventData.price,
      payment_type: eventData.paymentType,
      external_payment_link: eventData.externalPaymentLink,
      bank_account: eventData.bankAccount,
      competition_format: eventData.competitionFormat,
      team_size: eventData.teamSize,
      wins_required: eventData.winsRequired,
      public_scoreboard: eventData.publicScoreboard ?? true,
      scoreboard_url_key: scoreboardKey,
      status: eventData.status || 'draft',
    }])
    .select()
    .single();

  if (error) throw error;
  return transformEvent(data);
}

export async function updateEvent(eventId: string, eventData: Partial<Event>) {
  const { data, error } = await supabase
    .from('events')
    .update({
      brand_id: eventData.brandId,
      title: eventData.title,
      description: eventData.description,
      cover_image: eventData.coverImage,
      venue_name: eventData.venueName,
      address: eventData.address,
      address_detail: eventData.addressDetail,
      region: eventData.region,
      latitude: eventData.latitude,
      longitude: eventData.longitude,
      kakao_place_id: eventData.kakaoPlaceId,
      event_date: eventData.eventDate,
      start_time: eventData.startTime,
      end_time: eventData.endTime,
      registration_deadline: eventData.registrationDeadline,
      registration_deadline_days: eventData.registrationDeadlineDays,
      is_recurring: eventData.isRecurring || false,
      recurrence_pattern: eventData.recurrencePattern || null,
      recurrence_day_of_week: eventData.recurrenceDayOfWeek ?? null,
      recurrence_days: eventData.recurrenceDays || null,
      monthly_option: eventData.monthlyOption || null,
      recurrence_weeks: eventData.recurrenceWeeks || null,
      recurrence_months_dates: eventData.recurrenceMonthsDates || null,
      recurrence_end_date: eventData.recurrenceEndDate || null,
      use_internal_registration: eventData.useInternalRegistration ?? true,
      eligibility: eventData.eligibility,
      max_participants: eventData.maxParticipants,
      price: eventData.price,
      payment_type: eventData.paymentType,
      external_payment_link: eventData.externalPaymentLink,
      bank_account: eventData.bankAccount,
      competition_format: eventData.competitionFormat,
      team_size: eventData.teamSize,
      wins_required: eventData.winsRequired,
      public_scoreboard: eventData.publicScoreboard,
      status: eventData.status,
    })
    .eq('id', eventId)
    .select()
    .single();

  if (error) throw error;
  return transformEvent(data);
}

export async function deleteEvent(eventId: string) {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);

  if (error) throw error;
}

export async function incrementEventView(eventId: string) {
  const { error } = await supabase.rpc('increment_event_view', { event_id: eventId });
  if (error) {
    // Fallback if RPC doesn't exist
    await supabase
      .from('events')
      .update({ view_count: supabase.raw('view_count + 1') } as any)
      .eq('id', eventId);
  }
}

// ==================== Registration CRUD ====================

export async function fetchRegistrations(eventId: string) {
  const { data, error } = await supabase
    .from('event_registrations')
    .select(`
      *,
      user:users(name, profile_image)
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map(transformRegistration);
}

export async function fetchUserRegistrations(userId: string) {
  const { data, error } = await supabase
    .from('event_registrations')
    .select(`
      *,
      event:events(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(transformRegistration);
}

export async function createRegistration(registrationData: {
  eventId: string;
  userId?: string;
  participantName: string;
  phone?: string;
  email?: string;
  beltLevel?: string;
  weightClass?: string;
  teamName?: string;
  participantNote?: string;
  isManualEntry?: boolean;
}) {
  const { data, error } = await supabase
    .from('event_registrations')
    .insert([{
      event_id: registrationData.eventId,
      user_id: registrationData.userId || null,
      participant_name: registrationData.participantName,
      phone: registrationData.phone,
      email: registrationData.email,
      belt_level: registrationData.beltLevel,
      weight_class: registrationData.weightClass,
      team_name: registrationData.teamName,
      participant_note: registrationData.participantNote,
      is_manual_entry: registrationData.isManualEntry ?? false,
      payment_status: registrationData.isManualEntry ? 'confirmed' : 'pending',
      confirmed_by_organizer: registrationData.isManualEntry ?? false,
    }])
    .select()
    .single();

  if (error) throw error;
  return transformRegistration(data);
}

export async function updateRegistration(
  registrationId: string,
  updates: Partial<{
    paymentStatus: RegistrationPaymentStatus;
    paymentProofImage: string;
    paidAmount: number;
    confirmedByOrganizer: boolean;
    organizerNote: string;
    waitlistPosition: number;
    weighInStatus: WeighInStatus;
    weighInWeight: number;
    weighInNote: string;
    result: string;
    resultNote: string;
  }>
) {
  const updateData: any = {};

  if (updates.paymentStatus !== undefined) {
    updateData.payment_status = updates.paymentStatus;
    if (updates.paymentStatus === 'confirmed') {
      updateData.paid_at = new Date().toISOString();
    }
  }
  if (updates.paymentProofImage !== undefined) updateData.payment_proof_image = updates.paymentProofImage;
  if (updates.paidAmount !== undefined) updateData.paid_amount = updates.paidAmount;
  if (updates.confirmedByOrganizer !== undefined) {
    updateData.confirmed_by_organizer = updates.confirmedByOrganizer;
    if (updates.confirmedByOrganizer) {
      updateData.confirmed_at = new Date().toISOString();
    }
  }
  if (updates.organizerNote !== undefined) updateData.organizer_note = updates.organizerNote;
  if (updates.waitlistPosition !== undefined) updateData.waitlist_position = updates.waitlistPosition;
  if (updates.weighInStatus !== undefined) {
    updateData.weigh_in_status = updates.weighInStatus;
    if (updates.weighInStatus !== 'pending') {
      updateData.weigh_in_at = new Date().toISOString();
    }
  }
  if (updates.weighInWeight !== undefined) updateData.weigh_in_weight = updates.weighInWeight;
  if (updates.weighInNote !== undefined) updateData.weigh_in_note = updates.weighInNote;
  if (updates.result !== undefined) updateData.result = updates.result;
  if (updates.resultNote !== undefined) updateData.result_note = updates.resultNote;

  const { data, error } = await supabase
    .from('event_registrations')
    .update(updateData)
    .eq('id', registrationId)
    .select()
    .single();

  if (error) throw error;
  return transformRegistration(data);
}

export async function cancelRegistration(registrationId: string, reason?: string) {
  const { data, error } = await supabase
    .from('event_registrations')
    .update({
      payment_status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason,
    })
    .eq('id', registrationId)
    .select()
    .single();

  if (error) throw error;
  return transformRegistration(data);
}

// ==================== Competition Categories ====================

export async function fetchCategories(eventId: string) {
  const { data, error } = await supabase
    .from('competition_categories')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map(transformCategory);
}

export async function createCategory(categoryData: {
  eventId: string;
  name: string;
  beltLevel?: string;
  weightClass?: string;
  gender?: string;
  ageGroup?: string;
  isTeamEvent?: boolean;
  bracketType?: string;
}) {
  const { data, error } = await supabase
    .from('competition_categories')
    .insert([{
      event_id: categoryData.eventId,
      name: categoryData.name,
      belt_level: categoryData.beltLevel,
      weight_class: categoryData.weightClass,
      gender: categoryData.gender || 'mixed',
      age_group: categoryData.ageGroup,
      is_team_event: categoryData.isTeamEvent ?? false,
      bracket_type: categoryData.bracketType || 'single_elimination',
    }])
    .select()
    .single();

  if (error) throw error;
  return transformCategory(data);
}

export async function updateCategory(categoryId: string, updates: Partial<CompetitionCategory>) {
  const { data, error } = await supabase
    .from('competition_categories')
    .update({
      name: updates.name,
      belt_level: updates.beltLevel,
      weight_class: updates.weightClass,
      gender: updates.gender,
      age_group: updates.ageGroup,
      is_team_event: updates.isTeamEvent,
      bracket_type: updates.bracketType,
      bracket_data: updates.bracketData,
    })
    .eq('id', categoryId)
    .select()
    .single();

  if (error) throw error;
  return transformCategory(data);
}

export async function deleteCategory(categoryId: string) {
  const { error } = await supabase
    .from('competition_categories')
    .delete()
    .eq('id', categoryId);

  if (error) throw error;
}

// ==================== Competition Matches ====================

export async function fetchMatches(categoryId: string) {
  const { data, error } = await supabase
    .from('competition_matches')
    .select(`
      *,
      player1:event_registrations!player1_id(id, participant_name, belt_level, weight_class, team_name, weigh_in_status),
      player2:event_registrations!player2_id(id, participant_name, belt_level, weight_class, team_name, weigh_in_status)
    `)
    .eq('category_id', categoryId)
    .order('round', { ascending: true })
    .order('match_number', { ascending: true });

  if (error) throw error;
  return (data || []).map(transformMatch);
}

export async function createMatch(matchData: {
  categoryId: string;
  round: number;
  matchNumber: number;
  player1Id?: string;
  player2Id?: string;
  player1Bye?: boolean;
  player2Bye?: boolean;
  nextMatchId?: string;
  nextMatchSlot?: number;
}) {
  const { data, error } = await supabase
    .from('competition_matches')
    .insert([{
      category_id: matchData.categoryId,
      round: matchData.round,
      match_number: matchData.matchNumber,
      player1_id: matchData.player1Id,
      player2_id: matchData.player2Id,
      player1_bye: matchData.player1Bye ?? false,
      player2_bye: matchData.player2Bye ?? false,
      next_match_id: matchData.nextMatchId,
      next_match_slot: matchData.nextMatchSlot,
    }])
    .select()
    .single();

  if (error) throw error;
  return transformMatch(data);
}

export async function updateMatch(
  matchId: string,
  updates: Partial<{
    player1Id: string;
    player2Id: string;
    winnerId: string;
    winMethod: string;
    player1Points: number;
    player2Points: number;
    player1Advantages: number;
    player2Advantages: number;
    player1Penalties: number;
    player2Penalties: number;
    matchDuration: number;
    status: 'pending' | 'in_progress' | 'completed';
    liveStatus: 'waiting' | 'ready' | 'in_progress' | 'completed';
    matNumber: number;
  }>
) {
  const updateData: any = {};

  if (updates.player1Id !== undefined) updateData.player1_id = updates.player1Id;
  if (updates.player2Id !== undefined) updateData.player2_id = updates.player2Id;
  if (updates.winnerId !== undefined) updateData.winner_id = updates.winnerId;
  if (updates.winMethod !== undefined) updateData.win_method = updates.winMethod;
  if (updates.player1Points !== undefined) updateData.player1_points = updates.player1Points;
  if (updates.player2Points !== undefined) updateData.player2_points = updates.player2Points;
  if (updates.player1Advantages !== undefined) updateData.player1_advantages = updates.player1Advantages;
  if (updates.player2Advantages !== undefined) updateData.player2_advantages = updates.player2Advantages;
  if (updates.player1Penalties !== undefined) updateData.player1_penalties = updates.player1Penalties;
  if (updates.player2Penalties !== undefined) updateData.player2_penalties = updates.player2Penalties;
  if (updates.matchDuration !== undefined) updateData.match_duration = updates.matchDuration;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.liveStatus !== undefined) updateData.live_status = updates.liveStatus;
  if (updates.matNumber !== undefined) updateData.mat_number = updates.matNumber;

  const { data, error } = await supabase
    .from('competition_matches')
    .update(updateData)
    .eq('id', matchId)
    .select()
    .single();

  if (error) throw error;
  return transformMatch(data);
}

// Advance winner to next match
export async function advanceWinner(matchId: string, winnerId: string, winMethod: string) {
  // Get current match
  const { data: match, error: matchError } = await supabase
    .from('competition_matches')
    .select('*')
    .eq('id', matchId)
    .single();

  if (matchError) throw matchError;

  // Update current match
  await updateMatch(matchId, {
    winnerId,
    winMethod,
    status: 'completed',
    liveStatus: 'completed',
  });

  // Advance to next match if exists
  if (match.next_match_id && match.next_match_slot !== null) {
    const slot = match.next_match_slot === 1 ? 'player1_id' : 'player2_id';
    await supabase
      .from('competition_matches')
      .update({ [slot]: winnerId })
      .eq('id', match.next_match_id);
  }
}

// ==================== Team Matches ====================

export async function fetchTeams(categoryId: string) {
  const { data, error } = await supabase
    .from('competition_teams')
    .select('*')
    .eq('category_id', categoryId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createTeam(teamData: {
  categoryId: string;
  teamName: string;
  memberIds: string[];
  memberOrder?: string[];
}) {
  const { data, error } = await supabase
    .from('competition_teams')
    .insert([{
      category_id: teamData.categoryId,
      team_name: teamData.teamName,
      member_ids: teamData.memberIds,
      member_order: teamData.memberOrder || teamData.memberIds,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchTeamMatches(categoryId: string) {
  const { data, error } = await supabase
    .from('team_matches')
    .select(`
      *,
      team1:competition_teams!team1_id(*),
      team2:competition_teams!team2_id(*)
    `)
    .eq('category_id', categoryId)
    .order('round', { ascending: true })
    .order('match_number', { ascending: true });

  if (error) throw error;
  return data || [];
}

// ==================== Realtime Subscriptions ====================

export function subscribeToMatch(matchId: string, callback: (match: CompetitionMatch) => void) {
  return supabase
    .channel(`match:${matchId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'competition_matches',
        filter: `id=eq.${matchId}`,
      },
      (payload) => {
        callback(transformMatch(payload.new));
      }
    )
    .subscribe();
}

export function subscribeToEventMatches(eventId: string, callback: (matches: CompetitionMatch[]) => void) {
  return supabase
    .channel(`event_matches:${eventId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'competition_matches',
      },
      async () => {
        // Refetch all matches for this event
        const { data: categories } = await supabase
          .from('competition_categories')
          .select('id')
          .eq('event_id', eventId);

        if (categories) {
          const allMatches: CompetitionMatch[] = [];
          for (const cat of categories) {
            const matches = await fetchMatches(cat.id);
            allMatches.push(...matches);
          }
          callback(allMatches);
        }
      }
    )
    .subscribe();
}

/**
 * Subscribe to match updates for a specific category
 */
export function subscribeToMatchUpdates(categoryId: string, callback: (match: CompetitionMatch) => void) {
  const channel = supabase
    .channel(`category_matches:${categoryId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'competition_matches',
        filter: `category_id=eq.${categoryId}`,
      },
      (payload) => {
        callback(transformMatch(payload.new));
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
}

// ==================== User BJJ Profile (for event registration pre-fill) ====================

export interface UserBjjProfile {
  phone?: string;
  beltLevel?: string;
  weightClass?: string;
  teamName?: string;
  name?: string;
  email?: string;
  profileImageUrl?: string;
}

export async function fetchUserBjjProfile(userId: string): Promise<UserBjjProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('name, phone, belt_level, weight_class, team_name, profile_image_url')
    .eq('id', userId)
    .single();

  if (error) {
    console.warn('Error fetching user BJJ profile:', error);
    return null;
  }

  return {
    name: data.name,
    phone: data.phone,
    beltLevel: data.belt_level,
    weightClass: data.weight_class,
    teamName: data.team_name,
    profileImageUrl: data.profile_image_url,
  };
}

export async function updateUserBjjProfile(userId: string, updates: Partial<{
  phone: string;
  beltLevel: string;
  weightClass: string;
  teamName: string;
}>) {
  const updateData: any = {};

  if (updates.phone !== undefined) updateData.phone = updates.phone;
  if (updates.beltLevel !== undefined) updateData.belt_level = updates.beltLevel;
  if (updates.weightClass !== undefined) updateData.weight_class = updates.weightClass;
  if (updates.teamName !== undefined) updateData.team_name = updates.teamName;

  const { data, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
