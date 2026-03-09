import { supabase } from './supabase';
import { Creator, InstructorInvitation, OrganizerReview, InvitationPaymentStatus, InstructorResponse, EventBrand, Event } from '../types';
import { transformEvent } from './api-events';

// ==================== Transform Functions ====================

export function transformCreatorToOrganizer(data: any): Creator {
  return {
    id: data.id,
    name: data.name,
    bio: data.bio || '',
    profileImage: data.profile_image || '',
    subscriberCount: data.subscriber_count || 0,
    email: data.email,
    courseCount: data.course_count || 0,
    routineCount: data.routine_count || 0,
    sparringCount: data.sparring_count || 0,
    hidden: data.hidden ?? false,
    stripeAccountId: data.stripe_account_id,
    payoutSettings: data.payout_settings,

    // Organizer fields
    creatorType: data.creator_type || 'instructor',
    canHostEvents: data.can_host_events ?? false,
    verifiedOrganizer: data.verified_organizer ?? false,
    totalEventsHosted: data.total_events_hosted || 0,

    // Instructor invitation fields (legacy)
    minInvitationFee: data.min_invitation_fee || 0,
    invitationDescription: data.invitation_description,

    // Event type-specific invitation settings
    acceptCompetitionInvitations: data.accept_competition_invitations ?? false,
    minCompetitionFee: data.min_competition_fee || 0,
    acceptSeminarInvitations: data.accept_seminar_invitations ?? false,
    minSeminarFee: data.min_seminar_fee || 0,
    acceptOpenmatInvitations: data.accept_openmat_invitations ?? false,
    minOpenmatFee: data.min_openmat_fee || 0,

    bankAccountForInvitation: data.bank_account_for_invitation ? {
      bankName: data.bank_account_for_invitation.bank_name,
      accountNumber: data.bank_account_for_invitation.account_number,
      holderName: data.bank_account_for_invitation.holder_name,
    } : undefined,
  };
}

export function transformInvitation(data: any): InstructorInvitation {
  return {
    id: data.id,
    eventId: data.event_id,
    organizerId: data.organizer_id,
    instructorId: data.instructor_id,

    minFeeSnapshot: data.min_fee_snapshot,
    proposedFee: data.proposed_fee,

    invitationMessage: data.invitation_message,

    instructorResponse: data.instructor_response as InstructorResponse,
    responseMessage: data.response_message,
    respondedAt: data.responded_at,

    // Bank account (revealed when accepted)
    instructorBankAccount: data.instructor_bank_account ? {
      bankName: data.instructor_bank_account.bank_name,
      accountNumber: data.instructor_bank_account.account_number,
      holderName: data.instructor_bank_account.holder_name,
    } : undefined,

    paymentStatus: data.payment_status as InvitationPaymentStatus,
    paidAt: data.paid_at,
    confirmedAt: data.confirmed_at,

    createdAt: data.created_at,

    event: data.event,
    instructor: data.instructor ? transformCreatorToOrganizer(data.instructor) : undefined,
    organizer: data.organizer ? transformCreatorToOrganizer(data.organizer) : undefined,
  };
}

export function transformReview(data: any): OrganizerReview {
  return {
    id: data.id,
    organizerId: data.organizer_id,
    eventId: data.event_id,
    userId: data.user_id,
    userName: data.user?.name,
    userAvatar: data.user?.profile_image,
    rating: data.rating,
    content: data.content,
    createdAt: data.created_at,
  };
}

export function transformBrand(data: any): EventBrand {
  return {
    id: data.id,
    creatorId: data.creator_id,

    name: data.name,
    slug: data.slug,
    logo: data.logo,
    coverImage: data.cover_image,
    description: data.description,

    contactEmail: data.contact_email,
    contactPhone: data.contact_phone,

    instagram: data.instagram,
    youtube: data.youtube,
    website: data.website,

    bankAccount: data.bank_account ? {
      bankName: data.bank_account.bank_name,
      accountNumber: data.bank_account.account_number,
      holderName: data.bank_account.holder_name,
    } : undefined,

    isDefault: data.is_default ?? false,
    isActive: data.is_active ?? true,
    verified: data.verified ?? false,

    totalEvents: data.total_events || 0,
    totalParticipants: data.total_participants || 0,

    createdAt: data.created_at,
    updatedAt: data.updated_at,

    creator: data.creator ? transformCreatorToOrganizer(data.creator) : undefined,
  };
}

