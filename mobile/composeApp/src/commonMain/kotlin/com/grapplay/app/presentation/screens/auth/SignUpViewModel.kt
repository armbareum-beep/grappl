package com.grapplay.app.presentation.screens.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.grapplay.app.domain.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class SignUpUiState(
    val name: String = "",
    val email: String = "",
    val password: String = "",
    val confirmPassword: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    val isSuccess: Boolean = false,
)

class SignUpViewModel(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _state = MutableStateFlow(SignUpUiState())
    val state: StateFlow<SignUpUiState> = _state.asStateFlow()

    fun onNameChange(name: String) { _state.value = _state.value.copy(name = name, error = null) }
    fun onEmailChange(email: String) { _state.value = _state.value.copy(email = email, error = null) }
    fun onPasswordChange(password: String) { _state.value = _state.value.copy(password = password, error = null) }
    fun onConfirmPasswordChange(password: String) { _state.value = _state.value.copy(confirmPassword = password, error = null) }

    fun signUp() {
        val s = _state.value
        when {
            s.name.isBlank() || s.email.isBlank() || s.password.isBlank() -> {
                _state.value = s.copy(error = "모든 필드를 입력해주세요")
                return
            }
            s.password != s.confirmPassword -> {
                _state.value = s.copy(error = "비밀번호가 일치하지 않습니다")
                return
            }
            s.password.length < 6 -> {
                _state.value = s.copy(error = "비밀번호는 6자 이상이어야 합니다")
                return
            }
        }

        viewModelScope.launch {
            _state.value = s.copy(isLoading = true, error = null)
            authRepository.signUp(s.email, s.password, s.name)
                .onSuccess {
                    _state.value = _state.value.copy(isLoading = false, isSuccess = true)
                }
                .onFailure { e ->
                    _state.value = _state.value.copy(
                        isLoading = false,
                        error = e.message ?: "회원가입에 실패했습니다"
                    )
                }
        }
    }
}
