package com.grapplay.app.presentation.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.grapplay.app.presentation.components.GradientButton
import com.grapplay.app.presentation.navigation.MainScreen
import com.grapplay.app.presentation.theme.GrapplayGradients
import com.grapplay.app.presentation.theme.Violet
import com.grapplay.app.presentation.theme.Zinc
import org.koin.compose.koinInject

class LoginScreenRoute : Screen {
    @Composable
    override fun Content() {
        val viewModel: LoginViewModel = koinInject()
        val navigator = LocalNavigator.currentOrThrow
        val state by viewModel.state.collectAsState()

        LaunchedEffect(state.isSuccess) {
            if (state.isSuccess) {
                navigator.replaceAll(MainScreen())
            }
        }

        LoginScreenContent(
            state = state,
            onEmailChange = viewModel::onEmailChange,
            onPasswordChange = viewModel::onPasswordChange,
            onSignIn = viewModel::signIn,
            onSignUpClick = { navigator.push(SignUpScreenRoute()) },
            onForgotPasswordClick = { navigator.push(ForgotPasswordScreenRoute()) },
        )
    }
}

@Composable
private fun LoginScreenContent(
    state: LoginUiState,
    onEmailChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onSignIn: () -> Unit,
    onSignUpClick: () -> Unit,
    onForgotPasswordClick: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Zinc.Zinc950)
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        // Logo / Title
        Text(
            text = buildAnnotatedString {
                withStyle(SpanStyle(brush = GrapplayGradients.primary)) {
                    append("GRAPPLAY")
                }
            },
            style = MaterialTheme.typography.displaySmall,
            textAlign = TextAlign.Center,
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "주짓수의 모든 것",
            style = MaterialTheme.typography.bodyMedium,
            color = Zinc.Zinc400,
        )

        Spacer(modifier = Modifier.height(48.dp))

        // Email field
        GrapplayTextField(
            value = state.email,
            onValueChange = onEmailChange,
            label = "이메일",
            keyboardType = KeyboardType.Email,
            imeAction = ImeAction.Next,
        )

        Spacer(modifier = Modifier.height(12.dp))

        // Password field
        GrapplayTextField(
            value = state.password,
            onValueChange = onPasswordChange,
            label = "비밀번호",
            keyboardType = KeyboardType.Password,
            isPassword = true,
            imeAction = ImeAction.Done,
            onDone = onSignIn,
        )

        // Error message
        state.error?.let { error ->
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = error,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error,
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Forgot password
        Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.CenterEnd) {
            Text(
                text = "비밀번호 찾기",
                style = MaterialTheme.typography.bodySmall,
                color = Violet.Violet400,
                modifier = Modifier.clickable(onClick = onForgotPasswordClick)
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Sign in button
        GradientButton(
            text = if (state.isLoading) "로그인 중..." else "로그인",
            onClick = onSignIn,
            enabled = !state.isLoading,
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Sign up link
        Row {
            Text(
                text = "계정이 없으신가요? ",
                style = MaterialTheme.typography.bodySmall,
                color = Zinc.Zinc500,
            )
            Text(
                text = "회원가입",
                style = MaterialTheme.typography.bodySmall,
                color = Violet.Violet400,
                modifier = Modifier.clickable(onClick = onSignUpClick)
            )
        }
    }
}

@Composable
fun GrapplayTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    keyboardType: KeyboardType = KeyboardType.Text,
    isPassword: Boolean = false,
    imeAction: ImeAction = ImeAction.Next,
    onDone: (() -> Unit)? = null,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label, color = Zinc.Zinc500) },
        modifier = modifier.fillMaxWidth(),
        singleLine = true,
        shape = RoundedCornerShape(12.dp),
        visualTransformation = if (isPassword) PasswordVisualTransformation() else androidx.compose.ui.text.input.VisualTransformation.None,
        keyboardOptions = KeyboardOptions(
            keyboardType = keyboardType,
            imeAction = imeAction,
        ),
        keyboardActions = KeyboardActions(
            onDone = { onDone?.invoke() }
        ),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = Violet.Violet500,
            unfocusedBorderColor = Zinc.Zinc700,
            cursorColor = Violet.Violet400,
            focusedContainerColor = Zinc.Zinc900,
            unfocusedContainerColor = Zinc.Zinc900,
            focusedTextColor = Zinc.Zinc50,
            unfocusedTextColor = Zinc.Zinc50,
        )
    )
}
