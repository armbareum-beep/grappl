package com.grapplay.app.presentation.screens.player

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

enum class VideoType { VIMEO, MUX }

/**
 * Platform-specific video player.
 * - Android: Media3/ExoPlayer with HLS support
 * - iOS: AVPlayer via UIKit interop
 * - Desktop: VLCJ or WebView fallback
 *
 * For Vimeo: Extract HLS URL from Vimeo config endpoint
 * For Mux: Use https://stream.mux.com/{playbackId}.m3u8
 */
@Composable
expect fun PlatformVideoPlayer(
    videoId: String,
    videoType: VideoType,
    modifier: Modifier = Modifier,
    onProgressUpdate: (Float) -> Unit = {}
)
