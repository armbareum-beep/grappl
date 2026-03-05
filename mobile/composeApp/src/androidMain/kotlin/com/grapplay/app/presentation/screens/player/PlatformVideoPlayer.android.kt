package com.grapplay.app.presentation.screens.player

import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
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
import androidx.media3.ui.PlayerView

@OptIn(UnstableApi::class)
@Composable
actual fun PlatformVideoPlayer(
    videoId: String,
    videoType: VideoType,
    modifier: Modifier,
    onProgressUpdate: (Float) -> Unit,
) {
    // Auto-detect Mux IDs regardless of the passed videoType, matching web app logic:
    // Mux IDs are 20+ alphanumeric chars with no slashes, not all digits
    if (isMuxPlaybackId(videoId)) {
        MuxExoPlayer(playbackId = videoId, modifier = modifier)
        return
    }
    when (videoType) {
        VideoType.VIMEO -> VimeoWebPlayer(vimeoUrl = videoId, modifier = modifier)
        VideoType.MUX -> MuxExoPlayer(playbackId = videoId, modifier = modifier)
    }
}

/** Mirrors web app isMuxPlaybackId: 20+ alphanumeric chars, not all digits, no slashes. */
private fun isMuxPlaybackId(id: String): Boolean {
    val trimmed = id.trim()
    if (trimmed.contains('/') || trimmed.contains('h') && trimmed.contains("ttp")) return false
    if (trimmed.all { it.isDigit() }) return false
    return trimmed.length >= 20 && trimmed.all { it.isLetterOrDigit() }
}

/**
 * Parses a Vimeo URL/ID into (videoId, hash). Matches all formats used in the DB:
 *   https://vimeo.com/123456789/abcdef1234  → ("123456789", "abcdef1234")
 *   https://vimeo.com/123456789?h=abcdef    → ("123456789", "abcdef")
 *   https://vimeo.com/123456789             → ("123456789", "")
 *   123456789:abcdef1234                    → ("123456789", "abcdef1234")
 *   123456789/abcdef1234                    → ("123456789", "abcdef1234")
 *   123456789                               → ("123456789", "")
 */
private fun parseVimeoUrl(url: String): Pair<String, String> {
    val cleaned = url.trim()

    // Bare numeric ID only
    if (cleaned.matches(Regex("""\d+"""))) return cleaned to ""

    // ID:HASH format (e.g. "123456789:abcdef")
    val colonMatch = Regex("""^(\d+):([a-zA-Z0-9]+)$""").matchEntire(cleaned)
    if (colonMatch != null) return colonMatch.groupValues[1] to colonMatch.groupValues[2]

    // ID/HASH format without domain (e.g. "123456789/abcdef")
    val slashMatch = Regex("""^(\d+)/([a-zA-Z0-9]+)$""").matchEntire(cleaned)
    if (slashMatch != null) return slashMatch.groupValues[1] to slashMatch.groupValues[2]

    // Full Vimeo URL — extract ID then hash from path or ?h= param
    val idMatch = Regex("""vimeo\.com/(?:video/)?(\d+)""").find(cleaned)
    if (idMatch != null) {
        val id = idMatch.groupValues[1]
        val hashFromPath = Regex("""vimeo\.com/(?:video/)?\d+/([a-zA-Z0-9]+)""").find(cleaned)?.groupValues?.get(1)
        val hashFromParam = Regex("""[?&]h=([a-zA-Z0-9]+)""").find(cleaned)?.groupValues?.get(1)
        return id to (hashFromPath ?: hashFromParam ?: "")
    }

    return cleaned to ""
}

@Composable
private fun VimeoWebPlayer(vimeoUrl: String, modifier: Modifier) {
    val (videoId, hash) = remember(vimeoUrl) { parseVimeoUrl(vimeoUrl) }

    val playerUrl = remember(videoId, hash) {
        buildString {
            append("https://player.vimeo.com/video/$videoId")
            append("?autoplay=1&title=0&byline=0&portrait=0&color=ffffff&badge=0&autopause=0&dnt=1&playsinline=1")
            if (hash.isNotEmpty()) append("&h=$hash")
        }
    }

    AndroidView(
        factory = { ctx ->
            WebView(ctx).apply {
                settings.apply {
                    javaScriptEnabled = true
                    mediaPlaybackRequiresUserGesture = false
                    domStorageEnabled = true
                }
                webChromeClient = WebChromeClient()
                webViewClient = WebViewClient()
                layoutParams = FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT,
                )
            }
        },
        update = { webView ->
            webView.loadUrl(playerUrl, mapOf("Referer" to "https://grapplay.com"))
        },
        modifier = modifier,
    )
}

@OptIn(UnstableApi::class)
@Composable
private fun MuxExoPlayer(playbackId: String, modifier: Modifier) {
    val context = LocalContext.current
    val player = remember { ExoPlayer.Builder(context).build() }

    DisposableEffect(playbackId) {
        val mediaItem = MediaItem.fromUri("https://stream.mux.com/$playbackId.m3u8")
        player.setMediaItem(mediaItem)
        player.prepare()
        player.playWhenReady = true
        onDispose { player.release() }
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