// ==================== Event Brands ====================

export async function fetchBrandsByCreator(creatorId: string): Promise<EventBrand[]> {
  const { data, error } = await supabase
    .from('event_brands')
    .select('*')
    .eq('creator_id', creatorId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map(transformBrand);
}

export async function fetchBrandById(brandId: string): Promise<EventBrand> {
  const { data, error } = await supabase
    .from('event_brands')
    .select(`
      *,
      creator:creators(*)
    `)
    .eq('id', brandId)
    .single();

  if (error) throw error;
  return transformBrand(data);
}

export async function fetchBrandBySlug(slug: string): Promise<EventBrand> {
  const { data, error } = await supabase
    .from('event_brands')
    .select(`
      *,
      creator:creators(*)
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error) throw error;
  return transformBrand(data);
}

export async function createBrand(brandData: {
  creatorId: string;
  name: string;
  slug?: string;
  logo?: string;
  coverImage?: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  instagram?: string;
  youtube?: string;
  website?: string;
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    holderName: string;
  };
  isDefault?: boolean;
}): Promise<EventBrand> {
  // Check if this is the first brand for the creator
  const { count } = await supabase
    .from('event_brands')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', brandData.creatorId);

  const isFirstBrand = count === 0;

  const { data, error } = await supabase
    .from('event_brands')
    .insert([{
      creator_id: brandData.creatorId,
      name: brandData.name,
      slug: brandData.slug,
      logo: brandData.logo,
      cover_image: brandData.coverImage,
      description: brandData.description,
      contact_email: brandData.contactEmail,
      contact_phone: brandData.contactPhone,
      instagram: brandData.instagram,
      youtube: brandData.youtube,
      website: brandData.website,
      bank_account: brandData.bankAccount ? {
        bank_name: brandData.bankAccount.bankName,
        account_number: brandData.bankAccount.accountNumber,
        holder_name: brandData.bankAccount.holderName,
      } : null,
      is_default: isFirstBrand || brandData.isDefault,
    }])
    .select()
    .single();

  if (error) throw error;
  return transformBrand(data);
}

export async function updateBrand(brandId: string, updates: Partial<{
  name: string;
  slug: string;
  logo: string;
  coverImage: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  instagram: string;
  youtube: string;
  website: string;
  bankAccount: {
    bankName: string;
    accountNumber: string;
    holderName: string;
  };
  isActive: boolean;
}>): Promise<EventBrand> {
  const updateData: any = {};

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.slug !== undefined) updateData.slug = updates.slug;
  if (updates.logo !== undefined) updateData.logo = updates.logo;
  if (updates.coverImage !== undefined) updateData.cover_image = updates.coverImage;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.contactEmail !== undefined) updateData.contact_email = updates.contactEmail;
  if (updates.contactPhone !== undefined) updateData.contact_phone = updates.contactPhone;
  if (updates.instagram !== undefined) updateData.instagram = updates.instagram;
  if (updates.youtube !== undefined) updateData.youtube = updates.youtube;
  if (updates.website !== undefined) updateData.website = updates.website;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
  if (updates.bankAccount !== undefined) {
    updateData.bank_account = {
      bank_name: updates.bankAccount.bankName,
      account_number: updates.bankAccount.accountNumber,
      holder_name: updates.bankAccount.holderName,
    };
  }

  const { data, error } = await supabase
    .from('event_brands')
    .update(updateData)
    .eq('id', brandId)
    .select()
    .single();

  if (error) throw error;
  return transformBrand(data);
}

export async function deleteBrand(brandId: string): Promise<void> {
  // Check if brand has events
  const { count, error: countError } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('brand_id', brandId);

  if (countError) throw countError;

  if (count && count > 0) {
    throw new Error(`이 브랜드에 연결된 이벤트가 ${count}개 있습니다. 삭제하기 전에 이벤트를 다른 브랜드로 이전하거나 삭제해주세요.`);
  }

  const { error } = await supabase
    .from('event_brands')
    .delete()
    .eq('id', brandId);

  if (error) throw error;
}

export async function setDefaultBrand(brandId: string, creatorId: string): Promise<void> {
  // Remove default from all brands for this creator
  await supabase
    .from('event_brands')
    .update({ is_default: false })
    .eq('creator_id', creatorId);

  // Set the new default
  const { error } = await supabase
    .from('event_brands')
    .update({ is_default: true })
    .eq('id', brandId);

  if (error) throw error;
}

export async function getBrandStats(brandId: string): Promise<{
  totalEvents: number;
  totalParticipants: number;
  upcomingEvents: number;
  completedEvents: number;
}> {
  const { data: brand, error: brandError } = await supabase
    .from('event_brands')
    .select('total_events, total_participants')
    .eq('id', brandId)
    .single();

  if (brandError) throw brandError;

  // Get upcoming events count
  const today = new Date().toISOString().split('T')[0];
  const { count: upcomingCount } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('brand_id', brandId)
    .eq('status', 'published')
    .gte('event_date', today);

  const { count: completedCount } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('brand_id', brandId)
    .in('status', ['published', 'completed'])
    .lt('event_date', today);

  return {
    totalEvents: brand.total_events || 0,
    totalParticipants: brand.total_participants || 0,
    upcomingEvents: upcomingCount || 0,
    completedEvents: completedCount || 0,
  };
}

export async function fetchEventsByBrand(brandId: string): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      organizer:creators(id, name, profile_image),
      brand:event_brands(id, name, logo, creator_id)
    `)
    .eq('brand_id', brandId)
    .order('event_date', { ascending: false });

  if (error) throw error;
  return (data || []).map(transformEvent);
}

export async function fetchActiveBrands(limit?: number): Promise<EventBrand[]> {
  let query = supabase
    .from('event_brands')
    .select(`
      *,
      creator:creators(id, name, profile_image)
    `)
    .eq('is_active', true)
    .order('total_events', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(transformBrand);
}

/**
 * Admin: Fetch all brands (including inactive/hidden)
 */
export async function fetchAllBrandsAdmin(): Promise<EventBrand[]> {
  const { data, error } = await supabase
    .from('event_brands')
    .select(`
      *,
      creator:creators(id, name, profile_image)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(transformBrand);
}

/**
 * Admin: Update brand visibility (hide/show)
 */
export async function updateBrandVisibility(brandId: string, isActive: boolean) {
  const { error } = await supabase
    .from('event_brands')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', brandId);

  if (error) throw error;
}

/**
 * Admin: Transfer brand to another creator (organizer)
 */
export async function transferBrandToCreator(brandId: string, newCreatorId: string) {
  const { error } = await supabase
    .from('event_brands')
    .update({
      creator_id: newCreatorId,
      is_default: false, // Reset default flag when transferring
      updated_at: new Date().toISOString()
    })
    .eq('id', brandId);

  if (error) throw error;
}

// ==================== Organizers ====================

export async function fetchOrganizers(filters?: {
  verified?: boolean;
  limit?: number;
  offset?: number;
}) {
  let query = supabase
    .from('creators')
    .select('*')
    .in('creator_type', ['organizer', 'both'])
    .eq('can_host_events', true)
    .eq('hidden', false)
    .order('total_events_hosted', { ascending: false });

  if (filters?.verified) {
    query = query.eq('verified_organizer', true);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(transformCreatorToOrganizer);
}

export async function fetchOrganizerById(organizerId: string) {
  const { data, error } = await supabase
    .from('creators')
    .select('*')
    .eq('id', organizerId)
    .single();

  if (error) throw error;
  return transformCreatorToOrganizer(data);
}

export async function applyAsOrganizer(userId: string, creatorId?: string) {
  // If user already has a creator profile, update it
  if (creatorId) {
    const { data, error } = await supabase
      .from('creators')
      .update({
        creator_type: 'both',
        can_host_events: true,
      })
      .eq('id', creatorId)
      .select()
      .single();

    if (error) throw error;
    return transformCreatorToOrganizer(data);
  }

  // Otherwise, get user info and create creator profile
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('name, profile_image_url, email')
    .eq('id', userId)
    .single();

  if (userError) throw userError;

  let fallbackName = 'Organizer';
  if (userData.name) {
    fallbackName = userData.name;
  } else if (userData.email) {
    fallbackName = userData.email.split('@')[0];
  }

  const { data, error } = await supabase
    .from('creators')
    .insert([{
      id: userId,
      name: fallbackName,
      profile_image: userData.profile_image_url,
      creator_type: 'organizer',
      can_host_events: true,
      subscriber_count: 0,
    }])
    .select()
    .single();

  if (error) throw error;

  // Create default event team for the new organizer
  try {
    const { error: brandError } = await supabase
      .from('event_brands')
      .insert([{
        creator_id: userId,
        name: fallbackName,
        is_default: true
      }]);
    
    if (brandError && !brandError.message.includes('duplicate')) {
      console.error('Failed to create default event team during application:', brandError);
    }
  } catch (err) {
    console.error('Error creating default brand:', err);
  }

  return transformCreatorToOrganizer(data);
}

/**
 * Admin function to promote a user to organizer
 * - If user is already a creator/instructor, upgrades to 'both'
 * - If user is not a creator, creates new organizer profile
 */
export async function promoteToOrganizer(userId: string) {
  // Check if user already has a creator profile
  const { data: existingCreator } = await supabase
    .from('creators')
    .select('id, creator_type')
    .eq('id', userId)
    .single();

  if (existingCreator) {
    // User is already a creator, update to 'both' if they're just instructor
    if (existingCreator.creator_type === 'instructor') {
      const { data, error } = await supabase
        .from('creators')
        .update({
          creator_type: 'both',
          can_host_events: true,
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      // Ensure they have a default brand
      try {
        const { count } = await supabase
          .from('event_brands')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', userId);

        if (count === 0) {
          await supabase
            .from('event_brands')
            .insert([{
              creator_id: userId,
              name: data.name || '내 이벤트 팀',
              is_default: true
            }]);
        }
      } catch (err) {
        console.error('Error ensuring default brand for promoted organizer:', err);
      }

      return { data: transformCreatorToOrganizer(data), error: null };
    }
    // Already organizer or both
    return { data: transformCreatorToOrganizer(existingCreator), error: null };
  }

  // User is not a creator, create new organizer profile
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('name, profile_image_url, email')
    .eq('id', userId)
    .single();

  if (userError) return { data: null, error: userError };

  let fallbackName = 'Organizer';
  if (userData.name) {
    fallbackName = userData.name;
  } else if (userData.email) {
    fallbackName = userData.email.split('@')[0];
  }

  const { data, error } = await supabase
    .from('creators')
    .insert([{
      id: userId,
      name: fallbackName,
      profile_image: userData.profile_image_url,
      creator_type: 'organizer',
      can_host_events: true,
      subscriber_count: 0,
    }])
    .select()
    .single();

  if (error) return { data: null, error };

  // Create default event team for the new organizer
  try {
    await supabase
      .from('event_brands')
      .insert([{
        creator_id: userId,
        name: fallbackName,
        is_default: true
      }]);
  } catch (err) {
    console.error('Error creating default brand for new organizer:', err);
  }

  return { data: transformCreatorToOrganizer(data), error: null };
}

/**
 * Admin function to get all organizers
 */
export async function getAdminOrganizers() {
  const { data, error } = await supabase
    .from('creators')
    .select('*')
    .in('creator_type', ['organizer', 'both'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Fetch emails from users table
  const creatorIds = data.map(c => c.id);
  const { data: usersData } = await supabase
    .from('users')
    .select('id, email')
    .in('id', creatorIds);

  const emailMap = new Map<string, string>();
  usersData?.forEach(u => emailMap.set(u.id, u.email || ''));

  return data.map(c => transformCreatorToOrganizer({
    ...c,
    email: emailMap.get(c.id) || ''
  }));
}

/**
 * Admin function to revoke organizer status
 * - If 'both', downgrades to 'instructor'
 * - If 'organizer' only, removes can_host_events
 */
export async function revokeOrganizerStatus(creatorId: string) {
  const { data: creator } = await supabase
    .from('creators')
    .select('creator_type')
    .eq('id', creatorId)
    .single();

  if (!creator) return { error: 'Creator not found' };

  if (creator.creator_type === 'both') {
    // Downgrade to instructor only
    const { error } = await supabase
      .from('creators')
      .update({ creator_type: 'instructor', can_host_events: false })
      .eq('id', creatorId);
    return { error };
  } else if (creator.creator_type === 'organizer') {
    // Remove can_host_events
    const { error } = await supabase
      .from('creators')
      .update({ can_host_events: false })
      .eq('id', creatorId);
    return { error };
  }

  return { error: null };
}

export async function updateOrganizerProfile(organizerId: string, updates: Partial<{
  name: string;
  bio: string;
  profileImage: string;
  minInvitationFee: number;
  invitationDescription: string;
  // Event type-specific invitation settings
  acceptCompetitionInvitations: boolean;
  minCompetitionFee: number;
  acceptSeminarInvitations: boolean;
  minSeminarFee: number;
  acceptOpenmatInvitations: boolean;
  minOpenmatFee: number;
  bankAccountForInvitation: {
    bankName: string;
    accountNumber: string;
    holderName: string;
  };
}>) {
  const updateData: any = {};

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.bio !== undefined) updateData.bio = updates.bio;
  if (updates.profileImage !== undefined) updateData.profile_image = updates.profileImage;
  if (updates.minInvitationFee !== undefined) updateData.min_invitation_fee = updates.minInvitationFee;
  if (updates.invitationDescription !== undefined) updateData.invitation_description = updates.invitationDescription;

  // Event type-specific settings
  if (updates.acceptCompetitionInvitations !== undefined) updateData.accept_competition_invitations = updates.acceptCompetitionInvitations;
  if (updates.minCompetitionFee !== undefined) updateData.min_competition_fee = updates.minCompetitionFee;
  if (updates.acceptSeminarInvitations !== undefined) updateData.accept_seminar_invitations = updates.acceptSeminarInvitations;
  if (updates.minSeminarFee !== undefined) updateData.min_seminar_fee = updates.minSeminarFee;
  if (updates.acceptOpenmatInvitations !== undefined) updateData.accept_openmat_invitations = updates.acceptOpenmatInvitations;
  if (updates.minOpenmatFee !== undefined) updateData.min_openmat_fee = updates.minOpenmatFee;

  if (updates.bankAccountForInvitation !== undefined) {
    updateData.bank_account_for_invitation = {
      bank_name: updates.bankAccountForInvitation.bankName,
      account_number: updates.bankAccountForInvitation.accountNumber,
      holder_name: updates.bankAccountForInvitation.holderName,
    };
  }

  const { data, error } = await supabase
    .from('creators')
    .update(updateData)
    .eq('id', organizerId)
    .select()
    .single();

  if (error) throw error;
  return transformCreatorToOrganizer(data);
}

// ==================== Instructor Invitations ====================

export async function fetchAvailableInstructors(filters?: {
  eventType?: 'competition' | 'seminar' | 'openmat';
  minFeeMax?: number;
  limit?: number;
}) {
  let query = supabase
    .from('creators')
    .select('*')
    .or('creator_type.eq.instructor,creator_type.eq.both,creator_type.is.null')
    .eq('hidden', false)
    .order('subscriber_count', { ascending: false });

  // Filter by event type-specific acceptance
  if (filters?.eventType) {
    switch (filters.eventType) {
      case 'competition':
        query = query.eq('accept_competition_invitations', true);
        if (filters.minFeeMax) {
          query = query.lte('min_competition_fee', filters.minFeeMax);
        }
        break;
      case 'seminar':
        query = query.eq('accept_seminar_invitations', true);
        if (filters.minFeeMax) {
          query = query.lte('min_seminar_fee', filters.minFeeMax);
        }
        break;
      case 'openmat':
        query = query.eq('accept_openmat_invitations', true);
        if (filters.minFeeMax) {
          query = query.lte('min_openmat_fee', filters.minFeeMax);
        }
        break;
    }
  } else {
    // Show instructors who accept any type of invitation
    query = query.or('accept_competition_invitations.eq.true,accept_seminar_invitations.eq.true,accept_openmat_invitations.eq.true');
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(transformCreatorToOrganizer);
}

export async function createInvitation(invitationData: {
  eventId: string;
  organizerId: string;
  instructorId: string;
  proposedFee: number;
  invitationMessage?: string;
}) {
  // Get event type to determine which minimum fee to use
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('type')
    .eq('id', invitationData.eventId)
    .single();

  if (eventError) throw eventError;

  // Get instructor's min fee based on event type
  const { data: instructor, error: instructorError } = await supabase
    .from('creators')
    .select('min_invitation_fee, min_competition_fee, min_seminar_fee, min_openmat_fee')
    .eq('id', invitationData.instructorId)
    .single();

  if (instructorError) throw instructorError;

  // Determine minimum fee based on event type
  let minFee = instructor.min_invitation_fee || 0; // fallback
  switch (event.type) {
    case 'competition':
      minFee = instructor.min_competition_fee ?? instructor.min_invitation_fee ?? 0;
      break;
    case 'seminar':
      minFee = instructor.min_seminar_fee ?? instructor.min_invitation_fee ?? 0;
      break;
    case 'openmat':
      minFee = instructor.min_openmat_fee ?? instructor.min_invitation_fee ?? 0;
      break;
  }

  if (invitationData.proposedFee < minFee) {
    throw new Error(`제안 금액이 최소 금액(${minFee.toLocaleString()}원)보다 낮습니다.`);
  }

  const { data, error } = await supabase
    .from('instructor_invitations')
    .insert([{
      event_id: invitationData.eventId,
      organizer_id: invitationData.organizerId,
      instructor_id: invitationData.instructorId,
      min_fee_snapshot: minFee,
      proposed_fee: invitationData.proposedFee,
      invitation_message: invitationData.invitationMessage,
    }])
    .select()
    .single();

  if (error) throw error;
  return transformInvitation(data);
}

export async function fetchInvitationsByEvent(eventId: string) {
  const { data, error } = await supabase
    .from('instructor_invitations')
    .select(`
      *,
      instructor:creators!instructor_id(id, name, profile_image, min_invitation_fee)
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(transformInvitation);
}

export async function fetchInvitationsForInstructor(instructorId: string) {
  const { data, error } = await supabase
    .from('instructor_invitations')
    .select(`
      *,
      event:events(id, title, event_date, type),
      organizer:creators!organizer_id(id, name, profile_image)
    `)
    .eq('instructor_id', instructorId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(transformInvitation);
}

/**
 * Instructor responds to invitation
 * - If accepted: bank account is copied from instructor's profile, status -> 'awaiting_payment'
 * - If declined: status -> 'declined'
 */
export async function respondToInvitation(
  invitationId: string,
  instructorId: string,
  response: 'accepted' | 'declined',
  message?: string
) {
  if (response === 'declined') {
    const { data, error } = await supabase
      .from('instructor_invitations')
      .update({
        instructor_response: 'declined',
        response_message: message,
        responded_at: new Date().toISOString(),
        payment_status: 'declined',
      })
      .eq('id', invitationId)
      .select()
      .single();

    if (error) throw error;
    return transformInvitation(data);
  }

  // Get instructor's bank account
  const { data: instructor, error: instructorError } = await supabase
    .from('creators')
    .select('bank_account_for_invitation')
    .eq('id', instructorId)
    .single();

  if (instructorError) throw instructorError;

  if (!instructor.bank_account_for_invitation) {
    throw new Error('계좌 정보가 등록되지 않았습니다. 설정에서 계좌 정보를 먼저 등록해주세요.');
  }

  const { data, error } = await supabase
    .from('instructor_invitations')
    .update({
      instructor_response: 'accepted',
      response_message: message,
      responded_at: new Date().toISOString(),
      instructor_bank_account: instructor.bank_account_for_invitation,
      payment_status: 'awaiting_payment',
    })
    .eq('id', invitationId)
    .select()
    .single();

  if (error) throw error;
  return transformInvitation(data);
}

/**
 * Organizer marks invitation as paid (bank transfer sent)
 */
export async function markInvitationPaid(invitationId: string) {
  const { data, error } = await supabase
    .from('instructor_invitations')
    .update({
      payment_status: 'paid',
      paid_at: new Date().toISOString(),
    })
    .eq('id', invitationId)
    .select()
    .single();

  if (error) throw error;
  return transformInvitation(data);
}

/**
 * Instructor confirms payment received
 */
export async function confirmInvitationPayment(invitationId: string) {
  const { data, error } = await supabase
    .from('instructor_invitations')
    .update({
      payment_status: 'confirmed',
      confirmed_at: new Date().toISOString(),
    })
    .eq('id', invitationId)
    .select()
    .single();

  if (error) throw error;
  return transformInvitation(data);
}

/**
 * Cancel invitation (by organizer, before instructor accepts)
 */
export async function cancelInvitation(invitationId: string) {
  const { data, error } = await supabase
    .from('instructor_invitations')
    .update({
      payment_status: 'cancelled',
    })
    .eq('id', invitationId)
    .eq('instructor_response', 'pending') // Can only cancel pending invitations
    .select()
    .single();

  if (error) throw error;
  return transformInvitation(data);
}

// ==================== Organizer Reviews ====================

export async function fetchOrganizerReviews(organizerId: string) {
  const { data, error } = await supabase
    .from('organizer_reviews')
    .select(`
      *,
      user:users(name, profile_image)
    `)
    .eq('organizer_id', organizerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(transformReview);
}

export async function createOrganizerReview(reviewData: {
  organizerId: string;
  eventId?: string;
  userId: string;
  rating: number;
  content?: string;
}) {
  const { data, error } = await supabase
    .from('organizer_reviews')
    .insert([{
      organizer_id: reviewData.organizerId,
      event_id: reviewData.eventId,
      user_id: reviewData.userId,
      rating: reviewData.rating,
      content: reviewData.content,
    }])
    .select()
    .single();

  if (error) throw error;
  return transformReview(data);
}

export async function getOrganizerStats(organizerId: string) {
  let eventCount = 0;
  let avgRating = 0;
  let reviewCount = 0;
  let totalParticipants = 0;

  // Get total events
  try {
    const { count, error } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('organizer_id', organizerId);

    if (!error && count) eventCount = count;
  } catch (e) {
    console.error('Error fetching event count:', e);
  }

  // Get average rating (organizer_reviews 테이블이 없을 수 있음)
  try {
    const { data: reviews, error } = await supabase
      .from('organizer_reviews')
      .select('rating')
      .eq('organizer_id', organizerId);

    if (!error && reviews && reviews.length > 0) {
      avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      reviewCount = reviews.length;
    }
  } catch (e) {
    // 테이블이 없으면 무시
  }

  // Get total participants (event_registrations 테이블이 없을 수 있음)
  try {
    const { data: events } = await supabase
      .from('events')
      .select('id')
      .eq('organizer_id', organizerId);

    if (events && events.length > 0) {
      const { count } = await supabase
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .in('event_id', events.map(e => e.id))
        .eq('payment_status', 'confirmed');

      if (count) totalParticipants = count;
    }
  } catch (e) {
    // 테이블이 없으면 무시
  }

  return {
    totalEvents: eventCount,
    avgRating: Math.round(avgRating * 10) / 10,
    reviewCount,
    totalParticipants,
  };
}

// ==================== Content Creation (for organizers who want to upload videos) ====================

/**
 * Enable content creation for an organizer
 * Changes creator_type to 'both' so they can access creator dashboard
 */
export async function enableContentCreation(organizerId: string) {
  const { data, error } = await supabase
    .from('creators')
    .update({ creator_type: 'both' })
    .eq('id', organizerId)
    .select()
    .single();

  if (error) throw error;
  return transformCreatorToOrganizer(data);
}

/**
 * Fetch all videos (drills, lessons, sparring) by a creator
 * Used for selecting videos to link to events
 */
export async function fetchCreatorVideos(creatorId: string) {
  const [drillsResult, lessonsResult, sparringResult] = await Promise.all([
    supabase
      .from('drills')
      .select('id, title, thumbnail_url, duration, category')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false }),
    supabase
      .from('lessons')
      .select('id, title, thumbnail_url, duration_minutes, category')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false }),
    supabase
      .from('sparring_videos')
      .select('id, title, thumbnail_url, category')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false }),
  ]);

  return {
    drills: drillsResult.data || [],
    lessons: lessonsResult.data || [],
    sparring: sparringResult.data || [],
  };
}

