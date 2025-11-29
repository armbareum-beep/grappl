// This is a reference file showing the key changes needed
// The main changes are:

// 1. Add useEffect to show modal when shareModalData is set:
useEffect(() => {
    if (shareModalData && !showQuestModal && !loading) {
        console.log('useEffect: shareModalData changed, showing share modal');
        setShowShareModal(true);
    }
}, [shareModalData, showQuestModal, loading]);

// 2. In handleSubmit, after setShareModalData(), just set XP modal if needed:
// Show Quest Complete Modal first (only if XP was earned)
if (earnedXp > 0) {
    setXpEarned(earnedXp);
    setShowQuestModal(true);
}
// If earnedXp === 0, the useEffect will automatically show share modal

// 3. No setTimeout needed - useEffect handles the timing automatically
