package com.grapplay.app.domain.repository

import com.grapplay.app.domain.model.Course
import com.grapplay.app.domain.model.Lesson

interface BrowseRepository {
    suspend fun searchCourses(
        query: String? = null,
        category: String? = null,
        difficulty: String? = null,
        uniformType: String? = null,
        limit: Int = 20,
        offset: Int = 0,
    ): Result<List<Course>>

    suspend fun searchLessons(
        query: String? = null,
        category: String? = null,
        difficulty: String? = null,
        limit: Int = 20,
        offset: Int = 0,
    ): Result<List<Lesson>>
}
