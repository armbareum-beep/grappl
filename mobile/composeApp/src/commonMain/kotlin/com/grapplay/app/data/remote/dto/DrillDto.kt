package com.grapplay.app.data.remote.dto

import com.grapplay.app.domain.model.Drill
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class DrillDto(
    val id: String,
    val title: String,
    val description: String? = null,
    @SerialName("creator_id") val creatorId: String,
    @SerialName("creator_name") val creatorName: String? = null,
    @SerialName("creator_profile_image") val creatorProfileImage: String? = null,
    val category: String? = null,
    val difficulty: String? = null,
    @SerialName("uniform_type") val uniformType: String? = null,
    @SerialName("thumbnail_url") val thumbnailUrl: String? = null,
    @SerialName("video_url") val videoUrl: String? = null,
    @SerialName("vimeo_url") val vimeoUrl: String? = null,
    @SerialName("duration_minutes") val durationMinutes: Int? = 0,
    val length: String? = null,
    val price: Int = 0,
    val views: Int = 0,
    val likes: Int? = 0,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("is_hidden") val isHidden: Boolean? = false,
) {
    fun toDomain(
        creatorNameOverride: String? = null,
        creatorImageOverride: String? = null,
    ) = Drill(
        id = id,
        title = title,
        description = description ?: "",
        creatorId = creatorId,
        creatorName = creatorNameOverride ?: creatorName,
        creatorProfileImage = creatorImageOverride ?: creatorProfileImage,
        category = category,
        difficulty = difficulty,
        uniformType = uniformType,
        thumbnailUrl = thumbnailUrl,
        videoUrl = videoUrl,
        vimeoUrl = vimeoUrl,
        durationMinutes = durationMinutes ?: 0,
        length = length,
        price = price,
        views = views,
        likes = likes ?: 0,
        createdAt = createdAt,
    )
}
