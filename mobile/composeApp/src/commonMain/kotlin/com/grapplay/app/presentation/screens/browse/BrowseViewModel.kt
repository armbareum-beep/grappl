package com.grapplay.app.presentation.screens.browse

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.grapplay.app.domain.model.Course
import com.grapplay.app.domain.repository.BrowseRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class BrowseUiState(
    val query: String = "",
    val selectedCategory: String? = null,
    val selectedDifficulty: String? = null,
    val selectedUniform: String? = null,
    val courses: List<Course> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null,
)

class BrowseViewModel(
    private val browseRepository: BrowseRepository
) : ViewModel() {

    private val _state = MutableStateFlow(BrowseUiState())
    val state: StateFlow<BrowseUiState> = _state.asStateFlow()

    private var searchJob: Job? = null

    companion object {
        val CATEGORIES = listOf("Standing", "Guard", "Passing", "Side", "Mount", "Back", "Submission")
        val CATEGORY_LABELS = mapOf(
            "Standing" to "스탠딩",
            "Guard" to "가드",
            "Passing" to "패싱",
            "Side" to "사이드",
            "Mount" to "마운트",
            "Back" to "백",
            "Submission" to "서브미션"
        )
        val DIFFICULTIES = listOf("Beginner", "Intermediate", "Advanced")
        val DIFFICULTY_LABELS = mapOf(
            "Beginner" to "초급",
            "Intermediate" to "중급",
            "Advanced" to "고급"
        )
        val UNIFORMS = listOf("Gi", "No-Gi")
    }

    init {
        search()
    }

    fun onQueryChange(query: String) {
        _state.value = _state.value.copy(query = query)
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(300) // Debounce
            search()
        }
    }

    fun onCategorySelect(category: String?) {
        _state.value = _state.value.copy(
            selectedCategory = if (_state.value.selectedCategory == category) null else category
        )
        search()
    }

    fun onDifficultySelect(difficulty: String?) {
        _state.value = _state.value.copy(
            selectedDifficulty = if (_state.value.selectedDifficulty == difficulty) null else difficulty
        )
        search()
    }

    fun onUniformSelect(uniform: String?) {
        _state.value = _state.value.copy(
            selectedUniform = if (_state.value.selectedUniform == uniform) null else uniform
        )
        search()
    }

    fun search() {
        val s = _state.value
        viewModelScope.launch {
            _state.value = s.copy(isLoading = true, error = null)
            browseRepository.searchCourses(
                query = s.query.ifBlank { null },
                category = s.selectedCategory,
                difficulty = s.selectedDifficulty,
                uniformType = s.selectedUniform,
            )
                .onSuccess { courses ->
                    _state.value = _state.value.copy(courses = courses, isLoading = false)
                }
                .onFailure { e ->
                    _state.value = _state.value.copy(
                        isLoading = false,
                        error = e.message ?: "검색에 실패했습니다"
                    )
                }
        }
    }
}
