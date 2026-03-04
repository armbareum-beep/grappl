package com.grapplay.app.domain.model

data class Lesson(
    val id: String,
    val courseId: String? = null,
    val creatorId: String? = null,
    val title: String,
    val description: String = "",
    val category: String? = null,
    val uniformType: String? = null,
    val lessonNumber: Int = 0,
    val vimeoUrl: String? = null,
    val thumbnailUrl: String? = null,
    val durationMinutes: Int? = null,
    val length: String = "",
    val difficulty: String? = null,
    val views: Int = 0,
    val createdAt: String = "",
    val isPreview: Boolean = false,
    val courseTitle: String? = null,
    val creatorName: String? = null,
    val creatorProfileImage: String? = null,
    val likes: Int = 0,
)
