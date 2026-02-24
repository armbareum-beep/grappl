
// ==================== Site Settings ====================

export interface SiteSettings {
    id: string;
    logos: {
        main: string;
        dark: string;
        favicon: string;
    };
    footer: {
        companyName: string;
        address: string;
        email: string;
        phone: string;
        registrationNumber: string;
    };
    hero: {
        title: string;
        subtitle: string;
        mediaUrl: string;
        mediaType: 'image' | 'video';
    };
    updatedAt: string;
}
