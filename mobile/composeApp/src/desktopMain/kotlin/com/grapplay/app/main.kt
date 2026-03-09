package com.grapplay.app

import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application
import androidx.compose.ui.window.rememberWindowState
import com.grapplay.app.di.initKoin

fun main() = application {
    initKoin()

    Window(
        onCloseRequest = ::exitApplication,
        title = "Grapplay",
        state = rememberWindowState(width = 420.dp, height = 900.dp)
    ) {
        App()
    }
}
