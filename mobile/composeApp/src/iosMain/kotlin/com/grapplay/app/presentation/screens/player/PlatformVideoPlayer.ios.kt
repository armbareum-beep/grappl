package com.grapplay.app.presentation.screens.player

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.UIKitView
import kotlinx.cinterop.ExperimentalForeignApi
import platform.CoreGraphics.CGRectMake
import platform.Foundation.NSURL
import platform.WebKit.WKAudiovisualMediaTypeNone
import platform.WebKit.WKWebView
import platform.WebKit.WKWebViewConfiguration

@Composable
actual fun PlatformVideoPlayer(
    videoId: String,
    videoType: VideoType,
    modifier: Modifier,
    onProgressUpdate: (Float) -> Unit,
) {
    val playerUrl = when {
        isMuxPlaybackId(videoId) -> "https://stream.mux.com/$videoId.m3u8"
        else -> {
            val (id, hash) = parseVimeoUrl(videoId)
            buildString {
                append("https://player.vimeo.com/video/$id")
                append("?autoplay=1&title=0&byline=0&portrait=0&color=ffffff&badge=0&autopause=0&dnt=1&playsinline=1")
                if (hash.isNotEmpty()) append("&h=$hash")
            }
        }
    }
    VimeoWebView(playerUrl = playerUrl, modifier = modifier)
}

private fun isMuxPlaybackId(id: String): Boolean {
    val trimmed = id.trim()
    if (trimmed.contains('/') || (trimmed.contains('h') && trimmed.contains("ttp"))) return false
    if (trimmed.all { it.isDigit() }) return false
    return trimmed.length >= 20 && trimmed.all { it.isLetterOrDigit() }
}

private fun parseVimeoUrl(url: String): Pair<String, String> {
    val cleaned = url.trim()
    if (cleaned.matches(Regex("""\d+"""))) return cleaned to ""
    val colonMatch = Regex("""^(\d+):([a-zA-Z0-9]+)$""").matchEntire(cleaned)
    if (colonMatch != null) return colonMatch.groupValues[1] to colonMatch.groupValues[2]
    val slashMatch = Regex("""^(\d+)/([a-zA-Z0-9]+)$""").matchEntire(cleaned)
    if (slashMatch != null) return slashMatch.groupValues[1] to slashMatch.groupValues[2]
    val idMatch = Regex("""vimeo\.com/(?:video/)?(\d+)""").find(cleaned)
    if (idMatch != null) {
        val id = idMatch.groupValues[1]
        val hashFromPath = Regex("""vimeo\.com/(?:video/)?\d+/([a-zA-Z0-9]+)""").find(cleaned)?.groupValues?.get(1)
        val hashFromParam = Regex("""[?&]h=([a-zA-Z0-9]+)""").find(cleaned)?.groupValues?.get(1)
        return id to (hashFromPath ?: hashFromParam ?: "")
    }
    return cleaned to ""
}

/**
 * Loads the Vimeo player in a WKWebView using an HTML wrapper with baseURL=https://grapplay.com
 * so Vimeo's domain privacy check passes (Referer = grapplay.com).
 * allowsInlineMediaPlayback + mediaTypesRequiringUserActionForPlayback=None enables autoplay.
 */
@OptIn(ExperimentalForeignApi::class)
@Composable
private fun VimeoWebView(playerUrl: String, modifier: Modifier) {
    val htmlContent = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
                iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; }
            </style>
        </head>
        <body>
            <iframe src="$playerUrl"
                frameborder="0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowfullscreen>
            </iframe>
        </body>
        </html>
    """.trimIndent()

    UIKitView(
        factory = {
            val config = WKWebViewConfiguration().apply {
                allowsInlineMediaPlayback = true
                mediaTypesRequiringUserActionForPlayback = WKAudiovisualMediaTypeNone
            }
            val webView = WKWebView(
                frame = CGRectMake(0.0, 0.0, 0.0, 0.0),
                configuration = config,
            )
            webView.loadHTMLString(
                htmlContent,
                baseURL = NSURL.URLWithString("https://grapplay.com"),
            )
            webView
        },
        modifier = modifier,
    )
}
