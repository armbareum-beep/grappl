package com.grapplay.app.domain.repository

interface UserRepository {
    suspend fun toggleInteraction(
        contentType: String,
        contentId: String,
        interactionType: String,
    ): Result<Boolean>

    suspend fun hasInteraction(
        contentType: String,
        contentId: String,
        interactionType: String,
    ): Result<Boolean>

    suspend fun getSavedContentIds(contentType: String): Result<List<String>>
    suspend fun recordView(contentType: String, contentId: String): Result<Unit>
}
