package com.grapplay.app.presentation.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.grapplay.app.presentation.components.GradientButton
import com.grapplay.app.presentation.theme.Violet
import com.grapplay.app.presentation.theme.Zinc
import org.koin.compose.koinInject

class ForgotPasswordScreenRoute : Screen {
    @Composable
    override fun Content() {
        val viewModel: ForgotPasswordViewModel = koinInject()
        val navigator = LocalNavigator.currentOrThrow
        val state by viewModel.state.collectAsState()

        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Zinc.Zinc950)
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text(
                text = "비밀번호 찾기",
                style = MaterialTheme.typography.headlineMedium,
                color = Zinc.Zinc50,
            )

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = "가입하신 이메일을 입력하시면\n비밀번호 재설정 링크를 보내드립니다.",
                style = MaterialTheme.typography.bodyMedium,
                color = Zinc.Zinc400,
                textAlign = TextAlign.Center,
            )

            Spacer(modifier = Modifier.height(32.dp))

            if (state.isSuccess) {
                Text(
                    text = "이메일을 확인해주세요!\n비밀번호 재설정 링크를 보냈습니다.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Violet.Violet400,
                    textAlign = TextAlign.Center,
                )
                Spacer(modifier = Modifier.height(24.dp))
                TextButton(onClick = { navigator.pop() }) {
                    Text("로그인으로 돌아가기", color = Violet.Violet400)
                }
            } else {
                GrapplayTextField(
                    value = state.email,
                    onValueChange = viewModel::onEmailChange,
                    label = "이메일",
                    keyboardType = KeyboardType.Email,
                    imeAction = ImeAction.Done,
                    onDone = viewModel::resetPassword,
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
                    text = if (state.isLoading) "전송 중..." else "재설정 링크 보내기",
                    onClick = viewModel::resetPassword,
                    enabled = !state.isLoading,
                )

                Spacer(modifier = Modifier.height(16.dp))

                TextButton(onClick = { navigator.pop() }) {
                    Text("돌아가기", color = Zinc.Zinc500)
                }
            }
        }
    }
}
