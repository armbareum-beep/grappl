package com.grapplay.app.presentation.screens.saved

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
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
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.grapplay.app.presentation.components.CourseCard
import com.grapplay.app.presentation.components.ErrorState
import com.grapplay.app.presentation.components.LoadingState
import com.grapplay.app.presentation.screens.course.CourseDetailScreenRoute
import com.grapplay.app.presentation.theme.Violet
import com.grapplay.app.presentation.theme.Zinc
import org.koin.compose.koinInject

@Composable
fun SavedScreen() {
    val viewModel: SavedViewModel = koinInject()
    val state by viewModel.state.collectAsState()
    val navigator = LocalNavigator.currentOrThrow

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

        when {
            state.isLoading -> LoadingState()
            state.error != null -> ErrorState(
                message = state.error!!,
                onRetry = viewModel::loadSaved
            )
            state.savedCourses.isEmpty() -> ErrorState(
                message = "저장된 콘텐츠가 없습니다"
            )
            else -> {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    contentPadding = PaddingValues(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    items(state.savedCourses) { course ->
                        CourseCard(
                            course = course,
                            onClick = {
                                navigator.push(CourseDetailScreenRoute(course.id))
                            }
                        )
                    }
                }
            }
        }
    }
}
