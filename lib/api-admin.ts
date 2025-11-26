import { supabase } from './supabase';

export interface AdminStats {
    totalUsers: number;
    totalDrills: number;
    pendingCreators: number;
    totalCourses: number;
}

export const getAdminStats = async (): Promise<AdminStats> => {
    try {
        // 1. Total Users
        const { count: totalUsers, error: usersError } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

        if (usersError) throw usersError;

        // 2. Total Drills
        const { count: totalDrills, error: drillsError } = await supabase
            .from('drills')
            .select('*', { count: 'exact', head: true });

        if (drillsError) throw drillsError;

        // 3. Pending Creators
        const { count: pendingCreators, error: creatorsError } = await supabase
            .from('creator_applications')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        if (creatorsError) throw creatorsError;

        // 4. Total Courses
        const { count: totalCourses, error: coursesError } = await supabase
            .from('courses')
            .select('*', { count: 'exact', head: true });

        if (coursesError) throw coursesError;

        return {
            totalUsers: totalUsers || 0,
            totalDrills: totalDrills || 0,
            pendingCreators: pendingCreators || 0,
            totalCourses: totalCourses || 0
        };
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        return {
            totalUsers: 0,
            totalDrills: 0,
            pendingCreators: 0,
            totalCourses: 0
        };
    }
};

// ==================== Content Management ====================

export async function deleteDrill(drillId: string) {
    const { error } = await supabase
        .from('drills')
        .delete()
        .eq('id', drillId);
    return { error };
}

export async function getRoutines() {
    const { data, error } = await supabase
        .from('routines')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching routines:', error);
        return [];
    }
    return data || [];
}

export async function deleteRoutine(routineId: string) {
    const { error } = await supabase
        .from('routines')
        .delete()
        .eq('id', routineId);
    return { error };
}

// ==================== Report Management ====================

export async function getReports() {
    const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        // If table doesn't exist, return empty array
        if (error.code === '42P01') return [];
        console.error('Error fetching reports:', error);
        return [];
    }
    return data || [];
}

export async function updateReportStatus(reportId: string, status: 'resolved' | 'dismissed') {
    const { error } = await supabase
        .from('reports')
        .update({ status, resolved_at: new Date().toISOString() })
        .eq('id', reportId);
    return { error };
}

// ==================== Tournament Management ====================

export async function getTournaments() {
    const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('start_date', { ascending: true });

    if (error) {
        if (error.code === '42P01') return [];
        console.error('Error fetching tournaments:', error);
        return [];
    }
    return data || [];
}

export async function deleteTournament(tournamentId: string) {
    const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', tournamentId);
    return { error };
}
