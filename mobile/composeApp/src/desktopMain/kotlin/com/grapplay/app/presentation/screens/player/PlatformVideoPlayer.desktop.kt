package com.grapplay.app.presentation.screens.player

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.grapplay.app.presentation.theme.Zinc

// TODO: Implement desktop video player via VLCJ or JavaFX MediaView
// For now, show a placeholder. Full implementation options:
// 1. VLCJ library for VLC-based playback
// 2. JavaFX MediaView (limited HLS support)
// 3. WebView-based Vimeo embed
@Composable
actual fun PlatformVideoPlayer(
    videoId: String,
    videoType: VideoType,
    modifier: Modifier,
    onProgressUpdate: (Float) -> Unit,
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Zinc.Zinc900),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = "Desktop 비디오 플레이어 (구현 예정)",
            color = Zinc.Zinc400,
        )
    }
}
