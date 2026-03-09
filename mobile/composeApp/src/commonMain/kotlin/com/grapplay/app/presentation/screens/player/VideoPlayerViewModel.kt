package com.grapplay.app.presentation.screens.player

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.grapplay.app.domain.model.Lesson
import com.grapplay.app.domain.repository.CourseRepository
import com.grapplay.app.domain.repository.UserRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class VideoPlayerUiState(
    val lesson: Lesson? = null,
    val allLessons: List<Lesson> = emptyList(),
    val currentIndex: Int = 0,
    val isLoading: Boolean = true,
    val error: String? = null,
)

class VideoPlayerViewModel(
    private val courseRepository: CourseRepository,
    private val userRepository: UserRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(VideoPlayerUiState())
    val state: StateFlow<VideoPlayerUiState> = _state.asStateFlow()

    fun loadLesson(lessonId: String, courseId: String?) {
        viewModelScope.launch {
            _state.value = VideoPlayerUiState(isLoading = true)

            // Load the lesson
            courseRepository.getLessonById(lessonId)
                .onSuccess { lesson ->
                    _state.value = _state.value.copy(lesson = lesson, isLoading = false)

                    // Record view
                    userRepository.recordView("lesson", lessonId)

                    // If part of a course, load all lessons for navigation
                    val cId = courseId ?: lesson.courseId
                    if (cId != null) {
                        courseRepository.getLessonsByCourseId(cId)
                            .onSuccess { lessons ->
                                val index = lessons.indexOfFirst { it.id == lessonId }
                                _state.value = _state.value.copy(
                                    allLessons = lessons,
                                    currentIndex = if (index >= 0) index else 0,
                                )
                            }
                    }
                }
                .onFailure { e ->
                    _state.value = VideoPlayerUiState(
                        isLoading = false,
                        error = e.message ?: "레슨을 불러오는데 실패했습니다",
                    )
                }
        }
    }

    fun goToNextLesson() {
        val s = _state.value
        if (s.currentIndex < s.allLessons.lastIndex) {
            val nextLesson = s.allLessons[s.currentIndex + 1]
            loadLesson(nextLesson.id, nextLesson.courseId)
        }
    }

    fun goToPreviousLesson() {
        val s = _state.value
        if (s.currentIndex > 0) {
            val prevLesson = s.allLessons[s.currentIndex - 1]
            loadLesson(prevLesson.id, prevLesson.courseId)
        }
    }

    val hasNext: Boolean get() = _state.value.let { it.currentIndex < it.allLessons.lastIndex }
    val hasPrevious: Boolean get() = _state.value.currentIndex > 0
}
