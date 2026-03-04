package com.grapplay.app.presentation.navigation

import androidx.compose.runtime.Composable
import cafe.adriel.voyager.core.screen.Screen

class MainScreen : Screen {
    @Composable
    override fun Content() {
        MainTabNavigation()
    }
}
