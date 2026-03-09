package com.grapplay.app.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.grapplay.app.domain.model.Course
import com.grapplay.app.presentation.theme.GrapplayGradients
import com.grapplay.app.presentation.theme.StatusColors
import com.grapplay.app.presentation.theme.Violet
import com.grapplay.app.presentation.theme.Zinc

@Composable
fun CourseCard(
    course: Course,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(Zinc.Zinc900)
            .clickable(onClick = onClick)
    ) {
        // Thumbnail
        Box {
            AsyncImage(
                model = course.thumbnailUrl,
                contentDescription = course.title,
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(16f / 9f)
                    .clip(RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp)),
                contentScale = ContentScale.Crop
            )

            // Difficulty badge
            course.difficulty?.let { difficulty ->
                DifficultyBadge(
                    difficulty = difficulty,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(8.dp)
                )
            }

            // Lesson count
            course.lessonCount?.let { count ->
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(8.dp)
                        .background(
                            Zinc.Zinc950.copy(alpha = 0.8f),
                            RoundedCornerShape(6.dp)
                        )
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = "${count}개 레슨",
                        style = MaterialTheme.typography.labelSmall,
                        color = Zinc.Zinc300
                    )
                }
            }
        }

        // Content
        Column(modifier = Modifier.padding(12.dp)) {
            Text(
                text = course.title,
                style = MaterialTheme.typography.titleSmall,
                color = Zinc.Zinc50,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(6.dp))

            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Creator avatar
                AsyncImage(
                    model = course.creatorProfileImage,
                    contentDescription = course.creatorName,
                    modifier = Modifier
                        .size(20.dp)
                        .clip(CircleShape),
                    contentScale = ContentScale.Crop
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = course.creatorName,
                    style = MaterialTheme.typography.bodySmall,
                    color = Zinc.Zinc400,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Spacer(modifier = Modifier.height(6.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "조회 ${formatViews(course.views)}",
                    style = MaterialTheme.typography.labelSmall,
                    color = Zinc.Zinc500
                )

                if (course.price > 0) {
                    Text(
                        text = "₩${formatPrice(course.price)}",
                        style = MaterialTheme.typography.labelMedium,
                        color = Violet.Violet400
                    )
                } else {
                    Text(
                        text = "무료",
                        style = MaterialTheme.typography.labelMedium,
                        color = Violet.Violet400
                    )
                }
            }
        }
    }
}

@Composable
fun DifficultyBadge(
    difficulty: String,
    modifier: Modifier = Modifier
) {
    val color = when (difficulty) {
        "Beginner" -> StatusColors.Success
        "Intermediate" -> StatusColors.Warning
        "Advanced" -> StatusColors.Error
        else -> Zinc.Zinc500
    }

    Box(
        modifier = modifier
            .background(color.copy(alpha = 0.9f), RoundedCornerShape(6.dp))
            .padding(horizontal = 8.dp, vertical = 3.dp)
    ) {
        Text(
            text = when (difficulty) {
                "Beginner" -> "초급"
                "Intermediate" -> "중급"
                "Advanced" -> "고급"
                else -> difficulty
            },
            style = MaterialTheme.typography.labelSmall,
            color = Zinc.Zinc50
        )
    }
}

@Composable
fun CategoryChip(
    category: String,
    isSelected: Boolean = false,
    onClick: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(20.dp))
            .background(
                if (isSelected) Violet.Violet600 else Zinc.Zinc800
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        Text(
            text = category,
            style = MaterialTheme.typography.labelMedium,
            color = if (isSelected) Zinc.Zinc50 else Zinc.Zinc400
        )
    }
}

@Composable
fun SearchBar(
    query: String,
    onQueryChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = "검색..."
) {
    androidx.compose.material3.OutlinedTextField(
        value = query,
        onValueChange = onQueryChange,
        modifier = modifier.fillMaxWidth(),
        placeholder = {
            Text(
                text = placeholder,
                color = Zinc.Zinc500
            )
        },
        singleLine = true,
        shape = RoundedCornerShape(12.dp),
        colors = androidx.compose.material3.OutlinedTextFieldDefaults.colors(
            focusedBorderColor = Violet.Violet500,
            unfocusedBorderColor = Zinc.Zinc700,
            cursorColor = Violet.Violet400,
            focusedContainerColor = Zinc.Zinc900,
            unfocusedContainerColor = Zinc.Zinc900,
        )
    )
}

private fun formatViews(views: Int): String {
    return when {
        views >= 10000 -> "${views / 10000}만"
        views >= 1000 -> "${views / 1000}천"
        else -> "$views"
    }
}

private fun formatPrice(price: Int): String {
    val str = price.toString()
    val result = StringBuilder()
    for (i in str.indices) {
        if (i > 0 && (str.length - i) % 3 == 0) result.append(',')
        result.append(str[i])
    }
    return result.toString()
}
