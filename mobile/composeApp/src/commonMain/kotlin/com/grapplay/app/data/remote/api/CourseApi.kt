package com.grapplay.app.data.remote.api

import com.grapplay.app.data.remote.dto.CourseDto
import com.grapplay.app.data.remote.dto.CreatorDto
import com.grapplay.app.data.remote.dto.LessonDto
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope

class CourseApi(private val client: SupabaseClient) {

    suspend fun getCourseById(courseId: String): CourseDto {
        return client.postgrest.from("courses")
            .select {
                filter { eq("id", courseId) }
                limit(1)
            }
            .decodeSingle()
    }

    suspend fun getLessonsByCourseId(courseId: String): List<LessonDto> {
        return client.postgrest.from("lessons")
            .select {
                filter {
                    eq("course_id", courseId)
                }
                order("lesson_number", Order.ASCENDING)
            }
            .decodeList()
    }

    suspend fun getCourseWithLessons(courseId: String): Pair<CourseDto, List<LessonDto>> =
        coroutineScope {
            val courseDeferred = async { getCourseById(courseId) }
            val lessonsDeferred = async { getLessonsByCourseId(courseId) }
            courseDeferred.await() to lessonsDeferred.await()
        }

    suspend fun getCreatorById(creatorId: String): CreatorDto {
        return client.postgrest.from("creators")
            .select {
                filter { eq("id", creatorId) }
                limit(1)
            }
            .decodeSingle()
    }

    suspend fun getLessonById(lessonId: String): LessonDto {
        return client.postgrest.from("lessons")
            .select {
                filter { eq("id", lessonId) }
                limit(1)
            }
            .decodeSingle()
    }
}
