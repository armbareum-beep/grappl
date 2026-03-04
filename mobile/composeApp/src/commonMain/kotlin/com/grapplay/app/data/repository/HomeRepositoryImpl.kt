package com.grapplay.app.data.repository

import com.grapplay.app.data.remote.api.HomeApi
import com.grapplay.app.data.remote.api.getDailyIndex
import com.grapplay.app.domain.model.HomePageData
import com.grapplay.app.domain.repository.HomeRepository

class HomeRepositoryImpl(
    private val homeApi: HomeApi
) : HomeRepository {

    override suspend fun getHomePageData(): Result<HomePageData> = runCatching {
        val raw = homeApi.fetchHomeData()

        // Map courses with creator info
        val courses = raw.courses.map { dto ->
            val creator = raw.creators[dto.creatorId]
            dto.toDomain(
                creatorNameOverride = creator?.name,
                creatorImageOverride = creator?.profileImage,
            )
        }

        // Trending = sorted by views desc
        val trendingCourses = courses.sortedByDescending { it.views }.take(10)
        // New = sorted by date (already sorted from API)
        val newCourses = courses.take(10)

        // Map routines
        val routines = raw.routines.map { dto ->
            val creator = raw.creators[dto.creatorId]
            dto.toDomain(
                creatorNameOverride = creator?.name,
                creatorImageOverride = creator?.profileImage,
            )
        }

        // Map sparring
        val sparring = raw.sparring.map { dto ->
            val creator = raw.creators[dto.creatorId]
            dto.toDomain(creatorImageOverride = creator?.profileImage)
        }

        // Map drills
        val drills = raw.drills.map { dto ->
            val creator = raw.creators[dto.creatorId]
            dto.toDomain(
                creatorNameOverride = creator?.name,
                creatorImageOverride = creator?.profileImage,
            )
        }

        // Map lessons
        val lessons = raw.lessons.map { dto ->
            val creator = dto.creatorId?.let { raw.creators[it] }
            dto.toDomain(
                creatorNameOverride = creator?.name,
                creatorImageOverride = creator?.profileImage,
            )
        }

        // Daily picks using deterministic index
        val dailyDrill = drills.getOrNull(getDailyIndex(drills.size, 0))
        val dailyLesson = lessons.getOrNull(getDailyIndex(lessons.size, 1))
        val dailySparring = sparring.getOrNull(getDailyIndex(sparring.size, 2))

        HomePageData(
            dailyDrill = dailyDrill,
            dailyLesson = dailyLesson,
            dailySparring = dailySparring,
            trendingCourses = trendingCourses,
            newCourses = newCourses,
            featuredRoutines = routines.take(10),
            trendingSparring = sparring.sortedByDescending { it.views }.take(10),
        )
    }
}
