import { supabase } from './supabase';
import { SkillTreeNode, SkillTreeEdge, UserSkillTree } from '../types';

// ============================================================================
// Transform Functions
// ============================================================================

export function transformUserSkillTree(data: any): UserSkillTree {
    const treeData = data.tree_data || { nodes: [], edges: [] };

    return {
        id: data.id,
        userId: data.user_id,
        title: data.title,
        nodes: treeData.nodes || [],
        edges: treeData.edges || [],
        isPublic: data.is_public,
        isFeatured: data.is_featured,
        views: data.views || 0,
        creatorName: data.users?.name,
        creatorAvatar: data.users?.avatar_url,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        thumbnailUrl: data.thumbnail_url,
        tags: data.tags || []
    };
}

// ============================================================================
// Skill Tree CRUD
// ============================================================================

/**
 * List all public skill trees with creator info
 */
export async function listPublicSkillTrees(limit = 20) {
    // 1. Fetch trees without joining users (to avoid FK error)
    const { data: trees, error } = await supabase
        .from('user_skill_trees')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching public skill trees:', error);
        return { data: [], error };
    }

    if (!trees || trees.length === 0) return { data: [], error: null };

    // 2. Extract unique User IDs
    const userIds = [...new Set(trees.map(t => t.user_id).filter(Boolean))];

    // 3. Fetch Creator Profiles manually
    const { data: users } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .in('id', userIds);

    const userMap = new Map((users || []).map(u => [u.id, u]));

    // 4. Merge Data
    const enrichedData = trees.map(tree => ({
        ...tree,
        users: userMap.get(tree.user_id) || { name: 'Unknown', avatar_url: null }
    }));

    return { data: enrichedData.map(transformUserSkillTree), error: null };
}

/**
 * List featured skill trees
 */
export async function listFeaturedSkillTrees() {
    const { data, error } = await supabase
        .from('user_skill_trees')
        .select('*, users(name, avatar_url)')
        .eq('is_featured', true)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error fetching featured skill trees:', error);
        return { data: [], error };
    }

    return { data: data.map(transformUserSkillTree), error: null };
}

/**
 * Get a single featured chain for the current week
 * Rotating selection based on ISO week number
 */
export async function getWeeklyFeaturedChain() {
    // 1. Get all featured chains
    const { data: featured, error } = await listFeaturedSkillTrees();

    // Fallback to public if no featured
    let candidates = featured || [];
    if (!candidates.length || error) {
        const { data: publicTrees } = await listPublicSkillTrees(50);
        candidates = publicTrees || [];
    }

    if (candidates.length === 0) {
        return { data: null, error: error || new Error('No chains available') };
    }

    // 2. Calculate ISO Week Number
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = (now.getTime() - start.getTime()) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const weekNumber = Math.ceil(dayOfYear / 7);

    // 3. Select consistent index for the week
    const index = weekNumber % candidates.length;

    return { data: candidates[index], error: null };
}

/**
 * Increment view count for a skill tree
 */
export async function incrementSkillTreeViews(treeId: string) {
    const { error } = await supabase.rpc('increment_skill_tree_views', { tree_id: treeId });
    if (error) console.error('Error incrementing views:', error);
}

/**
 * List all skill trees for a user
 */
export async function listUserSkillTrees(userId: string) {
    const { data, error } = await supabase
        .from('user_skill_trees')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error fetching skill tree list:', error);
        return { data: [], error };
    }

    return { data: data.map(transformUserSkillTree), error: null };
}

/**
 * Get specific skill tree by ID
 */
export async function getUserSkillTree(treeId: string) {
    const { data, error } = await supabase
        .from('user_skill_trees')
        .select('*')
        .eq('id', treeId)
        .single();

    if (error) return { data: null, error };
    return { data: transformUserSkillTree(data), error: null };
}

/**
 * Get user's latest skill tree (or create default if none)
 * Used for initial load
 */
export async function getLatestUserSkillTree(userId: string) {
    const { data, error } = await supabase
        .from('user_skill_trees')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('Error fetching latest skill tree:', error);
        return { data: null, error };
    }

    if (!data) {
        // Create default tree
        return createNewSkillTree(userId, '나의 첫 로드맵', [], []);
    }

    return { data: transformUserSkillTree(data), error: null };
}

export async function createNewSkillTree(
    userId: string,
    title: string,
    nodes: SkillTreeNode[] = [],
    edges: SkillTreeEdge[] = [],
    isPublic: boolean = false
) {
    const treeData = { nodes, edges };

    const { data, error } = await supabase
        .from('user_skill_trees')
        .insert({
            user_id: userId,
            title: title,
            tree_data: treeData,
            is_public: isPublic
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating skill tree:', error);
        return { data: null, error };
    }

    return { data: transformUserSkillTree(data), error: null };
}

export async function updateUserSkillTree(
    treeId: string,
    title: string,
    nodes: SkillTreeNode[],
    edges: SkillTreeEdge[],
    isPublic?: boolean
) {
    const treeData = { nodes, edges };

    const updateData: any = {
        title: title,
        tree_data: treeData,
        updated_at: new Date().toISOString()
    };

    if (typeof isPublic === 'boolean') {
        updateData.is_public = isPublic;
    }

    const { data, error } = await supabase
        .from('user_skill_trees')
        .update(updateData)
        .eq('id', treeId)
        .select()
        .single();

    if (error) {
        console.error('Error updating skill tree:', error);
        return { data: null, error };
    }

    return { data: transformUserSkillTree(data), error: null };
}

/**
 * Delete a skill tree
 */
export async function deleteUserSkillTree(treeId: string) {
    const { error } = await supabase
        .from('user_skill_trees')
        .delete()
        .eq('id', treeId);

    return { error };
}

// Legacy support wrapper (Maps old save to update if ID provided, or create)
export async function saveUserSkillTree(
    userId: string,
    nodes: SkillTreeNode[],
    edges: SkillTreeEdge[],
    treeId?: string,
    title: string = '나의 스킬 트리'
) {
    if (treeId) {
        return updateUserSkillTree(treeId, title, nodes, edges);
    } else {
        return createNewSkillTree(userId, title, nodes, edges);
    }
}

/**
 * Copy a public chain to user's library
 * This tracks usage and awards XP to the creator
 */
export async function copyChainToMyLibrary(userId: string, chainId: string) {
    try {
        // Get the original chain
        const { data: originalChain, error: fetchError } = await supabase
            .from('user_skill_trees')
            .select('*')
            .eq('id', chainId)
            .single();

        if (fetchError || !originalChain) {
            return { data: null, error: fetchError || new Error('Chain not found') };
        }

        // Create a copy for the user
        const { data: newChain, error: createError } = await supabase
            .from('user_skill_trees')
            .insert({
                user_id: userId,
                title: `${originalChain.title} (Copy)`,
                tree_data: originalChain.tree_data,
                is_public: false // User's copy is private by default
            })
            .select()
            .single();

        if (createError) {
            return { data: null, error: createError };
        }

        // Track the usage (this will trigger XP award via database trigger)
        const { error: usageError } = await supabase
            .from('chain_usage')
            .insert({
                chain_id: chainId,
                user_id: userId
            });

        // Don't fail if usage tracking fails (e.g., duplicate)
        if (usageError) {
            console.warn('Usage tracking failed:', usageError);
        }

        return { data: transformUserSkillTree(newChain), error: null };
    } catch (error: any) {
        console.error('Error copying chain:', error);
        return { data: null, error };
    }
}

