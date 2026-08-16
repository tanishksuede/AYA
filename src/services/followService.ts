/**
 * followService.ts
 *
 * Secure service layer for the AYA social follow system.
 *
 * Identity model:
 *   - public.users.id  — the application-level UUID (used in follow_requests/follows FK columns)
 *   - auth.uid()       — the Supabase Auth UUID (used by RLS policies)
 *   - public.users.auth_user_id — links the two: auth.uid() → public.users.id
 *
 * The database function get_my_user_id() resolves auth.uid() → public.users.id
 * server-side inside all SECURITY DEFINER RPCs and RLS policies.
 *
 * The client NEVER passes its own user ID to any write operation.
 * Identity is established entirely through the signed Supabase JWT.
 */

import { supabase } from '../utils/supabase';

// ── Error Helper ─────────────────────────────────────────────────────────────

export function formatSupabaseError(error: unknown): string {
  if (!error) return 'Unknown error occurred.';
  if (typeof error === 'string') return error;

  const e = error as any;
  const parts: string[] = [];
  if (e.message) parts.push(e.message);
  if (e.code) parts.push(`(Code: ${e.code})`);
  if (e.details) parts.push(`Details: ${e.details}`);
  if (e.hint) parts.push(`Hint: ${e.hint}`);

  if (parts.length === 0) {
    try { return JSON.stringify(error); } catch { return String(error); }
  }
  return parts.join(' ');
}

// ── Types ────────────────────────────────────────────────────────────────────

export type FollowRequestStatus = 'pending' | 'accepted' | 'rejected';

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
  requester?: PublicUserProfile;
  recipient?: PublicUserProfile;
}

// ── Internal: verify auth session ────────────────────────────────────────────

/**
 * Throws if the caller has no active Supabase Auth session.
 * Does NOT return any user identity — the DB resolves that server-side.
 */
async function requireAuthSession(): Promise<void> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw new Error(formatSupabaseError(error));
  if (!user) {
    throw new Error(
      'Auth session missing. Please log out and log back in to use social features.'
    );
  }
}

// ── Internal: resolve public.users.id for current user ───────────────────────

/**
 * Returns the public.users.id for the currently authenticated user,
 * resolved server-side via get_my_user_id() (auth.uid() → auth_user_id → id).
 */
async function getMyUserId(): Promise<string> {
  await requireAuthSession();

  const { data, error } = await supabase.rpc('get_my_user_id');
  if (error) throw new Error(formatSupabaseError(error));
  if (!data) throw new Error('Could not resolve user identity. Please log out and log back in.');

  return data as string;
}

// ── User Search ───────────────────────────────────────────────────────────────

/**
 * Search for users by username prefix (case-insensitive, strips leading @).
 * Uses the search_users_by_username SECURITY DEFINER RPC which:
 *   - Excludes the calling user (auth_user_id = auth.uid())
 *   - Returns only public fields: id, username, name
 */
export async function searchUsersByUsername(
  query: string
): Promise<PublicUserProfile[]> {
  const clean = query.trim().replace(/^@/, '').toLowerCase();
  if (!clean || clean.length < 2) return [];

  // Try the SECURITY DEFINER RPC first (correctly excludes current user)
  const { data: rpcData, error: rpcError } = await supabase.rpc('search_users_by_username', {
    p_query: clean,
  });

  if (!rpcError && Array.isArray(rpcData)) {
    return rpcData as PublicUserProfile[];
  }

  // RPC not yet applied to DB — fallback to table query (no self-exclusion)
  console.warn('[followService] search_users_by_username RPC unavailable, using fallback:', formatSupabaseError(rpcError));

  const { data, error } = await supabase
    .from('users')
    .select('id, username, name')
    .not('username', 'is', null)
    .is('deleted_at', null)
    .ilike('username', `${clean}%`)
    .order('username')
    .limit(20);

  if (error) throw new Error(formatSupabaseError(error));

  // Client-side self-filter as best-effort (no security implication for search)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const myAppId = user ? await supabase.rpc('get_my_user_id').then((r: { data: string | null }) => r.data) : null;
    if (myAppId) {
      return ((data ?? []) as PublicUserProfile[]).filter((u: PublicUserProfile) => u.id !== myAppId);
    }
  } catch { /* best-effort */ }

  return (data ?? []) as PublicUserProfile[];
}

