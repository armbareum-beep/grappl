import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams, Link } from 'react-router-dom';
import {
    ArrowLeft, Calendar, MapPin, Users, Trophy, Clock, CreditCard,
    Save, Eye, Trash2, Video, Plus, X, Play, Send, UserPlus, Repeat, Search
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { LoadingScreen } from '../../components/LoadingScreen';
import { ImageUploader } from '../../components/ImageUploader';
import { RichTextEditor } from '../../components/RichTextEditor';
import { LocationPicker } from '../../components/explore/LocationPicker';
import { createEvent, updateEvent, fetchEventById, deleteEvent } from '../../lib/api-events';
import { fetchCreatorVideos, fetchEventVideos, linkVideoToEvent, unlinkVideoFromEvent, fetchOrganizerById, fetchInvitationsByEvent, fetchAvailableInstructors, createInvitation, fetchBrandsByCreator } from '../../lib/api-organizers';
import { InstructorInvitation, Event, EventType, PaymentType, Creator, EventBrand } from '../../types';

interface CreatorVideos {
    drills: any[];
    lessons: any[];
    sparring: any[];
}

interface LinkedVideo {
    id: string;
    type: 'drill' | 'lesson' | 'sparring';
    title: string;
    thumbnail_url?: string;
}

const EVENT_TYPES: { value: EventType; label: string; icon: React.ReactNode; color: string }[] = [
    { value: 'competition', label: '시합', icon: <Trophy className="w-6 h-6" />, color: 'border-red-500 bg-red-500/10' },
    { value: 'seminar', label: '세미나', icon: <Users className="w-6 h-6" />, color: 'border-blue-500 bg-blue-500/10' },
    { value: 'openmat', label: '오픈매트', icon: <Calendar className="w-6 h-6" />, color: 'border-green-500 bg-green-500/10' },
];

const REGIONS = ['서울', '경기', '인천', '부산', '대구', '대전', '광주', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];

export const CreateEvent: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, isOrganizer, loading: authLoading } = useAuth();
    const organizerId = user?.id;
    const { success, error: toastError } = useToast();

    const isEditMode = !!id;
    const initialType = (searchParams.get('type') as EventType) || 'competition';

    const [loading, setLoading] = useState(isEditMode);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [organizer, setOrganizer] = useState<Creator | null>(null);
    const [brands, setBrands] = useState<EventBrand[]>([]);
    const [creatorVideos, setCreatorVideos] = useState<CreatorVideos | null>(null);
    const [linkedVideos, setLinkedVideos] = useState<LinkedVideo[]>([]);
    const [showVideoSelector, setShowVideoSelector] = useState(false);
    const [invitations, setInvitations] = useState<InstructorInvitation[]>([]);

    // Instructor selection (for new events)
    const [availableInstructors, setAvailableInstructors] = useState<Creator[]>([]);
    const [selectedInstructors, setSelectedInstructors] = useState<{instructor: Creator, fee: number, message: string}[]>([]);
    const [instructorSearch, setInstructorSearch] = useState('');

    const [formData, setFormData] = useState<{
        type: EventType;
        brandId: string;
        title: string;
        description: string;
        coverImage: string;
        venueName: string;
        address: string;
        addressDetail: string;
        latitude: number | null;
        longitude: number | null;
        region: string;
        eventDate: string;
        startTime: string;
        endTime: string;
        registrationDeadlineDays: string;
        maxParticipants: string;
        price: string;
        paymentType: PaymentType;
        externalPaymentLink: string;
        bankName: string;
        accountNumber: string;
        holderName: string;
        competitionFormat: 'individual' | 'team';
        teamSize: string;
        winsRequired: string;
        status: 'draft' | 'published';
        isRecurring: boolean;
        recurrencePattern: 'weekly' | 'biweekly' | 'monthly' | '';
        recurrenceEndDate: string;
    }>({
        type: initialType,
        brandId: '',
        title: '',
        description: '',
        coverImage: '',
        venueName: '',
        address: '',
        addressDetail: '',
        latitude: null,
        longitude: null,
        region: '',
        eventDate: '',
        startTime: '',
        endTime: '',
        registrationDeadlineDays: '1',
        maxParticipants: '',
        price: '0',
        paymentType: 'free',
        externalPaymentLink: '',
        bankName: '',
        accountNumber: '',
        holderName: '',
        competitionFormat: 'individual',
        teamSize: '3',
        winsRequired: '2',
        status: 'draft',
        isRecurring: false,
        recurrencePattern: '',
        recurrenceEndDate: '',
    });

    useEffect(() => {
        if (isEditMode && id) {
            const loadEvent = async () => {
                try {
                    const event = await fetchEventById(id);

                    setFormData({
                        type: event.type,
                        brandId: event.brandId || '',
                        title: event.title,
                        description: event.description || '',
                        coverImage: event.coverImage || '',
                        venueName: event.venueName || '',
                        address: event.address || '',
                        addressDetail: event.addressDetail || '',
                        latitude: event.latitude || null,
                        longitude: event.longitude || null,
                        region: event.region || '',
                        eventDate: event.eventDate,
                        startTime: event.startTime || '',
                        endTime: event.endTime || '',
                        registrationDeadlineDays: event.registrationDeadlineDays?.toString() || '1',
                        maxParticipants: event.maxParticipants?.toString() || '',
                        price: event.price.toString(),
                        paymentType: event.paymentType,
                        externalPaymentLink: event.externalPaymentLink || '',
                        bankName: event.bankAccount?.bankName || '',
                        accountNumber: event.bankAccount?.accountNumber || '',
                        holderName: event.bankAccount?.holderName || '',
                        competitionFormat: event.competitionFormat || 'individual',
                        teamSize: event.teamSize?.toString() || '3',
                        winsRequired: event.winsRequired?.toString() || '2',
                        status: event.status === 'published' ? 'published' : 'draft',
                        isRecurring: event.isRecurring || false,
                        recurrencePattern: event.recurrencePattern || '',
                        recurrenceEndDate: event.recurrenceEndDate || '',
                    });

                    // Load linked videos separately (may fail if table doesn't exist)
                    try {
                        const eventVideos = await fetchEventVideos(id);
                        const videos: LinkedVideo[] = [];
                        eventVideos.forEach((ev: any) => {
                            if (ev.drill) {
                                videos.push({ id: ev.id, type: 'drill', title: ev.drill.title, thumbnail_url: ev.drill.thumbnail_url });
                            }
                            if (ev.lesson) {
                                videos.push({ id: ev.id, type: 'lesson', title: ev.lesson.title, thumbnail_url: ev.lesson.thumbnail_url });
                            }
                            if (ev.sparring) {
                                videos.push({ id: ev.id, type: 'sparring', title: ev.sparring.title, thumbnail_url: ev.sparring.thumbnail_url });
                            }
                        });
                        setLinkedVideos(videos);
                    } catch (videoError) {
                        console.error('Failed to load event videos:', videoError);
                    }

                    // Load invitations separately
                    try {
                        const invitationsData = await fetchInvitationsByEvent(id);
                        setInvitations(invitationsData);
                    } catch (invError) {
                        console.error('Failed to load invitations:', invError);
                    }
                } catch (error) {
                    console.error('Failed to load event:', error);
                    toastError('이벤트를 불러올 수 없습니다.');
                    navigate('/organizer/dashboard');
                } finally {
                    setLoading(false);
                }
            };
            loadEvent();
        }
    }, [id, isEditMode]);

    // Load organizer info, brands, and videos
    useEffect(() => {
        const loadOrganizerData = async () => {
            if (!organizerId) return;

            try {
                const organizerData = await fetchOrganizerById(organizerId);
                setOrganizer(organizerData);

                if (organizerData.creatorType === 'both') {
                    const videos = await fetchCreatorVideos(organizerId);
                    setCreatorVideos(videos);
                }
            } catch (error) {
                console.error('Failed to load organizer videos:', error);
            }

            // Load brands
            try {
                const brandsData = await fetchBrandsByCreator(organizerId);
                setBrands(brandsData);

                // Set default brand if creating new event and no brand selected
                if (!isEditMode && brandsData.length > 0 && !formData.brandId) {
                    const defaultBrand = brandsData.find(b => b.isDefault) || brandsData[0];
                    setFormData(prev => ({ ...prev, brandId: defaultBrand.id }));
                }
            } catch (error) {
                console.error('Failed to load brands:', error);
            }
        };

        loadOrganizerData();
    }, [organizerId]);

    // Load available instructors for selection (filtered by event type)
    useEffect(() => {
        const loadInstructors = async () => {
            try {
                const instructors = await fetchAvailableInstructors({
                    eventType: formData.type as 'competition' | 'seminar' | 'openmat'
                });
                setAvailableInstructors(instructors);
            } catch (error) {
                console.error('Failed to load instructors:', error);
            }
        };
        loadInstructors();
    }, [formData.type]);

    const handleSelectInstructor = (instructor: Creator) => {
        if (selectedInstructors.find(s => s.instructor.id === instructor.id)) {
            return; // Already selected
        }
        // Use event type-specific minimum fee
        const minFee = formData.type === 'competition' ? (instructor.minCompetitionFee || instructor.minInvitationFee || 0) :
                       formData.type === 'seminar' ? (instructor.minSeminarFee || instructor.minInvitationFee || 0) :
                       formData.type === 'openmat' ? (instructor.minOpenmatFee || instructor.minInvitationFee || 0) :
                       (instructor.minInvitationFee || 0);

        setSelectedInstructors([...selectedInstructors, {
            instructor,
            fee: minFee,
            message: ''
        }]);
    };

    const handleRemoveInstructor = (instructorId: string) => {
        setSelectedInstructors(selectedInstructors.filter(s => s.instructor.id !== instructorId));
    };

    const getMinFeeForInstructor = (instructor: Creator) => {
        return formData.type === 'competition' ? (instructor.minCompetitionFee || instructor.minInvitationFee || 0) :
               formData.type === 'seminar' ? (instructor.minSeminarFee || instructor.minInvitationFee || 0) :
               formData.type === 'openmat' ? (instructor.minOpenmatFee || instructor.minInvitationFee || 0) :
               (instructor.minInvitationFee || 0);
    };

    const handleUpdateInstructorFee = (instructorId: string, fee: number) => {
        setSelectedInstructors(selectedInstructors.map(s => {
            if (s.instructor.id === instructorId) {
                const minFee = getMinFeeForInstructor(s.instructor);
                return { ...s, fee: Math.max(fee, minFee) };
            }
            return s;
        }));
    };

    // Filter by search query and exclude already selected instructors
    const filteredInstructors = availableInstructors.filter(instructor =>
        !selectedInstructors.find(s => s.instructor.id === instructor.id) &&
        (instructorSearch === '' || instructor.name.toLowerCase().includes(instructorSearch.toLowerCase()))
    );

    const handleSave = async (publish: boolean = false) => {
        if (!organizerId) {
            toastError('주최자 권한이 필요합니다.');
            return;
        }

        if (!formData.title.trim()) {
            toastError('이벤트 제목을 입력해주세요.');
            return;
        }

        if (!formData.eventDate) {
            toastError('이벤트 날짜를 선택해주세요.');
            return;
        }

        setSaving(true);

        try {
            const eventData: Partial<Event> = {
                organizerId: organizerId,
                brandId: formData.brandId || undefined,
                type: formData.type,
                title: formData.title,
                description: formData.description,
                coverImage: formData.coverImage,
                venueName: formData.venueName,
                address: formData.address,
                addressDetail: formData.addressDetail,
                latitude: formData.latitude || undefined,
                longitude: formData.longitude || undefined,
                region: formData.region,
                eventDate: formData.eventDate,
                startTime: formData.startTime || undefined,
                endTime: formData.endTime || undefined,
                registrationDeadlineDays: parseInt(formData.registrationDeadlineDays) || 1,
                maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : undefined,
                price: parseInt(formData.price) || 0,
                paymentType: formData.paymentType,
                externalPaymentLink: formData.paymentType === 'external_link' ? formData.externalPaymentLink : undefined,
                bankAccount: formData.paymentType === 'bank_transfer' ? {
                    bankName: formData.bankName,
                    accountNumber: formData.accountNumber,
                    holderName: formData.holderName,
                } : undefined,
                competitionFormat: formData.type === 'competition' ? formData.competitionFormat : undefined,
                teamSize: formData.type === 'competition' && formData.competitionFormat === 'team' ? parseInt(formData.teamSize) : undefined,
                winsRequired: formData.type === 'competition' && formData.competitionFormat === 'team' ? parseInt(formData.winsRequired) : undefined,
                isRecurring: formData.isRecurring,
                recurrencePattern: formData.isRecurring ? formData.recurrencePattern : undefined,
                recurrenceEndDate: formData.isRecurring && formData.recurrenceEndDate ? formData.recurrenceEndDate : undefined,
                status: publish ? 'published' : 'draft',
            };

            if (isEditMode && id) {
                await updateEvent(id, eventData);

                // Send invitations for newly selected instructors
                if (selectedInstructors.length > 0) {
                    for (const selected of selectedInstructors) {
                        try {
                            await createInvitation({
                                eventId: id,
                                organizerId: organizerId,
                                instructorId: selected.instructor.id,
                                proposedFee: selected.fee,
                                invitationMessage: selected.message,
                            });
                        } catch (invError) {
                            console.error('Failed to send invitation:', invError);
                        }
                    }
                    // Reload invitations
                    const updatedInvitations = await fetchInvitationsByEvent(id);
                    setInvitations(updatedInvitations);
                    setSelectedInstructors([]);
                }

                success(publish ? '이벤트가 공개되었습니다!' : '이벤트가 저장되었습니다.');
            } else {
                const newEvent = await createEvent(eventData);

                // Send invitations for selected instructors
                if (selectedInstructors.length > 0) {
                    for (const selected of selectedInstructors) {
                        try {
                            await createInvitation({
                                eventId: newEvent.id,
                                organizerId: organizerId,
                                instructorId: selected.instructor.id,
                                proposedFee: selected.fee,
                                invitationMessage: selected.message,
                            });
                        } catch (invError) {
                            console.error('Failed to send invitation:', invError);
                        }
                    }
                    success(selectedInstructors.length > 0
                        ? `이벤트가 저장되고 ${selectedInstructors.length}명의 지도자에게 초청장을 보냈습니다!`
                        : (publish ? '이벤트가 공개되었습니다!' : '이벤트가 임시저장되었습니다.')
                    );
                } else {
                    success(publish ? '이벤트가 공개되었습니다!' : '이벤트가 임시저장되었습니다.');
                }

                navigate(`/organizer/event/${newEvent.id}/edit`);
            }
        } catch (error: any) {
            toastError(error.message || '저장 중 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!id || !confirm('정말 이 이벤트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

        setDeleting(true);
        try {
            await deleteEvent(id);
            success('이벤트가 삭제되었습니다.');
            navigate('/organizer/dashboard');
        } catch (error: any) {
            toastError(error.message || '삭제 중 오류가 발생했습니다.');
        } finally {
            setDeleting(false);
        }
    };

    const handleLinkVideo = async (videoId: string, type: 'drill' | 'lesson' | 'sparring', title: string, thumbnail_url?: string) => {
        if (!id) {
            toastError('이벤트를 먼저 저장해주세요.');
            return;
        }

        try {
            const videoData = {
                drillId: type === 'drill' ? videoId : undefined,
                lessonId: type === 'lesson' ? videoId : undefined,
                sparringId: type === 'sparring' ? videoId : undefined,
            };

            const result = await linkVideoToEvent(id, videoData);
            setLinkedVideos([...linkedVideos, { id: result.id, type, title, thumbnail_url }]);
            setShowVideoSelector(false);
            success('영상이 연결되었습니다.');
        } catch (error: any) {
            toastError(error.message || '영상 연결 중 오류가 발생했습니다.');
        }
    };

    const handleUnlinkVideo = async (eventVideoId: string) => {
        try {
            await unlinkVideoFromEvent(eventVideoId);
            setLinkedVideos(linkedVideos.filter(v => v.id !== eventVideoId));
            success('영상 연결이 해제되었습니다.');
        } catch (error: any) {
            toastError(error.message || '연결 해제 중 오류가 발생했습니다.');
        }
    };

    const canUploadVideos = organizer?.creatorType === 'both';
    const hasAvailableVideos = creatorVideos && (
        creatorVideos.drills.length > 0 ||
        creatorVideos.lessons.length > 0 ||
        creatorVideos.sparring.length > 0
    );

    if (authLoading || loading) {
        return <LoadingScreen message="불러오는 중..." />;
    }

    if (!user || !isOrganizer) {
        navigate('/home');
        return null;
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-24">
            {/* Header */}
            <div className="bg-zinc-900 border-b border-zinc-800 py-6 px-4 sticky top-0 z-20">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-xl font-bold">
                            {isEditMode ? '이벤트 수정' : '새 이벤트 만들기'}
                        </h1>
                    </div>
                    <div className="flex gap-2">
                        {isEditMode && (
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl font-medium transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span className="hidden sm:inline">삭제</span>
                            </button>
                        )}
                        <button
                            onClick={() => handleSave(false)}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            <span className="hidden sm:inline">임시저장</span>
                        </button>
                        <button
                            onClick={() => handleSave(true)}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-xl font-bold transition-colors"
                        >
                            <Eye className="w-4 h-4" />
                            <span>공개하기</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
                {/* Event Type */}
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-3">이벤트 종류</label>
                    <div className="grid grid-cols-3 gap-3">
                        {EVENT_TYPES.map(({ value, label, icon, color }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setFormData({ ...formData, type: value })}
                                className={`p-4 rounded-xl border-2 transition-all ${
                                    formData.type === value
                                        ? color
                                        : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                                }`}
                            >
                                <div className="flex flex-col items-center gap-2">
                                    {icon}
                                    <span className="font-medium">{label}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Brand Selection */}
                {brands.length > 0 && (
                    <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl p-6">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500 text-sm">🏷</span>
                            이벤트 팀 선택
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            {brands.map((brand) => (
                                <button
                                    key={brand.id}
                                    type="button"
                                    onClick={() => {
                                        setFormData({ ...formData, brandId: brand.id });
                                        // 이벤트 팀 계좌 정보 자동 적용 (이미 입력하지 않은 경우에만)
                                        if (brand.bankAccount && !formData.bankName && !formData.accountNumber) {
                                            setFormData(prev => ({
                                                ...prev,
                                                brandId: brand.id,
                                                bankName: brand.bankAccount?.bankName || '',
                                                accountNumber: brand.bankAccount?.accountNumber || '',
                                                holderName: brand.bankAccount?.holderName || '',
                                            }));
                                        }
                                    }}
                                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                                        formData.brandId === brand.id
                                            ? 'border-amber-500 bg-amber-500/10'
                                            : 'border-zinc-800 bg-zinc-800 hover:border-zinc-700'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-zinc-700 overflow-hidden flex-shrink-0">
                                            {brand.logo ? (
                                                <img src={brand.logo} alt={brand.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-lg font-black text-amber-500">
                                                    {brand.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-medium truncate">{brand.name}</p>
                                            {brand.isDefault && (
                                                <span className="text-xs text-amber-400">기본</span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => navigate('/organizer/event-team/new')}
                                className="p-4 rounded-xl border-2 border-dashed border-zinc-700 hover:border-zinc-600 bg-zinc-900 transition-all flex items-center justify-center gap-2 text-zinc-400 hover:text-zinc-300"
                            >
                                <Plus className="w-5 h-5" />
                                <span>새 팀 추가</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Basic Info */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                    <h2 className="text-lg font-bold mb-4">기본 정보</h2>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">
                            제목 <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-amber-500"
                            placeholder="예: 2026 봄 주짓수 오픈 대회"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">
                            커버 이미지
                        </label>
                        <ImageUploader
                            currentImageUrl={formData.coverImage}
                            onUploadComplete={(url) => setFormData({ ...formData, coverImage: url })}
                            bucketName="hero-images"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">
                            설명
                        </label>
                        <RichTextEditor
                            content={formData.description}
                            onChange={(content) => setFormData({ ...formData, description: content })}
                            placeholder="이벤트에 대한 상세 설명을 작성하세요. 이미지도 삽입할 수 있습니다."
                            bucketName="hero-images"
                        />
                    </div>
                </div>

                {/* Date & Time */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-amber-500" />
                        일시
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">
                                날짜 <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="date"
                                value={formData.eventDate}
                                onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-amber-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">시작 시간</label>
                            <input
                                type="time"
                                value={formData.startTime}
                                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-amber-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">종료 시간</label>
                            <input
                                type="time"
                                value={formData.endTime}
                                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-amber-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">신청 마감</label>
                        <div className="flex items-center gap-3">
                            <span className="text-zinc-400">이벤트</span>
                            <input
                                type="number"
                                value={formData.registrationDeadlineDays}
                                onChange={(e) => setFormData({ ...formData, registrationDeadlineDays: e.target.value })}
                                className="w-20 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-amber-500 text-center"
                                min="0"
                                max="30"
                            />
                            <span className="text-zinc-400">일 전까지</span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">0일 = 당일까지 신청 가능</p>
                    </div>

                    {/* Recurring Event */}
                    <div className="border-t border-zinc-800 pt-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Repeat className="w-5 h-5 text-amber-500" />
                                <span className="font-medium">반복 이벤트</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, isRecurring: !formData.isRecurring })}
                                className={`relative w-12 h-6 rounded-full transition-colors ${
                                    formData.isRecurring ? 'bg-amber-600' : 'bg-zinc-700'
                                }`}
                            >
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                    formData.isRecurring ? 'translate-x-7' : 'translate-x-1'
                                }`} />
                            </button>
                        </div>

                        {formData.isRecurring && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-zinc-800/50 rounded-xl">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">반복 주기</label>
                                    <select
                                        value={formData.recurrencePattern}
                                        onChange={(e) => setFormData({ ...formData, recurrencePattern: e.target.value as any })}
                                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-amber-500"
                                    >
                                        <option value="">선택</option>
                                        <option value="weekly">매주</option>
                                        <option value="biweekly">격주</option>
                                        <option value="monthly">매월</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">반복 종료일</label>
                                    <input
                                        type="date"
                                        value={formData.recurrenceEndDate}
                                        onChange={(e) => setFormData({ ...formData, recurrenceEndDate: e.target.value })}
                                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Location */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-amber-500" />
                        장소
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">장소명</label>
                            <input
                                type="text"
                                value={formData.venueName}
                                onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-amber-500"
                                placeholder="예: 그래플 체육관"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">지역</label>
                            <select
                                value={formData.region}
                                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-amber-500"
                            >
                                <option value="">선택</option>
                                {REGIONS.map(r => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">
                            주소 검색
                            <span className="text-amber-500 ml-1">*</span>
                        </label>
                        <LocationPicker
                            latitude={formData.latitude || undefined}
                            longitude={formData.longitude || undefined}
                            address={formData.address}
                            onChange={({ latitude, longitude, address }) => {
                                setFormData({
                                    ...formData,
                                    latitude,
                                    longitude,
                                    address: address || formData.address,
                                });
                            }}
                        />
                        <p className="text-xs text-zinc-500 mt-1">
                            주소를 검색하거나 지도에서 위치를 선택하세요
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">상세 주소</label>
                        <input
                            type="text"
                            value={formData.addressDetail}
                            onChange={(e) => setFormData({ ...formData, addressDetail: e.target.value })}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-amber-500"
                            placeholder="층, 호수 등 (선택)"
                        />
                    </div>
                </div>

                {/* Participants & Payment */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-amber-500" />
                        참가 & 결제
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">최대 인원</label>
                            <input
                                type="number"
                                value={formData.maxParticipants}
                                onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-amber-500"
                                placeholder="제한 없음"
                                min="1"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">참가비 (원)</label>
                            <input
                                type="number"
                                value={formData.price}
                                onChange={(e) => {
                                    const price = e.target.value;
                                    setFormData({
                                        ...formData,
                                        price,
                                        paymentType: price === '0' ? 'free' : formData.paymentType === 'free' ? 'bank_transfer' : formData.paymentType
                                    });
                                }}
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-amber-500"
                                placeholder="0 = 무료"
                                min="0"
                            />
                        </div>
                    </div>

                    {parseInt(formData.price) > 0 && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">결제 방법</label>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, paymentType: 'bank_transfer' })}
                                        className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                                            formData.paymentType === 'bank_transfer'
                                                ? 'bg-amber-600 text-white'
                                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                        }`}
                                    >
                                        무통장입금
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, paymentType: 'external_link' })}
                                        className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                                            formData.paymentType === 'external_link'
                                                ? 'bg-amber-600 text-white'
                                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                        }`}
                                    >
                                        외부 링크
                                    </button>
                                </div>
                            </div>

                            {formData.paymentType === 'bank_transfer' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-zinc-800/50 rounded-xl">
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-2">은행</label>
                                        <input
                                            type="text"
                                            value={formData.bankName}
                                            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-amber-500"
                                            placeholder="예: 신한은행"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-2">계좌번호</label>
                                        <input
                                            type="text"
                                            value={formData.accountNumber}
                                            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-amber-500"
                                            placeholder="- 없이 입력"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-2">예금주</label>
                                        <input
                                            type="text"
                                            value={formData.holderName}
                                            onChange={(e) => setFormData({ ...formData, holderName: e.target.value })}
                                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-amber-500"
                                            placeholder="예금주 이름"
                                        />
                                    </div>
                                </div>
                            )}

                            {formData.paymentType === 'external_link' && (
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">결제 링크</label>
                                    <input
                                        type="url"
                                        value={formData.externalPaymentLink}
                                        onChange={(e) => setFormData({ ...formData, externalPaymentLink: e.target.value })}
                                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-amber-500"
                                        placeholder="https://..."
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Competition Settings */}
                {formData.type === 'competition' && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-amber-500" />
                            시합 설정
                        </h2>

                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">경기 형식</label>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, competitionFormat: 'individual' })}
                                    className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                                        formData.competitionFormat === 'individual'
                                            ? 'bg-amber-600 text-white'
                                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                    }`}
                                >
                                    개인전
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, competitionFormat: 'team' })}
                                    className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                                        formData.competitionFormat === 'team'
                                            ? 'bg-amber-600 text-white'
                                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                    }`}
                                >
                                    팀전
                                </button>
                            </div>
                        </div>

                        {formData.competitionFormat === 'team' && (
                            <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-800/50 rounded-xl">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">팀 인원</label>
                                    <input
                                        type="number"
                                        value={formData.teamSize}
                                        onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-amber-500"
                                        min="2"
                                        max="10"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">선승 수</label>
                                    <input
                                        type="number"
                                        value={formData.winsRequired}
                                        onChange={(e) => setFormData({ ...formData, winsRequired: e.target.value })}
                                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-amber-500"
                                        min="1"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Event Videos (only show if organizer can upload and event is saved) */}
                {isEditMode && canUploadVideos && (
                    <div className="bg-zinc-900 border border-violet-500/30 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Video className="w-5 h-5 text-violet-500" />
                                행사 영상
                            </h2>
                            {hasAvailableVideos && (
                                <button
                                    type="button"
                                    onClick={() => setShowVideoSelector(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl font-medium text-sm transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    영상 연결
                                </button>
                            )}
                        </div>

                        <p className="text-sm text-zinc-400">
                            참가자(결제 확인됨)에게 무료로 공개할 영상을 연결하세요.
                        </p>

                        {/* Linked Videos */}
                        {linkedVideos.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {linkedVideos.map((video) => (
                                    <div
                                        key={video.id}
                                        className="relative bg-zinc-800 rounded-xl overflow-hidden group"
                                    >
                                        <div className={`${video.type === 'drill' ? 'aspect-[9/16]' : 'aspect-video'} bg-zinc-700`}>
                                            {video.thumbnail_url && (
                                                <img
                                                    src={video.thumbnail_url}
                                                    alt={video.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            )}
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Play className="w-8 h-8 text-white" />
                                            </div>
                                        </div>
                                        <div className="p-2">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                                video.type === 'drill' ? 'bg-violet-500/20 text-violet-400' :
                                                video.type === 'lesson' ? 'bg-blue-500/20 text-blue-400' :
                                                'bg-red-500/20 text-red-400'
                                            }`}>
                                                {video.type === 'drill' ? '드릴' : video.type === 'lesson' ? '레슨' : '스파링'}
                                            </span>
                                            <p className="text-sm font-medium truncate mt-1">{video.title}</p>
                                        </div>
                                        <button
                                            onClick={() => handleUnlinkVideo(video.id)}
                                            className="absolute top-2 right-2 p-1 bg-red-500/80 hover:bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-zinc-800/30 rounded-xl border border-zinc-700/50 border-dashed">
                                <Video className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                                <p className="text-zinc-500 text-sm">연결된 영상이 없습니다</p>
                                {!hasAvailableVideos && (
                                    <p className="text-zinc-600 text-xs mt-2">
                                        크리에이터 대시보드에서 영상을 먼저 업로드하세요
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Instructor Invitation Section (for seminar type) */}
                {isEditMode && formData.type === 'seminar' && (
                    <div className="bg-zinc-900 border border-blue-500/30 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-blue-500" />
                                지도자 초청
                            </h2>
                            <Link
                                to={`/organizer/event/${id}/invite`}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium text-sm transition-colors"
                            >
                                <Send className="w-4 h-4" />
                                지도자 초청하기
                            </Link>
                        </div>

                        <p className="text-sm text-zinc-400">
                            세미나를 위해 지도자를 초청하세요. 초청 수락 시 계좌정보가 공개되어 직접 송금할 수 있습니다.
                        </p>

                        <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
                            <div className="flex items-center gap-2 text-zinc-400">
                                <Users className="w-5 h-5" />
                                <span>초청 현황 및 결제 관리</span>
                            </div>
                            <Link
                                to={`/organizer/event/${id}/invitations`}
                                className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                            >
                                관리하기 →
                            </Link>
                        </div>
                    </div>
                )}

                {/* Video Selector Modal */}
                {showVideoSelector && creatorVideos && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                        <div className="bg-zinc-900 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                                <h3 className="text-lg font-bold">영상 선택</h3>
                                <button
                                    onClick={() => setShowVideoSelector(false)}
                                    className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-6">
                                {/* Drills */}
                                {creatorVideos.drills.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-bold text-violet-400 mb-3">드릴</h4>
                                        <div className="grid grid-cols-3 gap-2">
                                            {creatorVideos.drills.map((drill: any) => {
                                                const isLinked = linkedVideos.some(v => v.type === 'drill' && v.title === drill.title);
                                                return (
                                                    <button
                                                        key={drill.id}
                                                        onClick={() => !isLinked && handleLinkVideo(drill.id, 'drill', drill.title, drill.thumbnail_url)}
                                                        disabled={isLinked}
                                                        className={`text-left bg-zinc-800 rounded-xl overflow-hidden hover:ring-2 ring-violet-500 transition-all ${isLinked ? 'opacity-50' : ''}`}
                                                    >
                                                        <div className="aspect-[9/16] bg-zinc-700">
                                                            {drill.thumbnail_url && (
                                                                <img src={drill.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                                            )}
                                                        </div>
                                                        <p className="p-2 text-xs truncate">{drill.title}</p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Lessons */}
                                {creatorVideos.lessons.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-bold text-blue-400 mb-3">레슨</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {creatorVideos.lessons.map((lesson: any) => {
                                                const isLinked = linkedVideos.some(v => v.type === 'lesson' && v.title === lesson.title);
                                                return (
                                                    <button
                                                        key={lesson.id}
                                                        onClick={() => !isLinked && handleLinkVideo(lesson.id, 'lesson', lesson.title, lesson.thumbnail_url)}
                                                        disabled={isLinked}
                                                        className={`text-left bg-zinc-800 rounded-xl overflow-hidden hover:ring-2 ring-blue-500 transition-all ${isLinked ? 'opacity-50' : ''}`}
                                                    >
                                                        <div className="aspect-video bg-zinc-700">
                                                            {lesson.thumbnail_url && (
                                                                <img src={lesson.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                                            )}
                                                        </div>
                                                        <p className="p-2 text-sm truncate">{lesson.title}</p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Sparring */}
                                {creatorVideos.sparring.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-bold text-red-400 mb-3">스파링</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {creatorVideos.sparring.map((sparring: any) => {
                                                const isLinked = linkedVideos.some(v => v.type === 'sparring' && v.title === sparring.title);
                                                return (
                                                    <button
                                                        key={sparring.id}
                                                        onClick={() => !isLinked && handleLinkVideo(sparring.id, 'sparring', sparring.title, sparring.thumbnail_url)}
                                                        disabled={isLinked}
                                                        className={`text-left bg-zinc-800 rounded-xl overflow-hidden hover:ring-2 ring-red-500 transition-all ${isLinked ? 'opacity-50' : ''}`}
                                                    >
                                                        <div className="aspect-video bg-zinc-700">
                                                            {sparring.thumbnail_url && (
                                                                <img src={sparring.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                                            )}
                                                        </div>
                                                        <p className="p-2 text-sm truncate">{sparring.title}</p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Instructor Invitation Section - At the end */}
                <div className={`${formData.type === 'seminar' ? 'bg-violet-900/20 border-2 border-violet-500' : 'bg-zinc-900 border border-zinc-800'} rounded-2xl p-6 space-y-4`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 ${formData.type === 'seminar' ? 'bg-violet-600/30' : 'bg-zinc-800'} rounded-xl`}>
                                <UserPlus className={`w-6 h-6 ${formData.type === 'seminar' ? 'text-violet-400' : 'text-zinc-400'}`} />
                            </div>
                            <div>
                                <h2 className={`text-lg font-bold ${formData.type === 'seminar' ? 'text-violet-300' : ''}`}>
                                    지도자 초청 {formData.type === 'seminar' && <span className="text-red-400">*</span>}
                                </h2>
                                <p className={`text-sm ${formData.type === 'seminar' ? 'text-violet-400/70' : 'text-zinc-500'}`}>
                                    {formData.type === 'seminar' ? '세미나를 진행할 지도자를 초청하세요' : '지도자를 초청하여 행사의 퀄리티를 높여보세요 (선택)'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Already sent invitations (edit mode) */}
                    {isEditMode && invitations.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm text-zinc-400 font-medium">발송된 초청</p>
                            {invitations.map((inv) => (
                                <div key={inv.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={inv.instructor?.profileImage || '/default-avatar.png'}
                                            alt={inv.instructor?.name}
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                        <div>
                                            <p className="font-medium">{inv.instructor?.name}</p>
                                            <p className="text-sm text-zinc-400">{inv.proposedFee?.toLocaleString()}원</p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                                        inv.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                                        inv.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                        inv.status === 'declined' ? 'bg-red-500/20 text-red-400' :
                                        'bg-zinc-500/20 text-zinc-400'
                                    }`}>
                                        {inv.status === 'accepted' ? '수락됨' :
                                         inv.status === 'pending' ? '대기중' :
                                         inv.status === 'declined' ? '거절됨' : inv.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Selected instructors (to be invited on save) */}
                    {selectedInstructors.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm text-zinc-400 font-medium">저장 시 초청할 지도자</p>
                            {selectedInstructors.map((selected) => {
                                const minFee = getMinFeeForInstructor(selected.instructor);
                                return (
                                <div key={selected.instructor.id} className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={selected.instructor.profileImage || '/default-avatar.png'}
                                            alt={selected.instructor.name}
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                        <div>
                                            <p className="font-medium">{selected.instructor.name}</p>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    value={selected.fee}
                                                    onChange={(e) => handleUpdateInstructorFee(selected.instructor.id, parseInt(e.target.value) || 0)}
                                                    onBlur={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        if (val < minFee) {
                                                            handleUpdateInstructorFee(selected.instructor.id, minFee);
                                                        }
                                                    }}
                                                    className="w-28 px-2 py-1 text-sm bg-zinc-800 border border-zinc-700 rounded-lg focus:border-amber-500 focus:outline-none"
                                                    min={minFee}
                                                />
                                                <span className="text-sm text-zinc-400">원</span>
                                                <span className="text-xs text-zinc-500">(최소 {minFee.toLocaleString()})</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveInstructor(selected.instructor.id)}
                                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Search Input */}
                    {availableInstructors.length > 0 && (
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                            <input
                                type="text"
                                value={instructorSearch}
                                onChange={(e) => setInstructorSearch(e.target.value)}
                                placeholder="지도자 이름으로 검색..."
                                className="w-full pl-10 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm focus:outline-none focus:border-amber-500 placeholder-zinc-500"
                            />
                            {instructorSearch && (
                                <button
                                    onClick={() => setInstructorSearch('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-zinc-700 rounded-full transition-colors"
                                >
                                    <X className="w-3 h-3 text-zinc-400" />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Available Instructors Grid */}
                    {filteredInstructors.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            {filteredInstructors.map((instructor) => {
                                const minFee = formData.type === 'competition' ? (instructor.minCompetitionFee || instructor.minInvitationFee || 0) :
                                               formData.type === 'seminar' ? (instructor.minSeminarFee || instructor.minInvitationFee || 0) :
                                               formData.type === 'openmat' ? (instructor.minOpenmatFee || instructor.minInvitationFee || 0) :
                                               (instructor.minInvitationFee || 0);

                                return (
                                    <button
                                        key={instructor.id}
                                        onClick={() => handleSelectInstructor(instructor)}
                                        className="group bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-amber-500/50 rounded-2xl p-4 transition-all duration-200 text-left"
                                    >
                                        <div className="flex flex-col items-center text-center">
                                            <div className="w-16 h-16 rounded-full overflow-hidden bg-zinc-700 mb-3 ring-2 ring-zinc-600 group-hover:ring-amber-500/50 transition-all">
                                                {instructor.profileImage ? (
                                                    <img
                                                        src={instructor.profileImage}
                                                        alt={instructor.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Users className="w-8 h-8 text-zinc-500" />
                                                    </div>
                                                )}
                                            </div>
                                            <p className="font-bold text-white group-hover:text-amber-400 transition-colors truncate w-full">
                                                {instructor.name}
                                            </p>
                                            <p className="text-xs text-zinc-400 mt-1">
                                                최소 {minFee.toLocaleString()}원
                                            </p>
                                            <div className="mt-3 w-full py-2 bg-amber-600/20 text-amber-400 text-xs font-bold rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-all flex items-center justify-center gap-1">
                                                <Plus className="w-3.5 h-3.5" />
                                                초청
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 bg-zinc-800/30 rounded-xl border border-dashed border-zinc-700">
                            <Users className={`w-12 h-12 ${formData.type === 'seminar' ? 'text-violet-400/50' : 'text-zinc-600'} mx-auto mb-3`} />
                            {instructorSearch ? (
                                <>
                                    <p className="font-medium text-zinc-400">
                                        "{instructorSearch}" 검색 결과가 없습니다
                                    </p>
                                    <button
                                        onClick={() => setInstructorSearch('')}
                                        className="text-xs text-amber-400 hover:text-amber-300 mt-2"
                                    >
                                        검색 초기화
                                    </button>
                                </>
                            ) : (
                                <>
                                    <p className={`font-medium ${formData.type === 'seminar' ? 'text-violet-400/70' : 'text-zinc-400'}`}>
                                        {formData.type === 'competition' ? '시합' : formData.type === 'seminar' ? '세미나' : '오픈매트'} 초청 가능한 지도자가 없습니다
                                    </p>
                                    <p className="text-xs text-zinc-500 mt-1">
                                        지도자들이 초청 설정을 활성화하면 여기에 표시됩니다
                                    </p>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Save Buttons (Mobile) */}
                <div className="md:hidden flex gap-3">
                    <button
                        onClick={() => handleSave(false)}
                        disabled={saving}
                        className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold transition-colors"
                    >
                        임시저장
                    </button>
                    <button
                        onClick={() => handleSave(true)}
                        disabled={saving}
                        className="flex-1 py-4 bg-amber-600 hover:bg-amber-500 rounded-xl font-bold transition-colors"
                    >
                        공개하기
                    </button>
                </div>
            </div>
        </div>
    );
};
