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
export async function getUserSkillTree(userId: string) {
    const { data, error } = await supabase
        .from('user_skill_trees')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            // No tree exists, create one
            const { data: newTree, error: createError } = await supabase
                .from('user_skill_trees')
                .insert({
                    user_id: userId,
                    tree_data: { nodes: [], edges: [] }
                })
                .select()
                .single();

            if (createError) {
                console.error('Error creating skill tree:', createError);
                return { data: null, error: createError };
            }

            return { data: transformUserSkillTree(newTree), error: null };
        }

        console.error('Error fetching skill tree:', error);
        return { data: null, error };
    }

    return { data: transformUserSkillTree(data), error: null };
}

/**
 * Save/Update user's skill tree
 */
export async function saveUserSkillTree(
    userId: string,
    nodes: SkillTreeNode[],
    edges: SkillTreeEdge[]
) {
    const treeData = { nodes, edges };

    const { data, error } = await supabase
        .from('user_skill_trees')
        .upsert({
            user_id: userId,
            tree_data: treeData
        })
        .select()
        .single();

    if (error) {
        console.error('Error saving skill tree:', error);
        return { data: null, error };
    }

    return { data: transformUserSkillTree(data), error: null };
}

/**
 * Add a technique node to the tree
 */
export async function addTechniqueToTree(
    userId: string,
    techniqueId: string,
    position: { x: number; y: number }
) {
    // Get current tree
    const { data: tree, error: fetchError } = await getUserSkillTree(userId);
    if (fetchError || !tree) {
        return { data: null, error: fetchError };
    }

    // Create new node
    const newNode: SkillTreeNode = {
        id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        techniqueId,
        position,
        type: 'technique'
    };

    // Add to nodes array
    const updatedNodes = [...tree.nodes, newNode];

    // Save
    return await saveUserSkillTree(userId, updatedNodes, tree.edges);
}

/**
 * Update node position
 */
export async function updateNodePosition(
    userId: string,
    nodeId: string,
    position: { x: number; y: number }
) {
    const { data: tree, error: fetchError } = await getUserSkillTree(userId);
    if (fetchError || !tree) {
        return { data: null, error: fetchError };
    }

    const updatedNodes = tree.nodes.map(node =>
        node.id === nodeId ? { ...node, position } : node
    );

    return await saveUserSkillTree(userId, updatedNodes, tree.edges);
}

/**
 * Remove node from tree
 */
export async function removeNodeFromTree(userId: string, nodeId: string) {
    const { data: tree, error: fetchError } = await getUserSkillTree(userId);
    if (fetchError || !tree) {
        return { data: null, error: fetchError };
    }

    // Remove node
    const updatedNodes = tree.nodes.filter(node => node.id !== nodeId);

    // Remove edges connected to this node
    const updatedEdges = tree.edges.filter(
        edge => edge.source !== nodeId && edge.target !== nodeId
    );

    return await saveUserSkillTree(userId, updatedNodes, updatedEdges);
}

/**
 * Add edge (connection) between two nodes
 */
export async function addEdgeToTree(
    userId: string,
    sourceId: string,
    targetId: string,
    animated: boolean = false
) {
    const { data: tree, error: fetchError } = await getUserSkillTree(userId);
    if (fetchError || !tree) {
        return { data: null, error: fetchError };
    }

    // Check if edge already exists
    const edgeExists = tree.edges.some(
        edge => edge.source === sourceId && edge.target === targetId
    );

    if (edgeExists) {
        return { data: tree, error: null };
    }

    // Create new edge
    const newEdge: SkillTreeEdge = {
        id: `edge-${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId,
        type: animated ? 'animated' : 'default'
    };

    const updatedEdges = [...tree.edges, newEdge];

    return await saveUserSkillTree(userId, tree.nodes, updatedEdges);
}

/**
 * Remove edge from tree
 */
export async function removeEdgeFromTree(userId: string, edgeId: string) {
    const { data: tree, error: fetchError } = await getUserSkillTree(userId);
    if (fetchError || !tree) {
        return { data: null, error: fetchError };
    }

    const updatedEdges = tree.edges.filter(edge => edge.id !== edgeId);

    return await saveUserSkillTree(userId, tree.nodes, updatedEdges);
}

/**
 * Update multiple nodes at once (for batch drag operations)
 */
export async function updateMultipleNodePositions(
    userId: string,
    nodeUpdates: { nodeId: string; position: { x: number; y: number } }[]
) {
    const { data: tree, error: fetchError } = await getUserSkillTree(userId);
    if (fetchError || !tree) {
        return { data: null, error: fetchError };
    }

    const updateMap = new Map(nodeUpdates.map(u => [u.nodeId, u.position]));

    const updatedNodes = tree.nodes.map(node => {
        const newPosition = updateMap.get(node.id);
        return newPosition ? { ...node, position: newPosition } : node;
    });

    return await saveUserSkillTree(userId, updatedNodes, tree.edges);
}
