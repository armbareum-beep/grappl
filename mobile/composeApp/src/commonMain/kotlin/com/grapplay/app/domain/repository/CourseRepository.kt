package com.grapplay.app.domain.repository

import com.grapplay.app.domain.model.Course
import com.grapplay.app.domain.model.Creator
import com.grapplay.app.domain.model.Lesson

interface CourseRepository {
    suspend fun getCourseById(courseId: String): Result<Course>
    suspend fun getLessonsByCourseId(courseId: String): Result<List<Lesson>>
    suspend fun getCourseWithLessons(courseId: String): Result<Pair<Course, List<Lesson>>>
    suspend fun getCreatorById(creatorId: String): Result<Creator>
    suspend fun getLessonById(lessonId: String): Result<Lesson>
}
