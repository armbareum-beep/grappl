package com.grapplay.app.di

import com.grapplay.app.data.local.SettingsStorage
import com.grapplay.app.data.remote.api.AuthApi
import com.grapplay.app.data.remote.api.BrowseApi
import com.grapplay.app.data.remote.api.CourseApi
import com.grapplay.app.data.remote.api.HomeApi
import com.grapplay.app.data.remote.api.UserApi
import com.grapplay.app.data.remote.supabaseClient
import com.grapplay.app.data.repository.AuthRepositoryImpl
import com.grapplay.app.data.repository.BrowseRepositoryImpl
import com.grapplay.app.data.repository.CourseRepositoryImpl
import com.grapplay.app.data.repository.HomeRepositoryImpl
import com.grapplay.app.data.repository.UserRepositoryImpl
import com.grapplay.app.domain.repository.AuthRepository
import com.grapplay.app.domain.repository.BrowseRepository
import com.grapplay.app.domain.repository.CourseRepository
import com.grapplay.app.domain.repository.HomeRepository
import com.grapplay.app.domain.repository.UserRepository
import com.grapplay.app.presentation.screens.auth.LoginViewModel
import com.grapplay.app.presentation.screens.auth.SignUpViewModel
import com.grapplay.app.presentation.screens.auth.ForgotPasswordViewModel
import com.grapplay.app.presentation.screens.browse.BrowseViewModel
import com.grapplay.app.presentation.screens.course.CourseDetailViewModel
import com.grapplay.app.presentation.screens.home.HomeViewModel
import com.grapplay.app.presentation.screens.player.VideoPlayerViewModel
import com.grapplay.app.presentation.screens.profile.ProfileViewModel
import com.grapplay.app.presentation.screens.saved.SavedViewModel
import org.koin.core.context.startKoin
import org.koin.core.module.dsl.factoryOf
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.bind
import org.koin.dsl.module

val dataModule = module {
    // Supabase client (singleton)
    single { supabaseClient }

    // API services
    singleOf(::AuthApi)
    singleOf(::HomeApi)
    singleOf(::CourseApi)
    singleOf(::BrowseApi)
    singleOf(::UserApi)

    // Local storage
    singleOf(::SettingsStorage)

    // Repositories
    singleOf(::AuthRepositoryImpl) bind AuthRepository::class
    singleOf(::HomeRepositoryImpl) bind HomeRepository::class
    singleOf(::CourseRepositoryImpl) bind CourseRepository::class
    singleOf(::BrowseRepositoryImpl) bind BrowseRepository::class
    singleOf(::UserRepositoryImpl) bind UserRepository::class
}

val viewModelModule = module {
    factoryOf(::LoginViewModel)
    factoryOf(::SignUpViewModel)
    factoryOf(::ForgotPasswordViewModel)
    factoryOf(::HomeViewModel)
    factoryOf(::BrowseViewModel)
    factoryOf(::CourseDetailViewModel)
    factoryOf(::VideoPlayerViewModel)
    factoryOf(::SavedViewModel)
    factoryOf(::ProfileViewModel)
}

fun initKoin() {
    startKoin {
        modules(dataModule, viewModelModule)
    }
}
