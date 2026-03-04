package com.grapplay.app.data.remote.dto

import com.grapplay.app.domain.model.DrillRoutine
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class RoutineDto(
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
    val price: Int = 0,
    val views: Int = 0,
    @SerialName("drill_count") val drillCount: Int? = 0,
    @SerialName("total_duration_minutes") val totalDurationMinutes: Int? = 0,
    val likes: Int? = 0,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("is_daily_free") val isDailyFree: Boolean? = false,
    @SerialName("is_hidden") val isHidden: Boolean? = false,
    val rank: Int? = null,
) {
    fun toDomain(
        creatorNameOverride: String? = null,
        creatorImageOverride: String? = null,
    ) = DrillRoutine(
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
        price = price,
        views = views,
        drillCount = drillCount ?: 0,
        totalDurationMinutes = totalDurationMinutes ?: 0,
        likes = likes ?: 0,
        createdAt = createdAt,
        isDailyFree = isDailyFree ?: false,
    )
}
