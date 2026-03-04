package com.grapplay.app.data.remote.dto

import com.grapplay.app.domain.model.Creator
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class CreatorDto(
    val id: String,
    val name: String,
    val bio: String? = null,
    @SerialName("profile_image") val profileImage: String? = null,
    @SerialName("subscriber_count") val subscriberCount: Int = 0,
    @SerialName("course_count") val courseCount: Int? = 0,
    @SerialName("routine_count") val routineCount: Int? = 0,
    @SerialName("sparring_count") val sparringCount: Int? = 0,
    val hidden: Boolean? = false,
) {
    fun toDomain() = Creator(
        id = id,
        name = name,
        bio = bio ?: "",
        profileImage = profileImage,
        subscriberCount = subscriberCount,
        courseCount = courseCount ?: 0,
        routineCount = routineCount ?: 0,
        sparringCount = sparringCount ?: 0,
    )
}
