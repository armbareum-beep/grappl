package com.grapplay.app.data.remote.dto

import com.grapplay.app.domain.model.SparringVideo
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class SparringDto(
    val id: String,
    @SerialName("creator_id") val creatorId: String,
    val title: String,
    val description: String? = null,
    @SerialName("video_url") val videoUrl: String = "",
    @SerialName("thumbnail_url") val thumbnailUrl: String? = null,
    val views: Int = 0,
    val likes: Int = 0,
    val price: Int = 0,
    val category: String? = null,
    @SerialName("uniform_type") val uniformType: String? = null,
    val length: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("creator_profile_image") val creatorProfileImage: String? = null,
    @SerialName("is_daily_free") val isDailyFree: Boolean? = false,
    @SerialName("is_hidden") val isHidden: Boolean? = false,
    @SerialName("is_published") val isPublished: Boolean? = true,
) {
    fun toDomain(
        creatorImageOverride: String? = null,
    ) = SparringVideo(
        id = id,
        creatorId = creatorId,
        title = title,
        description = description ?: "",
        videoUrl = videoUrl,
        thumbnailUrl = thumbnailUrl,
        views = views,
        likes = likes,
        price = price,
        category = category,
        uniformType = uniformType,
        length = length,
        createdAt = createdAt,
        creatorProfileImage = creatorImageOverride ?: creatorProfileImage,
        isDailyFree = isDailyFree ?: false,
    )
}
