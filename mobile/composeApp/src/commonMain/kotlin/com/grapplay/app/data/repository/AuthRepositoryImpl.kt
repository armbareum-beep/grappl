package com.grapplay.app.data.repository

import com.grapplay.app.data.remote.api.AuthApi
import com.grapplay.app.domain.model.User
import com.grapplay.app.domain.repository.AuthRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map

class AuthRepositoryImpl(
    private val authApi: AuthApi
) : AuthRepository {

    private val _currentUser = MutableStateFlow<User?>(null)

    override val currentUser: Flow<User?> = _currentUser
    override val isLoggedIn: Flow<Boolean> = _currentUser.map { it != null }

    override suspend fun signIn(email: String, password: String): Result<Unit> {
        return runCatching {
            authApi.signIn(email, password)
            refreshCurrentUser()
        }
    }

    override suspend fun signUp(email: String, password: String, name: String): Result<Unit> {
        return runCatching {
            authApi.signUp(email, password, name)
            refreshCurrentUser()
        }
    }

    override suspend fun resetPassword(email: String): Result<Unit> {
        return runCatching {
            authApi.resetPassword(email)
        }
    }

    override suspend fun signOut() {
        authApi.signOut()
        _currentUser.value = null
    }

    override fun getCurrentUserId(): String? {
        return authApi.currentUserId()
    }

    private suspend fun refreshCurrentUser() {
        val userInfo = authApi.getCurrentUser()
        _currentUser.value = userInfo?.let { info ->
            User(
                id = info.id,
                name = info.userMetadata?.get("name")?.toString()?.trim('"') ?: "",
                email = info.email ?: "",
            )
        }
    }
}
