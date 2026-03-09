package com.grapplay.app.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.grapplay.app.presentation.theme.Violet
import com.grapplay.app.presentation.theme.Zinc

@Composable
fun VideoThumbnail(
    thumbnailUrl: String?,
    duration: String? = null,
    modifier: Modifier = Modifier,
    aspectRatio: Float = 16f / 9f,
    showPlayButton: Boolean = true
) {
    Box(modifier = modifier) {
        AsyncImage(
            model = thumbnailUrl,
            contentDescription = null,
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(aspectRatio)
                .clip(RoundedCornerShape(12.dp))
                .background(Zinc.Zinc800),
            contentScale = ContentScale.Crop
        )

        if (showPlayButton) {
            Box(
                modifier = Modifier
                    .align(Alignment.Center)
                    .size(48.dp)
                    .background(
                        Violet.Violet600.copy(alpha = 0.9f),
                        CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.PlayArrow,
                    contentDescription = "Play",
                    tint = Zinc.Zinc50,
                    modifier = Modifier.size(28.dp)
                )
            }
        }

        duration?.let {
            Box(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(8.dp)
                    .background(
                        Zinc.Zinc950.copy(alpha = 0.85f),
                        RoundedCornerShape(4.dp)
                    )
                    .padding(horizontal = 6.dp, vertical = 2.dp)
            ) {
                Text(
                    text = it,
                    style = MaterialTheme.typography.labelSmall,
                    color = Zinc.Zinc200
                )
            }
        }
    }
}
