package com.grapplay.app.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class UserInteractionDto(
    val id: String? = null,
    @SerialName("user_id") val userId: String,
    @SerialName("content_type") val contentType: String, // drill, lesson, course, routine, sparring, creator
    @SerialName("content_id") val contentId: String,
    @SerialName("interaction_type") val interactionType: String, // save, like, view, follow
    @SerialName("created_at") val createdAt: String? = null,
)
