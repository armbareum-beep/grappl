package com.grapplay.app

import androidx.compose.ui.window.ComposeUIViewController
import com.grapplay.app.di.initKoin

fun MainViewController() = ComposeUIViewController(
    configure = { initKoin() }
) {
    App()
}
