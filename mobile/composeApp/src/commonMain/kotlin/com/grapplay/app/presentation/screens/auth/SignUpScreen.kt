package com.grapplay.app.presentation.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.grapplay.app.presentation.components.GradientButton
import com.grapplay.app.presentation.navigation.MainScreen
import com.grapplay.app.presentation.theme.Violet
import com.grapplay.app.presentation.theme.Zinc
import org.koin.compose.koinInject

class SignUpScreenRoute : Screen {
    @Composable
    override fun Content() {
        val viewModel: SignUpViewModel = koinInject()
        val navigator = LocalNavigator.currentOrThrow
        val state by viewModel.state.collectAsState()

        LaunchedEffect(state.isSuccess) {
            if (state.isSuccess) {
                navigator.replaceAll(MainScreen())
            }
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Zinc.Zinc950)
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text(
                text = "회원가입",
                style = MaterialTheme.typography.headlineMedium,
                color = Zinc.Zinc50,
            )

            Spacer(modifier = Modifier.height(32.dp))

            GrapplayTextField(
                value = state.name,
                onValueChange = viewModel::onNameChange,
                label = "이름",
            )
            Spacer(modifier = Modifier.height(12.dp))

            GrapplayTextField(
                value = state.email,
                onValueChange = viewModel::onEmailChange,
                label = "이메일",
                keyboardType = KeyboardType.Email,
            )
            Spacer(modifier = Modifier.height(12.dp))

            GrapplayTextField(
                value = state.password,
                onValueChange = viewModel::onPasswordChange,
                label = "비밀번호",
                isPassword = true,
                keyboardType = KeyboardType.Password,
            )
            Spacer(modifier = Modifier.height(12.dp))

            GrapplayTextField(
                value = state.confirmPassword,
                onValueChange = viewModel::onConfirmPasswordChange,
                label = "비밀번호 확인",
                isPassword = true,
                keyboardType = KeyboardType.Password,
                imeAction = ImeAction.Done,
                onDone = viewModel::signUp,
            )

            state.error?.let { error ->
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = error,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            GradientButton(
                text = if (state.isLoading) "가입 중..." else "회원가입",
                onClick = viewModel::signUp,
                enabled = !state.isLoading,
            )

            Spacer(modifier = Modifier.height(24.dp))

            Row {
                Text("이미 계정이 있으신가요? ", style = MaterialTheme.typography.bodySmall, color = Zinc.Zinc500)
                Text(
                    text = "로그인",
                    style = MaterialTheme.typography.bodySmall,
                    color = Violet.Violet400,
                    modifier = Modifier.clickable { navigator.pop() }
                )
            }
        }
    }
}
