package com.grapplay.app.data.repository

import com.grapplay.app.data.remote.api.CourseApi
import com.grapplay.app.domain.model.Course
import com.grapplay.app.domain.model.Creator
import com.grapplay.app.domain.model.Lesson
import com.grapplay.app.domain.repository.CourseRepository

class CourseRepositoryImpl(
    private val courseApi: CourseApi
) : CourseRepository {

    override suspend fun getCourseById(courseId: String): Result<Course> = runCatching {
        val dto = courseApi.getCourseById(courseId)
        val creator = courseApi.getCreatorById(dto.creatorId)
        dto.toDomain(
            creatorNameOverride = creator.name,
            creatorImageOverride = creator.profileImage,
        )
    }

    override suspend fun getLessonsByCourseId(courseId: String): Result<List<Lesson>> = runCatching {
        courseApi.getLessonsByCourseId(courseId).map { it.toDomain() }
    }

    override suspend fun getCourseWithLessons(courseId: String): Result<Pair<Course, List<Lesson>>> =
        runCatching {
            val (courseDto, lessonDtos) = courseApi.getCourseWithLessons(courseId)
            val creator = courseApi.getCreatorById(courseDto.creatorId)
            val course = courseDto.toDomain(
                creatorNameOverride = creator.name,
                creatorImageOverride = creator.profileImage,
                lessonCountOverride = lessonDtos.size,
            )
            val lessons = lessonDtos.map { it.toDomain() }
            course to lessons
        }

    override suspend fun getCreatorById(creatorId: String): Result<Creator> = runCatching {
        courseApi.getCreatorById(creatorId).toDomain()
    }

    override suspend fun getLessonById(lessonId: String): Result<Lesson> = runCatching {
        courseApi.getLessonById(lessonId).toDomain()
    }
}
