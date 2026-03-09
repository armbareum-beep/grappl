package com.grapplay.app.presentation.theme

import androidx.compose.ui.graphics.Brush

object GrapplayGradients {
    /** Primary brand gradient: Violet → Purple → Fuchsia */
    val primary = Brush.horizontalGradient(
        colors = listOf(Violet.Violet400, Purple.Purple400, Fuchsia.Fuchsia400)
    )

    /** Button gradient: Violet 600 → Indigo 500 */
    val button = Brush.horizontalGradient(
        colors = listOf(Violet.Violet600, Indigo.Indigo500)
    )

    /** Premium gradient: Violet 600 → Indigo 400 → Fuchsia 400 */
    val premium = Brush.horizontalGradient(
        colors = listOf(Violet.Violet600, Indigo.Indigo400, Fuchsia.Fuchsia400)
    )

    /** Card shimmer gradient */
    val cardShimmer = Brush.horizontalGradient(
        colors = listOf(Zinc.Zinc800, Zinc.Zinc700, Zinc.Zinc800)
    )

    /** Vertical fade for overlaying thumbnails */
    val thumbnailOverlay = Brush.verticalGradient(
        colors = listOf(
            Zinc.Zinc950.copy(alpha = 0f),
            Zinc.Zinc950.copy(alpha = 0.6f),
            Zinc.Zinc950
        )
    )

    /** Surface gradient for cards */
    val surfaceGradient = Brush.verticalGradient(
        colors = listOf(Zinc.Zinc800, Zinc.Zinc900)
    )
}
