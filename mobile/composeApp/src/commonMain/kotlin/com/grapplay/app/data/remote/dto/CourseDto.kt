package com.grapplay.app.data.remote.dto

import com.grapplay.app.domain.model.Course
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class CourseDto(
    val id: String,
    val title: String,
    val description: String? = null,
    @SerialName("creator_id") val creatorId: String,
    val category: String? = null,
    val difficulty: String? = null,
    @SerialName("uniform_type") val uniformType: String? = null,
    @SerialName("thumbnail_url") val thumbnailUrl: String? = null,
    val price: Double = 0.0,
    val views: Int = 0,
    @SerialName("created_at") val createdAt: String = "",
    val published: Boolean = true,
    @SerialName("preview_vimeo_id") val previewVimeoId: String? = null,
    @SerialName("is_daily_free") val isDailyFree: Boolean? = false,
    @SerialName("is_hidden") val isHidden: Boolean? = false,
    val rank: Int? = null,
    // Joined fields (from batch creator lookup)
    @SerialName("creator_name") val creatorName: String? = null,
    @SerialName("creator_profile_image") val creatorProfileImage: String? = null,
    // Aggregated fields
    @SerialName("lesson_count") val lessonCount: Int? = null,
) {
    fun toDomain(
        creatorNameOverride: String? = null,
        creatorImageOverride: String? = null,
        lessonCountOverride: Int? = null
    ) = Course(
        id = id,
        title = title,
        description = description ?: "",
        creatorId = creatorId,
        creatorName = creatorNameOverride ?: creatorName ?: "알 수 없음",
        creatorProfileImage = creatorImageOverride ?: creatorProfileImage,
        category = category,
        difficulty = difficulty,
        uniformType = uniformType,
        thumbnailUrl = thumbnailUrl,
        price = price.toInt(),
        views = views,
        lessonCount = lessonCountOverride ?: lessonCount,
        createdAt = createdAt,
        published = published,
        previewVimeoId = previewVimeoId,
        isDailyFree = isDailyFree ?: false,
    )
}
