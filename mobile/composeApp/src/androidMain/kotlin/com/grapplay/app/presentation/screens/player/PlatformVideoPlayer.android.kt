package com.grapplay.app.presentation.screens.player

import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.annotation.OptIn
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.hls.HlsMediaSource
import androidx.media3.ui.PlayerView

@OptIn(UnstableApi::class)
@Composable
actual fun PlatformVideoPlayer(
    videoId: String,
    videoType: VideoType,
    modifier: Modifier,
    onProgressUpdate: (Float) -> Unit,
) {
    val context = LocalContext.current

    val player = remember {
        ExoPlayer.Builder(context).build()
    }

    DisposableEffect(videoId) {
        val hlsUrl = when (videoType) {
            VideoType.MUX -> "https://stream.mux.com/$videoId.m3u8"
            VideoType.VIMEO -> {
                // For Vimeo, the videoId should be the HLS URL extracted from Vimeo config
                // The URL extraction should happen in the ViewModel/API layer
                videoId
            }
        }

        val mediaItem = MediaItem.fromUri(hlsUrl)
        player.setMediaItem(mediaItem)
        player.prepare()
        player.playWhenReady = true

        onDispose {
            player.release()
        }
    }

    AndroidView(
        factory = { ctx ->
            PlayerView(ctx).apply {
                this.player = player
                layoutParams = FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT,
                )
                useController = true
            }
        },
        modifier = modifier,
    )
}
