/**
 * followService.ts
 *
 * Clean service layer for the AYA social follow system.
 * Uses the existing Supabase client — no separate configuration.
 *
 * Security note:
 *  - acceptFollowRequest() and rejectFollowRequest() use SECURITY DEFINER RPCs
 *    that verify auth.uid() server-side. The frontend never writes to `follows`
 *    directly; only the RPC does.
 *  - searchUsersByUsername() uses a SECURITY DEFINER RPC that returns only
 *    safe public fields (id, username, name) and excludes the calling user.
 */

import { supabase } from '../utils/supabase';

// ── Types ────────────────────────────────────────────────────────────────────

export type FollowRequestStatus = 'pending' | 'accepted' | 'rejected';

/**
 * The relationship state from the perspective of the current user
 * looking at another user's profile.
 */
export type FollowRelationshipState =
  | 'NONE'
  | 'REQUEST_SENT'
  | 'INCOMING_REQUEST'
  | 'FOLLOWING';

export interface PublicUserProfile {
  id: string;
  username: string;
  name: string;
}

export interface FollowRequest {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: FollowRequestStatus;
  created_at: string;
  responded_at: string | null;

  /** Requester's public profile */
  requester?: PublicUserProfile;

  /** Recipient's public profile */
  recipient?: PublicUserProfile;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;

  /** Joined profile */
  follower?: PublicUserProfile;
  following?: PublicUserProfile;
}

// ── User Search ───────────────────────────────────────────────────────────────

/**
 * Search for users by username (case-insensitive, strips leading @).
 * Uses SECURITY DEFINER RPC — only returns id, username, name.
 * Excludes the calling user from results.
 */
export async function searchUsersByUsername(
  query: string
): Promise<PublicUserProfile[]> {
  const { data, error } = await supabase.rpc('search_users_by_username', {
    p_query: query,
  });

  if (error) throw error;

  return (data ?? []) as PublicUserProfile[];
}

// ── Follow Requests ───────────────────────────────────────────────────────────

/**
 * Send a follow request to another user.
 *
 * requester_id is explicitly taken from the authenticated Supabase user.
 * This is required because the database RLS policy checks:
 *
 * requester_id = auth.uid()
 */
export async function sendFollowRequest(
  recipientId: string
): Promise<void> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    throw new Error(
      'You must be logged in to send a follow request.'
    );
  }

  if (user.id === recipientId) {
    throw new Error('You cannot follow yourself.');
  }

  const { error } = await supabase
    .from('follow_requests')
    .insert({
      requester_id: user.id,
      recipient_id: recipientId,
      status: 'pending',
    });

  if (error) {
    throw error;
  }
}

/**
 * Get all incoming pending follow requests for the current user.
 * Joins requester profile data for display.
 */
export async function getIncomingFollowRequests(): Promise<FollowRequest[]> {
  const { data, error } = await supabase
    .from('follow_requests')
    .select(`
      id,
      requester_id,
      recipient_id,
      status,
      created_at,
      responded_at,
      requester:users!follow_requests_requester_id_fkey(
        id,
        username,
        name
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    ...row,
    requester: row.requester ?? undefined,
  })) as FollowRequest[];
}

/**
 * Get all outgoing pending follow requests from the current user.
 * Joins recipient profile data for display.
 */
export async function getOutgoingFollowRequests(): Promise<FollowRequest[]> {
  const { data, error } = await supabase
    .from('follow_requests')
    .select(`
      id,
      requester_id,
      recipient_id,
      status,
      created_at,
      responded_at,
      recipient:users!follow_requests_recipient_id_fkey(
        id,
        username,
        name
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    ...row,
    recipient: row.recipient ?? undefined,
  })) as FollowRequest[];
}

/**
 * Accept a pending follow request.
 *
 * Calls the SECURITY DEFINER RPC which:
 *   1. Verifies auth.uid() = recipient_id
 *   2. Verifies status = 'pending'
 *   3. Updates status → 'accepted'
 *   4. Inserts into public.follows
 *
 * All in one atomic transaction.
 */
export async function acceptFollowRequest(
  requestId: string
): Promise<void> {
  const { error } = await supabase.rpc('accept_follow_request', {
    p_request_id: requestId,
  });

  if (error) throw error;
}

