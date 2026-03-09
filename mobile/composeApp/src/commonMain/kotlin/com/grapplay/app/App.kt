package com.grapplay.app

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import cafe.adriel.voyager.navigator.Navigator
import cafe.adriel.voyager.transitions.SlideTransition
import com.grapplay.app.domain.repository.AuthRepository
import com.grapplay.app.presentation.navigation.MainScreen
import com.grapplay.app.presentation.screens.auth.LoginScreenRoute
import com.grapplay.app.presentation.theme.GrapplayTheme
import org.koin.compose.koinInject

@Composable
fun App() {
    GrapplayTheme {
        val authRepository: AuthRepository = koinInject()
        val isLoggedIn by authRepository.isLoggedIn.collectAsState(initial = false)

        key(isLoggedIn) {
            Navigator(
                screen = if (isLoggedIn) MainScreen() else LoginScreenRoute()
            ) {
                SlideTransition(it)
            }
        }
    }
}
