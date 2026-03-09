package com.grapplay.app.presentation.screens.saved

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.TabRowDefaults
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.grapplay.app.domain.model.DrillRoutine
import com.grapplay.app.domain.model.Lesson
import com.grapplay.app.presentation.components.CourseCard
import com.grapplay.app.presentation.components.DifficultyBadge
import com.grapplay.app.presentation.components.ErrorState
import com.grapplay.app.presentation.components.LoadingState
import com.grapplay.app.presentation.components.VideoThumbnail
import com.grapplay.app.presentation.screens.course.CourseDetailScreenRoute
import com.grapplay.app.presentation.theme.Violet
import com.grapplay.app.presentation.theme.Zinc
import org.koin.compose.koinInject

@Composable
fun SavedScreen() {
    val viewModel: SavedViewModel = koinInject()
    val state by viewModel.state.collectAsState()
    val navigator = LocalNavigator.currentOrThrow.parent ?: LocalNavigator.currentOrThrow

    val tabs = listOf("강좌", "레슨", "루틴")

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(top = 16.dp)
    ) {
        Text(
            text = "저장한 콘텐츠",
            style = MaterialTheme.typography.headlineMedium,
            color = Zinc.Zinc50,
            modifier = Modifier.padding(horizontal = 16.dp)
        )

        Spacer(modifier = Modifier.height(12.dp))

        TabRow(
            selectedTabIndex = state.selectedTab,
            containerColor = Zinc.Zinc950,
            contentColor = Zinc.Zinc50,
            indicator = { tabPositions ->
                TabRowDefaults.SecondaryIndicator(
                    modifier = Modifier.tabIndicatorOffset(tabPositions[state.selectedTab]),
                    color = Violet.Violet500,
                )
            }
        ) {
            tabs.forEachIndexed { index, title ->
                Tab(
                    selected = state.selectedTab == index,
                    onClick = { viewModel.selectTab(index) },
                    text = {
                        Text(
                            text = title,
                            color = if (state.selectedTab == index) Violet.Violet400 else Zinc.Zinc500,
                        )
                    }
                )
            }
        }

        val isEmpty = when (state.selectedTab) {
            0 -> state.savedCourses.isEmpty()
            1 -> state.savedLessons.isEmpty()
            else -> state.savedRoutines.isEmpty()
        }

        when {
            state.isLoading -> LoadingState()
            state.error != null -> ErrorState(
                message = state.error!!,
                onRetry = viewModel::loadSaved
            )
            isEmpty -> ErrorState(message = "저장된 콘텐츠가 없습니다")
            state.selectedTab == 0 -> LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                contentPadding = PaddingValues(16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(state.savedCourses) { course ->
                    CourseCard(
                        course = course,
                        onClick = { navigator.push(CourseDetailScreenRoute(course.id)) }
                    )
                }
            }
            state.selectedTab == 1 -> LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                contentPadding = PaddingValues(16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(state.savedLessons) { lesson ->
                    SavedLessonCard(lesson = lesson)
                }
            }
            else -> LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                contentPadding = PaddingValues(16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(state.savedRoutines) { routine ->
                    SavedRoutineCard(routine = routine)
                }
            }
        }
    }
}

@Composable
private fun SavedLessonCard(lesson: Lesson) {
    Column(
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(Zinc.Zinc900)
            .clickable { }
    ) {
        VideoThumbnail(
            thumbnailUrl = lesson.thumbnailUrl,
            duration = lesson.durationMinutes?.let { "${it}분" },
            showPlayButton = true,
        )
        Column(modifier = Modifier.padding(10.dp)) {
            Text(
                text = lesson.title,
                style = MaterialTheme.typography.titleSmall,
                color = Zinc.Zinc50,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(modifier = Modifier.height(4.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                lesson.creatorName?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodySmall,
                        color = Zinc.Zinc400,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                lesson.difficulty?.let { DifficultyBadge(difficulty = it) }
            }
        }
    }
}

@Composable
private fun SavedRoutineCard(routine: DrillRoutine) {
    Column(
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(Zinc.Zinc900)
            .clickable { }
    ) {
        VideoThumbnail(
            thumbnailUrl = routine.thumbnailUrl,
            showPlayButton = false,
        )
        Column(modifier = Modifier.padding(10.dp)) {
            Text(
                text = routine.title,
                style = MaterialTheme.typography.titleSmall,
                color = Zinc.Zinc50,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(modifier = Modifier.height(4.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    text = "${routine.drillCount}개 드릴",
                    style = MaterialTheme.typography.bodySmall,
                    color = Violet.Violet400,
                )
                routine.difficulty?.let { DifficultyBadge(difficulty = it) }
            }
        }
    }
}
