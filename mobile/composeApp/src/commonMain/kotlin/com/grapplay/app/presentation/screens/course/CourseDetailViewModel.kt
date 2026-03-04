package com.grapplay.app.presentation.screens.course

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.grapplay.app.domain.model.Course
import com.grapplay.app.domain.model.Lesson
import com.grapplay.app.domain.repository.CourseRepository
import com.grapplay.app.domain.repository.UserRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class CourseDetailUiState(
    val course: Course? = null,
    val lessons: List<Lesson> = emptyList(),
    val isSaved: Boolean = false,
    val isLiked: Boolean = false,
    val isLoading: Boolean = true,
    val error: String? = null,
)

class CourseDetailViewModel(
    private val courseRepository: CourseRepository,
    private val userRepository: UserRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(CourseDetailUiState())
    val state: StateFlow<CourseDetailUiState> = _state.asStateFlow()

    fun loadCourse(courseId: String) {
        viewModelScope.launch {
            _state.value = CourseDetailUiState(isLoading = true)

            courseRepository.getCourseWithLessons(courseId)
                .onSuccess { (course, lessons) ->
                    _state.value = CourseDetailUiState(
                        course = course,
                        lessons = lessons,
                        isLoading = false,
                    )
                    // Check interactions
                    checkInteractions(courseId)
                    // Record view
                    userRepository.recordView("course", courseId)
                }
                .onFailure { e ->
                    _state.value = CourseDetailUiState(
                        isLoading = false,
                        error = e.message ?: "강좌를 불러오는데 실패했습니다"
                    )
                }
        }
    }

    private suspend fun checkInteractions(courseId: String) {
        val isSaved = userRepository.hasInteraction("course", courseId, "save").getOrDefault(false)
        val isLiked = userRepository.hasInteraction("course", courseId, "like").getOrDefault(false)
        _state.value = _state.value.copy(isSaved = isSaved, isLiked = isLiked)
    }

    fun toggleSave() {
        val course = _state.value.course ?: return
        viewModelScope.launch {
            userRepository.toggleInteraction("course", course.id, "save")
                .onSuccess { isNowSaved ->
                    _state.value = _state.value.copy(isSaved = isNowSaved)
                }
        }
    }

    fun toggleLike() {
        val course = _state.value.course ?: return
        viewModelScope.launch {
            userRepository.toggleInteraction("course", course.id, "like")
                .onSuccess { isNowLiked ->
                    _state.value = _state.value.copy(isLiked = isNowLiked)
                }
        }
    }
}
