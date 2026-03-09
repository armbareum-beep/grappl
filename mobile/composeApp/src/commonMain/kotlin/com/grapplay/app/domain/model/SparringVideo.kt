package com.grapplay.app.domain.model

data class SparringVideo(
    val id: String,
    val creatorId: String,
    val title: String,
    val description: String = "",
    val videoUrl: String = "",
    val thumbnailUrl: String? = null,
    val views: Int = 0,
    val likes: Int = 0,
    val price: Int = 0,
    val category: String? = null,
    val uniformType: String? = null,
    val length: String? = null,
    val createdAt: String? = null,
    val creatorProfileImage: String? = null,
    val isDailyFree: Boolean = false,
)
