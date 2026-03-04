package com.grapplay.app.data.remote.api

import com.grapplay.app.data.remote.dto.CourseDto
import com.grapplay.app.data.remote.dto.LessonDto
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order

class BrowseApi(private val client: SupabaseClient) {

    suspend fun searchCourses(
        query: String? = null,
        category: String? = null,
        difficulty: String? = null,
        uniformType: String? = null,
        limit: Long = 20,
        offset: Long = 0,
    ): List<CourseDto> {
        return client.postgrest.from("courses")
            .select {
                filter {
                    eq("published", true)
                    eq("is_hidden", false)
                    if (!query.isNullOrBlank()) {
                        ilike("title", "%$query%")
                    }
                    if (!category.isNullOrBlank()) {
                        eq("category", category)
                    }
                    if (!difficulty.isNullOrBlank()) {
                        eq("difficulty", difficulty)
                    }
                    if (!uniformType.isNullOrBlank()) {
                        eq("uniform_type", uniformType)
                    }
                }
                order("created_at", Order.DESCENDING)
                limit(limit)
                range(offset, offset + limit - 1)
            }
            .decodeList()
    }

    suspend fun searchLessons(
        query: String? = null,
        category: String? = null,
        difficulty: String? = null,
        limit: Long = 20,
        offset: Long = 0,
    ): List<LessonDto> {
        return client.postgrest.from("lessons")
            .select {
                filter {
                    eq("is_hidden", false)
                    if (!query.isNullOrBlank()) {
                        ilike("title", "%$query%")
                    }
                    if (!category.isNullOrBlank()) {
                        eq("category", category)
                    }
                    if (!difficulty.isNullOrBlank()) {
                        eq("difficulty", difficulty)
                    }
                }
                order("created_at", Order.DESCENDING)
                limit(limit)
                range(offset, offset + limit - 1)
            }
            .decodeList()
    }
}
