package com.grapplay.app.presentation.screens.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.grapplay.app.domain.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class LoginUiState(
    val email: String = "",
    val password: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    val isSuccess: Boolean = false,
)

class LoginViewModel(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _state = MutableStateFlow(LoginUiState())
    val state: StateFlow<LoginUiState> = _state.asStateFlow()

    fun onEmailChange(email: String) {
        _state.value = _state.value.copy(email = email, error = null)
    }

    fun onPasswordChange(password: String) {
        _state.value = _state.value.copy(password = password, error = null)
    }

    fun signIn() {
        val current = _state.value
        if (current.email.isBlank() || current.password.isBlank()) {
            _state.value = current.copy(error = "이메일과 비밀번호를 입력해주세요")
            return
        }

        viewModelScope.launch {
            _state.value = current.copy(isLoading = true, error = null)
            authRepository.signIn(current.email, current.password)
                .onSuccess {
                    _state.value = _state.value.copy(isLoading = false, isSuccess = true)
                }
                .onFailure { e ->
                    _state.value = _state.value.copy(
                        isLoading = false,
                        error = e.message ?: "로그인에 실패했습니다"
                    )
                }
        }
    }
}
