package com.grapplay.app.data.remote.api

import com.grapplay.app.data.remote.dto.UserInteractionDto
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class UserApi(private val client: SupabaseClient) {

    /** Toggle a user interaction (save, like, follow). Returns true if created, false if removed. */
    suspend fun toggleInteraction(
        userId: String,
        contentType: String,
        contentId: String,
        interactionType: String,
    ): Boolean {
        // Check if interaction already exists
        val existing: List<UserInteractionDto> = client.postgrest
            .from("user_interactions")
            .select {
                filter {
                    eq("user_id", userId)
                    eq("content_type", contentType)
                    eq("content_id", contentId)
                    eq("interaction_type", interactionType)
                }
                limit(1)
            }
            .decodeList()

        if (existing.isNotEmpty()) {
            // Remove interaction
            client.postgrest.from("user_interactions")
                .delete {
                    filter {
                        eq("user_id", userId)
                        eq("content_type", contentType)
                        eq("content_id", contentId)
                        eq("interaction_type", interactionType)
                    }
                }
            return false
        } else {
            // Create interaction
            client.postgrest.from("user_interactions")
                .insert(buildJsonObject {
                    put("user_id", userId)
                    put("content_type", contentType)
                    put("content_id", contentId)
                    put("interaction_type", interactionType)
                })
            return true
        }
    }

    /** Check if an interaction exists */
    suspend fun hasInteraction(
        userId: String,
        contentType: String,
        contentId: String,
        interactionType: String,
    ): Boolean {
        val result: List<UserInteractionDto> = client.postgrest
            .from("user_interactions")
            .select {
                filter {
                    eq("user_id", userId)
                    eq("content_type", contentType)
                    eq("content_id", contentId)
                    eq("interaction_type", interactionType)
                }
                limit(1)
            }
            .decodeList()
        return result.isNotEmpty()
    }

    /** Get all saved content IDs for a user by content type */
    suspend fun getSavedContentIds(
        userId: String,
        contentType: String,
    ): List<String> {
        val interactions: List<UserInteractionDto> = client.postgrest
            .from("user_interactions")
            .select {
                filter {
                    eq("user_id", userId)
                    eq("content_type", contentType)
                    eq("interaction_type", "save")
                }
            }
            .decodeList()
        return interactions.map { it.contentId }
    }

    /** Record a view interaction */
    suspend fun recordView(
        userId: String,
        contentType: String,
        contentId: String,
    ) {
        // Upsert to avoid duplicate view records
        client.postgrest.from("user_interactions")
            .insert(buildJsonObject {
                put("user_id", userId)
                put("content_type", contentType)
                put("content_id", contentId)
                put("interaction_type", "view")
            })
    }
}
