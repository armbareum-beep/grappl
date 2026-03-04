package com.grapplay.app.presentation.screens.player

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.filled.SkipPrevious
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.grapplay.app.presentation.components.ErrorState
import com.grapplay.app.presentation.components.LoadingState
import com.grapplay.app.presentation.components.VideoThumbnail
import com.grapplay.app.presentation.theme.Violet
import com.grapplay.app.presentation.theme.Zinc
import org.koin.compose.koinInject

data class VideoPlayerScreenRoute(
    val lessonId: String,
    val courseId: String? = null,
) : Screen {
    @Composable
    override fun Content() {
        val viewModel: VideoPlayerViewModel = koinInject()
        val navigator = LocalNavigator.currentOrThrow
        val state by viewModel.state.collectAsState()

        LaunchedEffect(lessonId) {
            viewModel.loadLesson(lessonId, courseId)
        }

        when {
            state.isLoading -> LoadingState()
            state.error != null -> ErrorState(
                message = state.error!!,
                onRetry = { viewModel.loadLesson(lessonId, courseId) }
            )
            state.lesson != null -> {
                val lesson = state.lesson!!

                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Zinc.Zinc950)
                ) {
                    // Video player area (placeholder - will use platform-specific player)
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .aspectRatio(16f / 9f)
                            .background(Zinc.Zinc900)
                    ) {
                        VideoThumbnail(
                            thumbnailUrl = lesson.thumbnailUrl,
                            duration = lesson.length,
                        )

                        // Back button
                        IconButton(
                            onClick = { navigator.pop() },
                            modifier = Modifier
                                .padding(8.dp)
                                .background(
                                    Zinc.Zinc950.copy(alpha = 0.6f),
                                    CircleShape
                                )
                        ) {
                            Icon(
                                Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "뒤로",
                                tint = Zinc.Zinc50,
                            )
                        }
                    }

                    // Lesson info
                    Column(
                        modifier = Modifier.padding(16.dp)
                    ) {
                        Text(
                            text = lesson.title,
                            style = MaterialTheme.typography.titleLarge,
                            color = Zinc.Zinc50,
                        )

                        Spacer(modifier = Modifier.height(4.dp))

                        lesson.courseTitle?.let {
                            Text(
                                text = it,
                                style = MaterialTheme.typography.bodySmall,
                                color = Violet.Violet400,
                            )
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        Row(
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            lesson.creatorName?.let {
                                Text(
                                    text = it,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Zinc.Zinc400,
                                )
                            }
                            if (lesson.length.isNotBlank()) {
                                Text(
                                    text = lesson.length,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Zinc.Zinc500,
                                )
                            }
                        }

                        if (lesson.description.isNotBlank()) {
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = lesson.description,
                                style = MaterialTheme.typography.bodyMedium,
                                color = Zinc.Zinc400,
                            )
                        }

                        // Navigation buttons (prev/next lesson)
                        if (state.allLessons.size > 1) {
                            Spacer(modifier = Modifier.height(24.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                IconButton(
                                    onClick = viewModel::goToPreviousLesson,
                                    enabled = viewModel.hasPrevious,
                                ) {
                                    Icon(
                                        Icons.Default.SkipPrevious,
                                        contentDescription = "이전 레슨",
                                        tint = if (viewModel.hasPrevious) Violet.Violet400 else Zinc.Zinc700,
                                        modifier = Modifier.size(32.dp)
                                    )
                                }

                                Text(
                                    text = "${state.currentIndex + 1} / ${state.allLessons.size}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = Zinc.Zinc400,
                                    modifier = Modifier.align(Alignment.CenterVertically),
                                )

                                IconButton(
                                    onClick = viewModel::goToNextLesson,
                                    enabled = viewModel.hasNext,
                                ) {
                                    Icon(
                                        Icons.Default.SkipNext,
                                        contentDescription = "다음 레슨",
                                        tint = if (viewModel.hasNext) Violet.Violet400 else Zinc.Zinc700,
                                        modifier = Modifier.size(32.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
