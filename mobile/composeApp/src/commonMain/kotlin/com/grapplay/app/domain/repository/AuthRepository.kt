package com.grapplay.app.domain.repository

import com.grapplay.app.domain.model.User
import kotlinx.coroutines.flow.Flow

interface AuthRepository {
    val isLoggedIn: Flow<Boolean>
    val currentUser: Flow<User?>
    suspend fun signIn(email: String, password: String): Result<Unit>
    suspend fun signUp(email: String, password: String, name: String): Result<Unit>
    suspend fun resetPassword(email: String): Result<Unit>
    suspend fun signOut()
    fun getCurrentUserId(): String?
}
