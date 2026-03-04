package com.grapplay.app.data.remote.dto

import com.grapplay.app.domain.model.Lesson
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class LessonDto(
    val id: String,
    @SerialName("course_id") val courseId: String? = null,
    @SerialName("creator_id") val creatorId: String? = null,
    val title: String,
    val description: String? = null,
    val category: String? = null,
    @SerialName("uniform_type") val uniformType: String? = null,
    @SerialName("lesson_number") val lessonNumber: Int = 0,
    @SerialName("vimeo_url") val vimeoUrl: String? = null,
    @SerialName("thumbnail_url") val thumbnailUrl: String? = null,
    @SerialName("duration_minutes") val durationMinutes: Int? = null,
    val length: String? = null,
    val difficulty: String? = null,
    val views: Int? = 0,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("is_preview") val isPreview: Boolean? = false,
    @SerialName("is_hidden") val isHidden: Boolean? = false,
    @SerialName("course_title") val courseTitle: String? = null,
    @SerialName("creator_name") val creatorName: String? = null,
    @SerialName("creator_profile_image") val creatorProfileImage: String? = null,
    val likes: Int? = 0,
) {
    fun toDomain(
        creatorNameOverride: String? = null,
        creatorImageOverride: String? = null,
    ) = Lesson(
        id = id,
        courseId = courseId,
        creatorId = creatorId,
        title = title,
        description = description ?: "",
        category = category,
        uniformType = uniformType,
        lessonNumber = lessonNumber,
        vimeoUrl = vimeoUrl,
        thumbnailUrl = thumbnailUrl,
        durationMinutes = durationMinutes,
        length = length ?: "",
        difficulty = difficulty,
        views = views ?: 0,
        createdAt = createdAt,
        isPreview = isPreview ?: false,
        courseTitle = courseTitle,
        creatorName = creatorNameOverride ?: creatorName,
        creatorProfileImage = creatorImageOverride ?: creatorProfileImage,
        likes = likes ?: 0,
    )
}
