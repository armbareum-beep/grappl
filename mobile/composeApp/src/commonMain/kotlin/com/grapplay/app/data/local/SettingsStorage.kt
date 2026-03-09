package com.grapplay.app.data.local

import com.russhwolf.settings.Settings
import com.russhwolf.settings.get
import com.russhwolf.settings.set

class SettingsStorage(private val settings: Settings = Settings()) {

    var lastViewedCourseId: String?
        get() = settings["last_viewed_course_id"]
        set(value) { settings["last_viewed_course_id"] = value }

    var hasCompletedOnboarding: Boolean
        get() = settings["has_completed_onboarding", false]
        set(value) { settings["has_completed_onboarding"] = value }

    fun clear() {
        settings.clear()
    }
}
