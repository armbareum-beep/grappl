package com.grapplay.app.data.repository

import com.grapplay.app.data.remote.api.BrowseApi
import com.grapplay.app.domain.model.Course
import com.grapplay.app.domain.model.DrillRoutine
import com.grapplay.app.domain.model.Lesson
import com.grapplay.app.domain.repository.BrowseRepository

class BrowseRepositoryImpl(
    private val browseApi: BrowseApi
) : BrowseRepository {

    override suspend fun searchCourses(
        query: String?,
        category: String?,
        difficulty: String?,
        uniformType: String?,
        limit: Int,
        offset: Int,
    ): Result<List<Course>> = runCatching {
        browseApi.searchCourses(query, category, difficulty, uniformType, limit.toLong(), offset.toLong())
            .map { it.toDomain() }
    }

    override suspend fun searchLessons(
        query: String?,
        category: String?,
        difficulty: String?,
        limit: Int,
        offset: Int,
    ): Result<List<Lesson>> = runCatching {
        browseApi.searchLessons(query, category, difficulty, limit.toLong(), offset.toLong())
            .map { it.toDomain() }
    }

    override suspend fun getLessonsByIds(ids: List<String>): Result<List<Lesson>> = runCatching {
        browseApi.getLessonsByIds(ids).map { it.toDomain() }
    }

    override suspend fun getRoutinesByIds(ids: List<String>): Result<List<DrillRoutine>> = runCatching {
        browseApi.getRoutinesByIds(ids).map { it.toDomain() }
    }
}
