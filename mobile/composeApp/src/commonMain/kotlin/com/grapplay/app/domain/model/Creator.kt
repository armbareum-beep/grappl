package com.grapplay.app.domain.model

data class Creator(
    val id: String,
    val name: String,
    val bio: String = "",
    val profileImage: String? = null,
    val subscriberCount: Int = 0,
    val courseCount: Int = 0,
    val routineCount: Int = 0,
    val sparringCount: Int = 0,
)
