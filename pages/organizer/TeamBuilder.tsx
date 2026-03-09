import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, Plus, Trash2, GripVertical, Save,
  RefreshCw, CheckCircle, AlertCircle
} from 'lucide-react';
import {
  Event, CompetitionCategory, EventRegistration, CompetitionTeam
} from '../../types';
import {
  fetchEventById, fetchCategories, fetchRegistrations,
  fetchTeams, createTeam
} from '../../lib/api-events';
import { supabase } from '../../lib/supabase';

interface TeamDraft {
  id?: string;
  teamName: string;
  memberIds: string[];
}

export function TeamBuilder() {
  const { eventId, categoryId } = useParams<{ eventId: string; categoryId: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<Event | null>(null);
  const [category, setCategory] = useState<CompetitionCategory | null>(null);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [existingTeams, setExistingTeams] = useState<CompetitionTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Draft teams being edited
  const [teams, setTeams] = useState<TeamDraft[]>([]);

  useEffect(() => {
    if (eventId && categoryId) {
      loadData();
    }
  }, [eventId, categoryId]);

  const loadData = async () => {
    if (!eventId || !categoryId) return;

    try {
      setLoading(true);
      const [eventData, categoriesData, registrationsData, teamsData] = await Promise.all([
        fetchEventById(eventId),
        fetchCategories(eventId),
        fetchRegistrations(eventId),
        fetchTeams(categoryId),
      ]);

      setEvent(eventData);
      const cat = categoriesData.find(c => c.id === categoryId);
      setCategory(cat || null);

      // Only confirmed participants with weigh-in passed
      const confirmed = registrationsData.filter(r =>
        r.paymentStatus === 'confirmed' &&
        r.weighInStatus === 'passed' &&
        !r.cancelledAt
      );
      setRegistrations(confirmed);
      setExistingTeams(teamsData);

      // Convert existing teams to draft format
      setTeams(teamsData.map(t => ({
        id: t.id,
        teamName: t.teamName,
        memberIds: t.memberIds,
      })));
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Get participants that are not assigned to any team
  const unassignedParticipants = registrations.filter(r =>
    !teams.some(t => t.memberIds.includes(r.id))
  );

  // Add new empty team
  const addTeam = () => {
    setTeams([...teams, {
      teamName: `팀 ${teams.length + 1}`,
      memberIds: [],
    }]);
  };

  // Remove team
  const removeTeam = (index: number) => {
    setTeams(teams.filter((_, i) => i !== index));
  };

  // Update team name
  const updateTeamName = (index: number, name: string) => {
    const updated = [...teams];
    updated[index].teamName = name;
    setTeams(updated);
  };

  // Add member to team
  const addMemberToTeam = (teamIndex: number, participantId: string) => {
    const teamSize = event?.teamSize || 3;
    if (teams[teamIndex].memberIds.length >= teamSize) {
      alert(`팀 최대 인원(${teamSize}명)을 초과할 수 없습니다.`);
      return;
    }

    const updated = [...teams];
    updated[teamIndex].memberIds.push(participantId);
    setTeams(updated);
  };

  // Remove member from team
  const removeMemberFromTeam = (teamIndex: number, participantId: string) => {
    const updated = [...teams];
    updated[teamIndex].memberIds = updated[teamIndex].memberIds.filter(id => id !== participantId);
    setTeams(updated);
  };

  // Move member within team (reorder)
  const moveMember = (teamIndex: number, fromIdx: number, toIdx: number) => {
    const updated = [...teams];
    const members = [...updated[teamIndex].memberIds];
    const [removed] = members.splice(fromIdx, 1);
    members.splice(toIdx, 0, removed);
    updated[teamIndex].memberIds = members;
    setTeams(updated);
  };

  // Get participant by ID
  const getParticipant = (id: string) => {
    return registrations.find(r => r.id === id);
  };

  // Get position label (선봉, 중견, 대장, etc.)
  const getPositionLabel = (index: number, total: number) => {
    if (total === 3) {
      return ['선봉', '중견', '대장'][index] || `${index + 1}번`;
    } else if (total === 5) {
      return ['선봉', '차봉', '중견', '부장', '대장'][index] || `${index + 1}번`;
    }
    return `${index + 1}번`;
  };

  // Save all teams
  const handleSave = async () => {
    if (!categoryId) return;

    // Validate teams
    const teamSize = event?.teamSize || 3;
    for (const team of teams) {
      if (!team.teamName.trim()) {
        alert('팀 이름을 입력해주세요.');
        return;
      }
      if (team.memberIds.length !== teamSize) {
        alert(`모든 팀은 ${teamSize}명으로 구성되어야 합니다.`);
        return;
      }
    }

    try {
      setSaving(true);

      // Delete existing teams for this category
      await supabase
        .from('competition_teams')
        .delete()
        .eq('category_id', categoryId);

      // Create new teams
      for (const team of teams) {
        await createTeam({
          categoryId,
          teamName: team.teamName,
          memberIds: team.memberIds,
          memberOrder: team.memberIds,
        });
      }

      alert('팀 구성이 저장되었습니다.');
      navigate(-1);
    } catch (err) {
      console.error('Failed to save teams:', err);
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !event || !category) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <p className="text-red-400 mb-4">{error || '카테고리를 찾을 수 없습니다.'}</p>
        <button
          onClick={() => navigate(-1)}
          className="text-amber-500 hover:text-amber-400"
        >
          돌아가기
        </button>
      </div>
    );
  }

  const teamSize = event.teamSize || 3;

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-amber-500/20 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              팀 구성
            </h1>
            <p className="text-sm text-zinc-400">{category.name} ({teamSize}인 팀전)</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-bold transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Unassigned Participants */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              미배정 참가자 ({unassignedParticipants.length}명)
            </h2>

            {unassignedParticipants.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">모든 참가자가 배정되었습니다</p>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {unassignedParticipants.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between bg-zinc-800 rounded-xl p-3"
                  >
                    <div>
                      <p className="font-medium">{p.participantName}</p>
                      <div className="flex gap-2 text-xs text-zinc-400 mt-1">
                        {p.teamName && <span>{p.teamName}</span>}
                        {p.beltLevel && <span className="px-1.5 py-0.5 bg-zinc-700 rounded">{p.beltLevel}</span>}
                        {p.weightClass && <span className="px-1.5 py-0.5 bg-zinc-700 rounded">{p.weightClass}</span>}
                      </div>
                    </div>
                    {teams.length > 0 && (
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            addMemberToTeam(parseInt(e.target.value), p.id);
                            e.target.value = '';
                          }
                        }}
                        className="bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-1.5 text-sm"
                        defaultValue=""
                      >
                        <option value="">팀 선택</option>
                        {teams.map((team, idx) => (
                          <option
                            key={idx}
                            value={idx}
                            disabled={team.memberIds.length >= teamSize}
                          >
                            {team.teamName} ({team.memberIds.length}/{teamSize})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Teams */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">팀 목록 ({teams.length}팀)</h2>
              <button
                onClick={addTeam}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                팀 추가
              </button>
            </div>

            {teams.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
                <Users className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-400">팀이 없습니다</p>
                <button
                  onClick={addTeam}
                  className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-bold transition-colors"
                >
                  첫 팀 만들기
                </button>
              </div>
            ) : (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {teams.map((team, teamIndex) => (
                  <div
                    key={teamIndex}
                    className={`bg-zinc-900 border rounded-2xl p-4 ${
                      team.memberIds.length === teamSize
                        ? 'border-green-500/30'
                        : 'border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <input
                        type="text"
                        value={team.teamName}
                        onChange={(e) => updateTeamName(teamIndex, e.target.value)}
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 font-bold focus:outline-none focus:border-amber-500"
                      />
                      <span className={`px-2 py-1 rounded-lg text-sm font-bold ${
                        team.memberIds.length === teamSize
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {team.memberIds.length}/{teamSize}
                      </span>
                      <button
                        onClick={() => removeTeam(teamIndex)}
                        className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Team Members */}
                    <div className="space-y-2">
                      {team.memberIds.map((memberId, memberIndex) => {
                        const participant = getParticipant(memberId);
                        return (
                          <div
                            key={memberId}
                            className="flex items-center gap-3 bg-zinc-800 rounded-xl p-3"
                          >
                            <GripVertical className="w-4 h-4 text-zinc-500 cursor-move" />
                            <span className="w-12 text-xs font-bold text-amber-500">
                              {getPositionLabel(memberIndex, teamSize)}
                            </span>
                            <span className="flex-1 font-medium">
                              {participant?.participantName || '알 수 없음'}
                            </span>
                            <div className="flex gap-1">
                              {memberIndex > 0 && (
                                <button
                                  onClick={() => moveMember(teamIndex, memberIndex, memberIndex - 1)}
                                  className="p-1 hover:bg-zinc-700 rounded text-xs"
                                >
                                  ↑
                                </button>
                              )}
                              {memberIndex < team.memberIds.length - 1 && (
                                <button
                                  onClick={() => moveMember(teamIndex, memberIndex, memberIndex + 1)}
                                  className="p-1 hover:bg-zinc-700 rounded text-xs"
                                >
                                  ↓
                                </button>
                              )}
                            </div>
                            <button
                              onClick={() => removeMemberFromTeam(teamIndex, memberId)}
                              className="p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}

                      {/* Empty slots */}
                      {Array.from({ length: teamSize - team.memberIds.length }).map((_, i) => (
                        <div
                          key={`empty-${i}`}
                          className="flex items-center gap-3 bg-zinc-800/50 border border-dashed border-zinc-700 rounded-xl p-3"
                        >
                          <span className="w-12 text-xs font-bold text-zinc-600">
                            {getPositionLabel(team.memberIds.length + i, teamSize)}
                          </span>
                          <span className="text-zinc-500 text-sm">빈 자리</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <h3 className="font-bold text-amber-400 mb-2">팀전 규칙</h3>
          <ul className="text-sm text-zinc-400 space-y-1">
            <li>• 각 팀은 {teamSize}명으로 구성됩니다.</li>
            <li>• {event.winsRequired || 2}선 선승제로 진행됩니다.</li>
            <li>• 순서대로 선봉부터 출전합니다.</li>
            <li>• 계체를 통과한 참가자만 팀에 배정할 수 있습니다.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
