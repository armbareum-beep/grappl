package com.grapplay.app.presentation.screens.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.grapplay.app.domain.model.HomePageData
import com.grapplay.app.domain.repository.HomeRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class HomeUiState(
    val data: HomePageData? = null,
    val isLoading: Boolean = true,
    val error: String? = null,
)

class HomeViewModel(
    private val homeRepository: HomeRepository
) : ViewModel() {

    private val _state = MutableStateFlow(HomeUiState())
    val state: StateFlow<HomeUiState> = _state.asStateFlow()

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            homeRepository.getHomePageData()
                .onSuccess { data ->
                    _state.value = HomeUiState(data = data, isLoading = false)
                }
                .onFailure { e ->
                    _state.value = HomeUiState(
                        isLoading = false,
                        error = e.message ?: "데이터를 불러오는데 실패했습니다"
                    )
                }
        }
    }
}
