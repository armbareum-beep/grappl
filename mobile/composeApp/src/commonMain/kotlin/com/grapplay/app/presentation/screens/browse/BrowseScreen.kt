package com.grapplay.app.presentation.screens.browse

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.grapplay.app.presentation.components.CategoryChip
import com.grapplay.app.presentation.components.CourseCard
import com.grapplay.app.presentation.components.ErrorState
import com.grapplay.app.presentation.components.LoadingState
import com.grapplay.app.presentation.components.SearchBar
import com.grapplay.app.presentation.screens.course.CourseDetailScreenRoute
import com.grapplay.app.presentation.theme.Zinc
import org.koin.compose.koinInject

@Composable
fun BrowseScreen() {
    val viewModel: BrowseViewModel = koinInject()
    val state by viewModel.state.collectAsState()
    val navigator = LocalNavigator.currentOrThrow

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(top = 16.dp)
    ) {
        Text(
            text = "둘러보기",
            style = MaterialTheme.typography.headlineMedium,
            color = Zinc.Zinc50,
            modifier = Modifier.padding(horizontal = 16.dp)
        )

        Spacer(modifier = Modifier.height(12.dp))

        // Search bar
        SearchBar(
            query = state.query,
            onQueryChange = viewModel::onQueryChange,
            modifier = Modifier.padding(horizontal = 16.dp),
            placeholder = "강좌, 레슨 검색..."
        )

        Spacer(modifier = Modifier.height(12.dp))

        // Category chips
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(BrowseViewModel.CATEGORIES) { category ->
                CategoryChip(
                    category = BrowseViewModel.CATEGORY_LABELS[category] ?: category,
                    isSelected = state.selectedCategory == category,
                    onClick = { viewModel.onCategorySelect(category) }
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Difficulty & Uniform chips
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(BrowseViewModel.DIFFICULTIES) { difficulty ->
                CategoryChip(
                    category = BrowseViewModel.DIFFICULTY_LABELS[difficulty] ?: difficulty,
                    isSelected = state.selectedDifficulty == difficulty,
                    onClick = { viewModel.onDifficultySelect(difficulty) }
                )
            }
            items(BrowseViewModel.UNIFORMS) { uniform ->
                CategoryChip(
                    category = uniform,
                    isSelected = state.selectedUniform == uniform,
                    onClick = { viewModel.onUniformSelect(uniform) }
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Results
        when {
            state.isLoading -> LoadingState()
            state.error != null -> ErrorState(
                message = state.error!!,
                onRetry = viewModel::search
            )
            state.courses.isEmpty() -> ErrorState(message = "검색 결과가 없습니다")
            else -> {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    items(state.courses) { course ->
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
