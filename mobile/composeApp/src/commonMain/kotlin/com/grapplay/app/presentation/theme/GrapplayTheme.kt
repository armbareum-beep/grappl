package com.grapplay.app.presentation.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import com.materialkolor.rememberDynamicColorScheme
import com.materialkolor.PaletteStyle

@Composable
fun GrapplayTheme(
    darkTheme: Boolean = true,
    content: @Composable () -> Unit
) {
    // Generate Material 3 color scheme from violet seed
    val dynamicScheme = rememberDynamicColorScheme(
        primary = Violet.Violet600,
        isDark = darkTheme,
        isAmoled = false,
        style = PaletteStyle.TonalSpot
    )

    // Override with exact Grapplay Zinc/Violet values
    val colorScheme = dynamicScheme.copy(
        background = Zinc.Zinc950,
        onBackground = Zinc.Zinc50,
        surface = Zinc.Zinc900,
        onSurface = Zinc.Zinc50,
        surfaceVariant = Zinc.Zinc800,
        onSurfaceVariant = Zinc.Zinc400,
        surfaceContainer = Zinc.Zinc900,
        surfaceContainerHigh = Zinc.Zinc800,
        surfaceContainerHighest = Zinc.Zinc700,
        surfaceContainerLow = Zinc.Zinc950,
        surfaceContainerLowest = Zinc.Zinc950,
        surfaceDim = Zinc.Zinc950,
        surfaceBright = Zinc.Zinc800,
        primary = Violet.Violet500,
        onPrimary = Zinc.Zinc50,
        primaryContainer = Violet.Violet800,
        onPrimaryContainer = Violet.Violet100,
        secondary = Zinc.Zinc700,
        onSecondary = Zinc.Zinc50,
        secondaryContainer = Zinc.Zinc800,
        onSecondaryContainer = Zinc.Zinc200,
        tertiary = Violet.Violet400,
        onTertiary = Zinc.Zinc950,
        outline = Zinc.Zinc700,
        outlineVariant = Zinc.Zinc800,
        inverseSurface = Zinc.Zinc100,
        inverseOnSurface = Zinc.Zinc900,
        inversePrimary = Violet.Violet600,
        error = StatusColors.Error,
        onError = Zinc.Zinc50,
    )

    MaterialTheme(
        colorScheme = colorScheme,
        typography = GrapplayTypography,
        content = content
    )
}
