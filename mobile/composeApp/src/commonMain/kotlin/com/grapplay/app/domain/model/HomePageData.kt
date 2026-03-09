package com.grapplay.app.domain.model

data class HomePageData(
    val dailyDrill: Drill? = null,
    val dailyLesson: Lesson? = null,
    val dailySparring: SparringVideo? = null,
    val trendingCourses: List<Course> = emptyList(),
    val newCourses: List<Course> = emptyList(),
    val featuredRoutines: List<DrillRoutine> = emptyList(),
    val trendingSparring: List<SparringVideo> = emptyList(),
)