// ==================== Event Videos (for participant access) ====================

export async function linkVideoToEvent(eventId: string, videoData: {
  drillId?: string;
  lessonId?: string;
  sparringId?: string;
  displayOrder?: number;
}) {
  const { data, error } = await supabase
    .from('event_videos')
    .insert([{
      event_id: eventId,
      drill_id: videoData.drillId,
      lesson_id: videoData.lessonId,
      sparring_id: videoData.sparringId,
      display_order: videoData.displayOrder || 0,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchEventVideos(eventId: string) {
  const { data, error } = await supabase
    .from('event_videos')
    .select(`
      *,
      drill:drills(*),
      lesson:lessons(*),
      sparring:sparring_videos(*)
    `)
    .eq('event_id', eventId)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function unlinkVideoFromEvent(eventVideoId: string) {
  const { error } = await supabase
    .from('event_videos')
    .delete()
    .eq('id', eventVideoId);

  if (error) throw error;
}

export async function checkEventVideoAccess(userId: string, contentId: string, contentType: 'drill' | 'lesson' | 'sparring') {
  const { data, error } = await supabase.rpc('check_event_video_access', {
    p_user_id: userId,
    p_content_id: contentId,
    p_content_type: contentType,
  });

  if (error) {
    console.warn('Event video access check failed:', error);
    return false;
  }

  return data === true;
}

// ==================== Excel Export Helper ====================

export async function exportParticipantsToCSV(eventId: string) {
  const { data, error } = await supabase
    .from('event_registrations')
    .select('*')
    .eq('event_id', eventId)
    .eq('payment_status', 'confirmed')
    .order('created_at', { ascending: true });

  if (error) throw error;

  const headers = ['이름', '연락처', '이메일', '띠', '체급', '팀', '계체상태', '신청일'];
  const rows = (data || []).map(r => [
    r.participant_name,
    r.phone || '',
    r.email || '',
    r.belt_level || '',
    r.weight_class || '',
    r.team_name || '',
    r.weigh_in_status === 'passed' ? '완료' : '미완료',
    new Date(r.created_at).toLocaleDateString('ko-KR'),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

// ==================== Calendar URL Generator ====================

export function generateCalendarUrl(event: {
  title: string;
  description?: string;
  eventDate: string;
  startTime?: string;
  endTime?: string;
  address?: string;
}, type: 'google' | 'apple') {
  const startDate = new Date(`${event.eventDate}T${event.startTime || '09:00'}`);
  const endDate = new Date(`${event.eventDate}T${event.endTime || '18:00'}`);

  const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  if (type === 'google') {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
      details: event.description || '',
      location: event.address || '',
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  // Apple/ICS format
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description || ''}`,
    `LOCATION:${event.address || ''}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\n');

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
}
