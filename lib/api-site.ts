import { supabase } from './supabase';
import { SiteSettings } from '../types';

/**
 * Lightweight site settings API - separated from api-admin.ts
 * to avoid bundling the entire admin API with Layout.tsx
 */
export async function getSiteSettings() {
    const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', 'default')
        .single();

    if (error) {
        console.error('Error fetching site settings:', error);
        return { data: null, error };
    }

    const settings: SiteSettings = {
        id: data.id,
        logos: data.logos,
        footer: data.footer,
        hero: data.hero,
        sections: data.sections,
        sectionContent: data.section_content,
        updatedAt: data.updated_at
    };

    return { data: settings, error: null };
}
