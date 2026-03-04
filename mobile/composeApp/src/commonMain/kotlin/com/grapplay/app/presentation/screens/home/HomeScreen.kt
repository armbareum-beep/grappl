package com.grapplay.app.presentation.screens.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.grapplay.app.domain.model.Course
import com.grapplay.app.domain.model.DrillRoutine
import com.grapplay.app.domain.model.HomePageData
import com.grapplay.app.presentation.components.CourseCard
import com.grapplay.app.presentation.components.ErrorState
import com.grapplay.app.presentation.components.LoadingState
import com.grapplay.app.presentation.components.VideoThumbnail
import com.grapplay.app.presentation.screens.course.CourseDetailScreenRoute
import com.grapplay.app.presentation.theme.GrapplayGradients
import com.grapplay.app.presentation.theme.Violet
import com.grapplay.app.presentation.theme.Zinc
import org.koin.compose.koinInject

@Composable
fun HomeScreen() {
    val viewModel: HomeViewModel = koinInject()
    val state by viewModel.state.collectAsState()

    when {
        state.isLoading -> LoadingState()
        state.error != null -> ErrorState(
            message = state.error!!,
            onRetry = viewModel::loadData
        )
        state.data != null -> HomeContent(data = state.data!!)
    }
}

@Composable
private fun HomeContent(data: HomePageData) {
    val navigator = LocalNavigator.currentOrThrow
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Zinc.Zinc950)
            .verticalScroll(scrollState)
            .padding(vertical = 16.dp)
    ) {
        // Header
        Text(
            text = buildAnnotatedString {
                withStyle(SpanStyle(brush = GrapplayGradients.primary)) {
                    append("GRAPPLAY")
                }
            },
            style = MaterialTheme.typography.headlineMedium,
            modifier = Modifier.padding(horizontal = 16.dp),
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Daily Content Section
        data.dailyLesson?.let { lesson ->
            SectionHeader(title = "오늘의 레슨")
            Box(
                modifier = Modifier
                    .padding(horizontal = 16.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Zinc.Zinc900)
                    .clickable { /* Navigate to lesson */ }
                    .fillMaxWidth()
            ) {
                Column {
                    VideoThumbnail(
                        thumbnailUrl = lesson.thumbnailUrl,
                        duration = lesson.length,
                    )
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            text = lesson.title,
                            style = MaterialTheme.typography.titleSmall,
                            color = Zinc.Zinc50,
                        )
                        lesson.creatorName?.let {
                            Text(
                                text = it,
                                style = MaterialTheme.typography.bodySmall,
                                color = Zinc.Zinc400,
                            )
                        }
                    }
                }
            }
            Spacer(modifier = Modifier.height(24.dp))
        }

        // Trending Courses
        if (data.trendingCourses.isNotEmpty()) {
            SectionHeader(title = "인기 강좌")
            CourseCarousel(
                courses = data.trendingCourses,
                onCourseClick = { course ->
                    navigator.push(CourseDetailScreenRoute(course.id))
                }
            )
            Spacer(modifier = Modifier.height(24.dp))
        }

        // New Courses
        if (data.newCourses.isNotEmpty()) {
            SectionHeader(title = "신규 강좌")
            CourseCarousel(
                courses = data.newCourses,
                onCourseClick = { course ->
                    navigator.push(CourseDetailScreenRoute(course.id))
                }
            )
            Spacer(modifier = Modifier.height(24.dp))
        }

        // Featured Routines
        if (data.featuredRoutines.isNotEmpty()) {
            SectionHeader(title = "추천 루틴")
            RoutineCarousel(routines = data.featuredRoutines)
            Spacer(modifier = Modifier.height(24.dp))
        }

        // Trending Sparring
        if (data.trendingSparring.isNotEmpty()) {
            SectionHeader(title = "인기 스파링 영상")
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(data.trendingSparring) { sparring ->
                    Box(
                        modifier = Modifier
                            .width(240.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Zinc.Zinc900)
                    ) {
                        Column {
                            VideoThumbnail(
                                thumbnailUrl = sparring.thumbnailUrl,
                                duration = sparring.length,
                            )
                            Text(
                                text = sparring.title,
                                style = MaterialTheme.typography.bodySmall,
                                color = Zinc.Zinc50,
                                maxLines = 2,
                                modifier = Modifier.padding(8.dp)
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
    }
}

@Composable
private fun SectionHeader(title: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            color = Zinc.Zinc50,
        )
    }
}

@Composable
private fun CourseCarousel(
    courses: List<Course>,
    onCourseClick: (Course) -> Unit,
) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(courses) { course ->
            CourseCard(
                course = course,
                onClick = { onCourseClick(course) },
                modifier = Modifier.width(240.dp)
            )
        }
    }
}

@Composable
private fun RoutineCarousel(routines: List<DrillRoutine>) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(routines) { routine ->
            Box(
                modifier = Modifier
                    .width(200.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Zinc.Zinc900)
                    .clickable { /* Navigate to routine */ }
            ) {
                Column {
                    VideoThumbnail(
                        thumbnailUrl = routine.thumbnailUrl,
                        showPlayButton = false,
                    )
                    Column(modifier = Modifier.padding(10.dp)) {
                        Text(
                            text = routine.title,
                            style = MaterialTheme.typography.bodySmall,
                            color = Zinc.Zinc50,
                            maxLines = 2,
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "${routine.drillCount}개 드릴 · ${routine.totalDurationMinutes}분",
                            style = MaterialTheme.typography.labelSmall,
                            color = Zinc.Zinc500,
                        )
                    }
                }
            }
        }
    }
}
