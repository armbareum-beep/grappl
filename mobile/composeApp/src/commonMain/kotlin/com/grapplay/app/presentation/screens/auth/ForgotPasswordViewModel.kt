package com.grapplay.app.presentation.screens.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.grapplay.app.domain.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ForgotPasswordUiState(
    val email: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    val isSuccess: Boolean = false,
)

class ForgotPasswordViewModel(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _state = MutableStateFlow(ForgotPasswordUiState())
    val state: StateFlow<ForgotPasswordUiState> = _state.asStateFlow()

    fun onEmailChange(email: String) { _state.value = _state.value.copy(email = email, error = null) }

    fun resetPassword() {
        val s = _state.value
        if (s.email.isBlank()) {
            _state.value = s.copy(error = "이메일을 입력해주세요")
            return
        }
        viewModelScope.launch {
            _state.value = s.copy(isLoading = true, error = null)
            authRepository.resetPassword(s.email)
                .onSuccess { _state.value = _state.value.copy(isLoading = false, isSuccess = true) }
                .onFailure { e ->
                    _state.value = _state.value.copy(
                        isLoading = false,
                        error = e.message ?: "비밀번호 재설정에 실패했습니다"
                    )
                }
        }
    }
}