// ── Follow Requests ───────────────────────────────────────────────────────────

/**
 * Send a follow request.
 * - Requires an active Supabase Auth session (enforced client-side + RLS server-side)
 * - RLS policy: requester_id MUST equal get_my_user_id() — enforced in DB
 * - The client passes only the recipient's public.users.id (not its own)
 */
export async function sendFollowRequest(recipientId: string): Promise<void> {
  const myUserId = await getMyUserId();

  if (myUserId === recipientId) throw new Error('You cannot follow yourself.');

  // Check if already following
  const { data: existingFollow, error: followCheckError } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', myUserId)
    .eq('following_id', recipientId)
    .maybeSingle();

  if (followCheckError) throw new Error(formatSupabaseError(followCheckError));
  if (existingFollow) throw new Error('You are already following this user.');

  // Delete any stale request (e.g., previously rejected)
  await supabase
    .from('follow_requests')
    .delete()
    .eq('requester_id', myUserId)
    .eq('recipient_id', recipientId);

  // INSERT — RLS enforces requester_id = get_my_user_id()
  const { data, error } = await supabase
    .from('follow_requests')
    .insert({ requester_id: myUserId, recipient_id: recipientId, status: 'pending' })
    .select('id, requester_id, recipient_id, status')
    .single();

  if (error) throw new Error(formatSupabaseError(error));

  // Verify inserted row is correct
  if (!data || data.status !== 'pending' || data.requester_id !== myUserId || data.recipient_id !== recipientId) {
    throw new Error('Database verification failed after follow_requests insert.');
  }
}

/**
 * Get all incoming pending follow requests for the current user.
 * Uses 2-step query to avoid PostgREST FK join failures.
 */
export async function getIncomingFollowRequests(): Promise<FollowRequest[]> {
  const myUserId = await getMyUserId();

  const { data: requestRows, error: requestError } = await supabase
    .from('follow_requests')
    .select('id, requester_id, recipient_id, status, created_at, responded_at')
    .eq('recipient_id', myUserId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (requestError) throw new Error(formatSupabaseError(requestError));
  if (!requestRows?.length) return [];

  const requesterIds = [...new Set((requestRows as any[]).map(r => r.requester_id))];

  const { data: userRows, error: userError } = await supabase
    .from('users')
    .select('id, username, name')
    .in('id', requesterIds)
    .is('deleted_at', null);

  if (userError) throw new Error(formatSupabaseError(userError));

  const userMap = new Map(((userRows as any[]) ?? []).map(u => [u.id, u as PublicUserProfile]));

  return (requestRows as any[]).map(r => ({
    id: r.id,
    requester_id: r.requester_id,
    recipient_id: r.recipient_id,
    status: r.status as FollowRequestStatus,
    created_at: r.created_at,
    responded_at: r.responded_at,
    requester: userMap.get(r.requester_id),
  }));
}

/**
 * Accept a pending follow request.
 * Calls accept_follow_request() SECURITY DEFINER RPC — the DB verifies the
 * caller is the recipient via get_my_user_id() and auth.uid().
 */
export async function acceptFollowRequest(requestId: string): Promise<void> {
  await requireAuthSession();

  const { error } = await supabase.rpc('accept_follow_request', { p_request_id: requestId });
  if (error) throw new Error(formatSupabaseError(error));
}

/**
 * Reject a pending follow request.
 * Calls reject_follow_request() SECURITY DEFINER RPC — same auth guarantee.
 */
export async function rejectFollowRequest(requestId: string): Promise<void> {
  await requireAuthSession();

  const { error } = await supabase.rpc('reject_follow_request', { p_request_id: requestId });
  if (error) throw new Error(formatSupabaseError(error));
}

/**
 * Cancel an outgoing (sent) follow request.
 * RLS policy allows DELETE where requester_id = get_my_user_id().
 */
export async function cancelFollowRequest(requestId: string): Promise<void> {
  await requireAuthSession();

  const { error } = await supabase
    .from('follow_requests')
    .delete()
    .eq('id', requestId);

  if (error) throw new Error(formatSupabaseError(error));
}

// ── Follows ───────────────────────────────────────────────────────────────────

/**
 * Unfollow a user.
 * RLS policy allows DELETE where follower_id = get_my_user_id().
 */
export async function unfollowUser(followingId: string): Promise<void> {
  const myUserId = await getMyUserId();

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', myUserId)
    .eq('following_id', followingId);

  if (error) throw new Error(formatSupabaseError(error));
}

export async function getFollowerCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', userId);

  if (error) throw new Error(formatSupabaseError(error));
  return count ?? 0;
}

