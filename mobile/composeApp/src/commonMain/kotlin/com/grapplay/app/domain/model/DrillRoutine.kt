package com.grapplay.app.domain.model

data class DrillRoutine(
    val id: String,
    val title: String,
    val description: String = "",
    val creatorId: String,
    val creatorName: String? = null,
    val creatorProfileImage: String? = null,
    val category: String? = null,
    val difficulty: String? = null,
    val uniformType: String? = null,
    val thumbnailUrl: String? = null,
    val price: Int = 0,
    val views: Int = 0,
    val drillCount: Int = 0,
    val totalDurationMinutes: Int = 0,
    val likes: Int = 0,
    val createdAt: String = "",
    val isDailyFree: Boolean = false,
    val drills: List<Drill> = emptyList(),
)
