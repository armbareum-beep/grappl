package com.grapplay.app.domain.model

data class Course(
    val id: String,
    val title: String,
    val description: String,
    val creatorId: String,
    val creatorName: String,
    val creatorProfileImage: String? = null,
    val category: String? = null,
    val difficulty: String? = null,
    val uniformType: String? = null,
    val thumbnailUrl: String? = null,
    val price: Int = 0,
    val views: Int = 0,
    val lessonCount: Int? = null,
    val createdAt: String = "",
    val published: Boolean = true,
    val previewVimeoId: String? = null,
    val isDailyFree: Boolean = false,
)
