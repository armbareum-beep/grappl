package com.grapplay.app.domain.repository

import com.grapplay.app.domain.model.HomePageData

interface HomeRepository {
    suspend fun getHomePageData(): Result<HomePageData>
}