export async function getFollowingCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', userId);

  if (error) throw new Error(formatSupabaseError(error));
  return count ?? 0;
}

// ── Relationship State ────────────────────────────────────────────────────────

/**
 * Determine the follow relationship state between two public.users.id values.
 * currentUserId is the logged-in user's public.users.id (from Zustand store).
 */
export async function getFollowStatus(
  currentUserId: string,
  targetUserId: string
): Promise<FollowRelationshipState> {
  if (currentUserId === targetUserId) return 'NONE';

  const { data: followRow, error: followError } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', currentUserId)
    .eq('following_id', targetUserId)
    .maybeSingle();

  if (followError) throw new Error(formatSupabaseError(followError));
  if (followRow) return 'FOLLOWING';

  const { data: outgoingRow, error: outgoingError } = await supabase
    .from('follow_requests')
    .select('id')
    .eq('requester_id', currentUserId)
    .eq('recipient_id', targetUserId)
    .eq('status', 'pending')
    .maybeSingle();

  if (outgoingError) throw new Error(formatSupabaseError(outgoingError));
  if (outgoingRow) return 'REQUEST_SENT';

  const { data: incomingRow, error: incomingError } = await supabase
    .from('follow_requests')
    .select('id')
    .eq('requester_id', targetUserId)
    .eq('recipient_id', currentUserId)
    .eq('status', 'pending')
    .maybeSingle();

  if (incomingError) throw new Error(formatSupabaseError(incomingError));
  if (incomingRow) return 'INCOMING_REQUEST';

  return 'NONE';
}

/**
 * Get the pending follow request ID where the current user is the RECIPIENT
 * and targetUserId is the REQUESTER. Used for Accept/Reject actions.
 */
export async function getIncomingRequestId(targetUserId: string): Promise<string | null> {
  const myUserId = await getMyUserId();

  const { data, error } = await supabase
    .from('follow_requests')
    .select('id')
    .eq('requester_id', targetUserId)
    .eq('recipient_id', myUserId)
    .eq('status', 'pending')
    .maybeSingle();

  if (error) throw new Error(formatSupabaseError(error));
  return data?.id ?? null;
}

/**
 * Get the pending follow request ID where the current user is the REQUESTER
 * and targetUserId is the RECIPIENT. Used for Cancel action.
 */
export async function getOutgoingRequestId(targetUserId: string): Promise<string | null> {
  const myUserId = await getMyUserId();

  const { data, error } = await supabase
    .from('follow_requests')
    .select('id')
    .eq('requester_id', myUserId)
    .eq('recipient_id', targetUserId)
    .eq('status', 'pending')
    .maybeSingle();

  if (error) throw new Error(formatSupabaseError(error));
  return data?.id ?? null;
}