package com.grapplay.app.data.repository

import com.grapplay.app.data.remote.api.AuthApi
import com.grapplay.app.data.remote.api.UserApi
import com.grapplay.app.domain.repository.UserRepository

class UserRepositoryImpl(
    private val userApi: UserApi,
    private val authApi: AuthApi,
) : UserRepository {

    override suspend fun toggleInteraction(
        contentType: String,
        contentId: String,
        interactionType: String,
    ): Result<Boolean> = runCatching {
        val userId = authApi.currentUserId() ?: throw IllegalStateException("Not authenticated")
        userApi.toggleInteraction(userId, contentType, contentId, interactionType)
    }

    override suspend fun hasInteraction(
        contentType: String,
        contentId: String,
        interactionType: String,
    ): Result<Boolean> = runCatching {
        val userId = authApi.currentUserId() ?: return@runCatching false
        userApi.hasInteraction(userId, contentType, contentId, interactionType)
    }

    override suspend fun getSavedContentIds(contentType: String): Result<List<String>> = runCatching {
        val userId = authApi.currentUserId() ?: return@runCatching emptyList()
        userApi.getSavedContentIds(userId, contentType)
    }

    override suspend fun recordView(contentType: String, contentId: String): Result<Unit> = runCatching {
        val userId = authApi.currentUserId() ?: return@runCatching
        userApi.recordView(userId, contentType, contentId)
    }
}
