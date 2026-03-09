package com.grapplay.app.presentation.screens.saved

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.grapplay.app.domain.model.Course
import com.grapplay.app.domain.model.DrillRoutine
import com.grapplay.app.domain.model.Lesson
import com.grapplay.app.domain.repository.BrowseRepository
import com.grapplay.app.domain.repository.UserRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class SavedUiState(
    val savedCourses: List<Course> = emptyList(),
    val savedLessons: List<Lesson> = emptyList(),
    val savedRoutines: List<DrillRoutine> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null,
    val selectedTab: Int = 0,
)

class SavedViewModel(
    private val userRepository: UserRepository,
    private val browseRepository: BrowseRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(SavedUiState())
    val state: StateFlow<SavedUiState> = _state.asStateFlow()

    init {
        loadSaved()
    }

    fun selectTab(tab: Int) {
        _state.value = _state.value.copy(selectedTab = tab)
        loadSaved()
    }

    private fun clearCurrentTab() {
        _state.value = when (_state.value.selectedTab) {
            0 -> _state.value.copy(savedCourses = emptyList(), isLoading = false)
            1 -> _state.value.copy(savedLessons = emptyList(), isLoading = false)
            else -> _state.value.copy(savedRoutines = emptyList(), isLoading = false)
        }
    }

    fun loadSaved() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            val contentType = when (_state.value.selectedTab) {
                0 -> "course"
                1 -> "lesson"
                else -> "routine"
            }
            userRepository.getSavedContentIds(contentType)
                .onSuccess { ids ->
                    if (ids.isEmpty()) {
                        clearCurrentTab()
                        return@onSuccess
                    }
                    when (contentType) {
                        "course" -> browseRepository.searchCourses(limit = 50)
                            .onSuccess { allCourses ->
                                val saved = allCourses.filter { it.id in ids }
                                _state.value = _state.value.copy(savedCourses = saved, isLoading = false)
                            }
                            .onFailure { e ->
                                _state.value = _state.value.copy(isLoading = false, error = e.message)
                            }
                        "lesson" -> browseRepository.getLessonsByIds(ids)
                            .onSuccess { lessons ->
                                _state.value = _state.value.copy(savedLessons = lessons, isLoading = false)
                            }
                            .onFailure { e ->
                                _state.value = _state.value.copy(isLoading = false, error = e.message)
                            }
                        else -> browseRepository.getRoutinesByIds(ids)
                            .onSuccess { routines ->
                                _state.value = _state.value.copy(savedRoutines = routines, isLoading = false)
                            }
                            .onFailure { e ->
                                _state.value = _state.value.copy(isLoading = false, error = e.message)
                            }
                    }
                }
                .onFailure { e ->
                    _state.value = _state.value.copy(
                        isLoading = false,
                        error = e.message ?: "저장된 콘텐츠를 불러오는데 실패했습니다"
                    )
                }
        }
    }
}
