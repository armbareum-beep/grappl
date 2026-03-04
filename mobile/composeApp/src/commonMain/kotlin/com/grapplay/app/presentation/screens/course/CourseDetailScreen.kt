package com.grapplay.app.presentation.screens.course

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.HorizontalDivider
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import coil3.compose.AsyncImage
import com.grapplay.app.domain.model.Lesson
import com.grapplay.app.presentation.components.DifficultyBadge
import com.grapplay.app.presentation.components.ErrorState
import com.grapplay.app.presentation.components.LoadingState
import com.grapplay.app.presentation.components.VideoThumbnail
import com.grapplay.app.presentation.screens.player.VideoPlayerScreenRoute
import com.grapplay.app.presentation.theme.GrapplayGradients
import com.grapplay.app.presentation.theme.Violet
import com.grapplay.app.presentation.theme.Zinc
import org.koin.compose.koinInject

data class CourseDetailScreenRoute(val courseId: String) : Screen {
    @Composable
    override fun Content() {
        val viewModel: CourseDetailViewModel = koinInject()
        val navigator = LocalNavigator.currentOrThrow
        val state by viewModel.state.collectAsState()

        LaunchedEffect(courseId) {
            viewModel.loadCourse(courseId)
        }

        when {
            state.isLoading -> LoadingState()
            state.error != null -> ErrorState(
                message = state.error!!,
                onRetry = { viewModel.loadCourse(courseId) }
            )
            state.course != null -> {
                val course = state.course!!

                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Zinc.Zinc950)
                ) {
                    // Thumbnail with back button
                    item {
                        Box {
                            VideoThumbnail(
                                thumbnailUrl = course.thumbnailUrl,
                                showPlayButton = false,
                            )

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
                    }

                    // Course info
                    item {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.Top,
                            ) {
                                Text(
                                    text = course.title,
                                    style = MaterialTheme.typography.headlineSmall,
                                    color = Zinc.Zinc50,
                                    modifier = Modifier.weight(1f),
                                )
                                Row {
                                    IconButton(onClick = viewModel::toggleSave) {
                                        Icon(
                                            if (state.isSaved) Icons.Filled.Bookmark else Icons.Filled.BookmarkBorder,
                                            contentDescription = "저장",
                                            tint = if (state.isSaved) Violet.Violet400 else Zinc.Zinc400,
                                        )
                                    }
                                    IconButton(onClick = viewModel::toggleLike) {
                                        Icon(
                                            if (state.isLiked) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                                            contentDescription = "좋아요",
                                            tint = if (state.isLiked) Violet.Violet400 else Zinc.Zinc400,
                                        )
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            // Creator info
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                AsyncImage(
                                    model = course.creatorProfileImage,
                                    contentDescription = course.creatorName,
                                    modifier = Modifier
                                        .size(32.dp)
                                        .clip(CircleShape),
                                    contentScale = ContentScale.Crop,
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = course.creatorName,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = Zinc.Zinc300,
                                )
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            // Meta info row
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                course.difficulty?.let {
                                    DifficultyBadge(difficulty = it)
                                }
                                Text(
                                    text = "조회 ${course.views}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Zinc.Zinc500,
                                )
                                Text(
                                    text = "${state.lessons.size}개 레슨",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Zinc.Zinc500,
                                )
                                if (course.price > 0) {
                                    Text(
                                        text = "₩${course.price}",
                                        style = MaterialTheme.typography.labelMedium,
                                        color = Violet.Violet400,
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            Text(
                                text = course.description,
                                style = MaterialTheme.typography.bodyMedium,
                                color = Zinc.Zinc400,
                            )
                        }
                    }

                    // Lessons header
                    item {
                        HorizontalDivider(color = Zinc.Zinc800)
                        Text(
                            text = "레슨 목록",
                            style = MaterialTheme.typography.titleMedium,
                            color = Zinc.Zinc50,
                            modifier = Modifier.padding(16.dp)
                        )
                    }

                    // Lesson list
                    itemsIndexed(state.lessons) { index, lesson ->
                        LessonRow(
                            lesson = lesson,
                            index = index + 1,
                            onClick = {
                                navigator.push(
                                    VideoPlayerScreenRoute(
                                        lessonId = lesson.id,
                                        courseId = courseId,
                                    )
                                )
                            }
                        )
                        if (index < state.lessons.lastIndex) {
                            HorizontalDivider(
                                color = Zinc.Zinc800.copy(alpha = 0.5f),
                                modifier = Modifier.padding(horizontal = 16.dp)
                            )
                        }
                    }

                    item { Spacer(modifier = Modifier.height(32.dp)) }
                }
            }
        }
    }
}

@Composable
private fun LessonRow(
    lesson: Lesson,
    index: Int,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // Lesson number
        Box(
            modifier = Modifier
                .size(32.dp)
                .background(Zinc.Zinc800, RoundedCornerShape(8.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = "$index",
                style = MaterialTheme.typography.labelMedium,
                color = Zinc.Zinc400,
            )
        }

        Spacer(modifier = Modifier.width(12.dp))

        // Lesson info
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = lesson.title,
                style = MaterialTheme.typography.bodyMedium,
                color = Zinc.Zinc50,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            if (lesson.length.isNotBlank()) {
                Text(
                    text = lesson.length,
                    style = MaterialTheme.typography.labelSmall,
                    color = Zinc.Zinc500,
                )
            }
        }

        // Play icon
        Icon(
            Icons.Default.PlayArrow,
            contentDescription = "재생",
            tint = Violet.Violet400,
            modifier = Modifier.size(24.dp),
        )
    }
}
