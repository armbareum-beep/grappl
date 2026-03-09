package com.grapplay.app.domain.model

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class LessonTest {

    @Test
    fun `default lesson has isPreview false`() {
        val lesson = Lesson(id = "1", title = "Guard Passing 101")
        assertFalse(lesson.isPreview)
    }

    @Test
    fun `default lesson has views of zero`() {
        val lesson = Lesson(id = "2", title = "Arm Locks")
        assertEquals(0, lesson.views)
    }

    @Test
    fun `default lesson has likes of zero`() {
        val lesson = Lesson(id = "3", title = "Leg Entanglements")
        assertEquals(0, lesson.likes)
    }

    @Test
    fun `default lesson has no courseId`() {
        val lesson = Lesson(id = "4", title = "Takedowns")
        assertNull(lesson.courseId)
    }

    @Test
    fun `lesson stores title correctly`() {
        val lesson = Lesson(id = "5", title = "Back Takes")
        assertEquals("Back Takes", lesson.title)
    }

    @Test
    fun `lesson equality is based on data class fields`() {
        val l1 = Lesson(id = "6", title = "Guard Retention", views = 100)
        val l2 = Lesson(id = "6", title = "Guard Retention", views = 100)
        assertEquals(l1, l2)
    }

    @Test
    fun `lesson copy updates only specified fields`() {
        val original = Lesson(id = "7", title = "Half Guard", views = 50)
        val updated = original.copy(views = 200)
        assertEquals(200, updated.views)
        assertEquals("Half Guard", updated.title)
        assertEquals("7", updated.id)
    }

    @Test
    fun `preview lesson has isPreview true`() {
        val lesson = Lesson(id = "8", title = "Intro to BJJ", isPreview = true)
        assertTrue(lesson.isPreview)
    }
}
