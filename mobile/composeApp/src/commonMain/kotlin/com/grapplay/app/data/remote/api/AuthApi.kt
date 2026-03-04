package com.grapplay.app.data.remote.api

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.auth.user.UserInfo

class AuthApi(private val client: SupabaseClient) {

    suspend fun signIn(email: String, password: String) {
        client.auth.signInWith(Email) {
            this.email = email
            this.password = password
        }
    }

    suspend fun signUp(email: String, password: String, name: String) {
        client.auth.signUpWith(Email) {
            this.email = email
            this.password = password
            data = kotlinx.serialization.json.buildJsonObject {
                put("name", kotlinx.serialization.json.JsonPrimitive(name))
            }
        }
    }

    suspend fun resetPassword(email: String) {
        client.auth.resetPasswordForEmail(email)
    }

    suspend fun signOut() {
        client.auth.signOut()
    }

    suspend fun getCurrentUser(): UserInfo? {
        return client.auth.currentUserOrNull()
    }

    fun currentUserId(): String? {
        return client.auth.currentUserOrNull()?.id
    }

    suspend fun refreshSession() {
        client.auth.refreshCurrentSession()
    }
}