/**
 * Reject a pending follow request.
 *
 * Calls the SECURITY DEFINER RPC which verifies
 * auth.uid() = recipient_id.
 */
export async function rejectFollowRequest(
  requestId: string
): Promise<void> {
  const { error } = await supabase.rpc('reject_follow_request', {
    p_request_id: requestId,
  });

  if (error) throw error;
}

/**
 * Cancel an outgoing follow request.
 *
 * The requester can delete their own request through RLS.
 */
export async function cancelFollowRequest(
  requestId: string
): Promise<void> {
  const { error } = await supabase
    .from('follow_requests')
    .delete()
    .eq('id', requestId);

  if (error) throw error;
}

// ── Follows ───────────────────────────────────────────────────────────────────

/**
 * Unfollow a user.
 * The current user removes their own following relationship.
 */
export async function unfollowUser(
  followingId: string
): Promise<void> {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('following_id', followingId);

  if (error) throw error;
}

/**
 * Get all followers of a given user.
 */
export async function getFollowers(
  targetUserId: string
): Promise<PublicUserProfile[]> {
  const { data, error } = await supabase
    .from('follows')
    .select(`
      follower:users!follows_follower_id_fkey(
        id,
        username,
        name
      )
    `)
    .eq('following_id', targetUserId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? [])
    .map((row: any) => row.follower)
    .filter(Boolean) as PublicUserProfile[];
}

/**
 * Get all users that targetUserId is following.
 */
export async function getFollowing(
  targetUserId: string
): Promise<PublicUserProfile[]> {
  const { data, error } = await supabase
    .from('follows')
    .select(`
      following:users!follows_following_id_fkey(
        id,
        username,
        name
      )
    `)
    .eq('follower_id', targetUserId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? [])
    .map((row: any) => row.following)
    .filter(Boolean) as PublicUserProfile[];
}

/**
 * Get the number of followers for a user.
 */
export async function getFollowerCount(
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('follows')
    .select('*', {
      count: 'exact',
      head: true,
    })
    .eq('following_id', userId);

  if (error) throw error;

  return count ?? 0;
}

/**
 * Get the number of users a given user is following.
 */
export async function getFollowingCount(
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('follows')
    .select('*', {
      count: 'exact',
      head: true,
    })
    .eq('follower_id', userId);

  if (error) throw error;

  return count ?? 0;
}

// ── Relationship State ────────────────────────────────────────────────────────

/**
 * Determine the relationship state between the current user
 * and a target user.
 */
export async function getFollowStatus(
  currentUserId: string,
  targetUserId: string
): Promise<FollowRelationshipState> {
  if (currentUserId === targetUserId) {
    return 'NONE';
  }

  // Check existing follow relationship first.
  const { data: followRow, error: followError } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', currentUserId)
    .eq('following_id', targetUserId)
    .maybeSingle();

  if (followError) {
    throw followError;
  }

  if (followRow) {
    return 'FOLLOWING';
  }

  // Check pending follow requests in both directions.
  const { data: requestRow, error: requestError } = await supabase
    .from('follow_requests')
    .select(
      'id, requester_id, recipient_id, status'
    )
    .eq('status', 'pending')
    .or(
      `and(requester_id.eq.${currentUserId},recipient_id.eq.${targetUserId}),` +
      `and(requester_id.eq.${targetUserId},recipient_id.eq.${currentUserId})`
    )
    .maybeSingle();

  if (requestError) {
    throw requestError;
  }

  if (requestRow) {
    if (requestRow.requester_id === currentUserId) {
      return 'REQUEST_SENT';
    }

    if (requestRow.recipient_id === currentUserId) {
      return 'INCOMING_REQUEST';
    }
  }

  return 'NONE';
}

/**
 * Get the pending follow request ID where the current user
 * is the recipient and targetUserId is the requester.
 */
export async function getIncomingRequestId(
  targetUserId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('follow_requests')
    .select('id')
    .eq('requester_id', targetUserId)
    .eq('status', 'pending')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id ?? null;
}

/**
 * Get the pending follow request ID where the current user
 * is the requester and targetUserId is the recipient.
 */
export async function getOutgoingRequestId(
  targetUserId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('follow_requests')
    .select('id')
    .eq('recipient_id', targetUserId)
    .eq('status', 'pending')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id ?? null;
}