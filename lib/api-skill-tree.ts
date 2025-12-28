import { supabase } from './supabase';
import { SkillTreeNode, SkillTreeEdge, UserSkillTree } from '../types';

// ============================================================================
// Transform Functions
// ============================================================================

function transformUserSkillTree(data: any): UserSkillTree {
    const treeData = data.tree_data || { nodes: [], edges: [] };

    return {
        id: data.id,
        userId: data.user_id,
        title: data.title,
        nodes: treeData.nodes || [],
        edges: treeData.edges || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
}

// ============================================================================
// Skill Tree CRUD
// ============================================================================

/**
 * Get user's skill tree
 * Creates empty tree if doesn't exist
 */
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

/**
 * Create a new skill tree
 */
export async function createNewSkillTree(
    userId: string,
    title: string,
    nodes: SkillTreeNode[] = [],
    edges: SkillTreeEdge[] = []
) {
    const treeData = { nodes, edges };

    const { data, error } = await supabase
        .from('user_skill_trees')
        .insert({
            user_id: userId,
            title: title,
            tree_data: treeData
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating skill tree:', error);
        return { data: null, error };
    }

    return { data: transformUserSkillTree(data), error: null };
}

/**
 * Update existing skill tree
 */
export async function updateUserSkillTree(
    treeId: string,
    title: string,
    nodes: SkillTreeNode[],
    edges: SkillTreeEdge[]
) {
    const treeData = { nodes, edges };

    const { data, error } = await supabase
        .from('user_skill_trees')
        .update({
            title: title,
            tree_data: treeData,
            updated_at: new Date().toISOString()
        })
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


