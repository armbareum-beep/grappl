package com.grapplay.app.data.remote.api

import com.grapplay.app.data.remote.dto.CourseDto
import com.grapplay.app.data.remote.dto.CreatorDto
import com.grapplay.app.data.remote.dto.DrillDto
import com.grapplay.app.data.remote.dto.LessonDto
import com.grapplay.app.data.remote.dto.RoutineDto
import com.grapplay.app.data.remote.dto.SparringDto
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.datetime.Clock
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime
import kotlin.math.abs
import kotlin.math.sin

class HomeApi(private val client: SupabaseClient) {

    suspend fun fetchHomeData(): HomeRawData = coroutineScope {
        val coursesDeferred = async { fetchCourses() }
        val routinesDeferred = async { fetchRoutines() }
        val sparringDeferred = async { fetchSparring() }
        val drillsDeferred = async { fetchDrills() }
        val lessonsDeferred = async { fetchLessons() }

        val courses = coursesDeferred.await()
        val routines = routinesDeferred.await()
        val sparring = sparringDeferred.await()
        val drills = drillsDeferred.await()
        val lessons = lessonsDeferred.await()

        // Batch fetch creators
        val allCreatorIds = (
            courses.map { it.creatorId } +
            routines.map { it.creatorId } +
            sparring.map { it.creatorId } +
            drills.map { it.creatorId } +
            lessons.mapNotNull { it.creatorId }
        ).distinct()

        val creators = batchFetchCreators(allCreatorIds)

        HomeRawData(
            courses = courses,
            routines = routines,
            sparring = sparring,
            drills = drills,
            lessons = lessons,
            creators = creators,
        )
    }

    private suspend fun fetchCourses(): List<CourseDto> {
        return client.postgrest.from("courses")
            .select {
                filter {
                    eq("published", true)
                    eq("is_hidden", false)
                }
                order("created_at", Order.DESCENDING)
                limit(30)
            }
            .decodeList()
    }

    private suspend fun fetchRoutines(): List<RoutineDto> {
        return client.postgrest.from("routines")
            .select {
                filter {
                    eq("is_hidden", false)
                }
                order("created_at", Order.DESCENDING)
                limit(20)
            }
            .decodeList()
    }

    private suspend fun fetchSparring(): List<SparringDto> {
        return client.postgrest.from("sparring_videos")
            .select {
                filter {
                    eq("is_published", true)
                    eq("is_hidden", false)
                }
                order("created_at", Order.DESCENDING)
                limit(20)
            }
            .decodeList()
    }

    private suspend fun fetchDrills(): List<DrillDto> {
        return client.postgrest.from("drills")
            .select {
                filter {
                    eq("is_hidden", false)
                }
                order("created_at", Order.DESCENDING)
                limit(10)
            }
            .decodeList()
    }

    private suspend fun fetchLessons(): List<LessonDto> {
        return client.postgrest.from("lessons")
            .select {
                filter {
                    eq("is_hidden", false)
                }
                order("created_at", Order.DESCENDING)
                limit(10)
            }
            .decodeList()
    }

    private suspend fun batchFetchCreators(ids: List<String>): Map<String, CreatorDto> {
        if (ids.isEmpty()) return emptyMap()
        val creators: List<CreatorDto> = client.postgrest.from("creators")
            .select(Columns.list("id", "name", "profile_image")) {
                filter {
                    isIn("id", ids)
                }
            }
            .decodeList()
        return creators.associateBy { it.id }
    }
}

data class HomeRawData(
    val courses: List<CourseDto>,
    val routines: List<RoutineDto>,
    val sparring: List<SparringDto>,
    val drills: List<DrillDto>,
    val lessons: List<LessonDto>,
    val creators: Map<String, CreatorDto>,
)

/** Deterministic daily index based on KST date */
fun getDailyIndex(arrayLength: Int, offset: Int = 0): Int {
    if (arrayLength <= 0) return 0
    val now = Clock.System.now()
    val kst = now.toLocalDateTime(TimeZone.of("Asia/Seoul"))
    val seed = kst.year * 10000 + kst.monthNumber * 100 + kst.dayOfMonth + offset
    val x = sin(seed.toDouble()) * 10000
    return abs((x - kotlin.math.floor(x)) * arrayLength).toInt().coerceIn(0, arrayLength - 1)
}
