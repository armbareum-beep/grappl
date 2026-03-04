package com.grapplay.app

import android.app.Application
import com.grapplay.app.di.initKoin

class MainApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        initKoin()
    }
}
