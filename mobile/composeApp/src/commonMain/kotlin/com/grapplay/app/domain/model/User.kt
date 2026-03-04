package com.grapplay.app.domain.model

data class User(
    val id: String,
    val name: String,
    val email: String,
    val profileImage: String? = null,
    val belt: String? = null,
    val isSubscriber: Boolean = false,
    val isCreator: Boolean = false,
    val isAdmin: Boolean = false,
)

data class Subscription(
    val id: String,
    val userId: String,
    val tier: String, // "basic" | "premium"
    val billingPeriod: String, // "monthly" | "yearly"
    val status: String, // "active" | "cancelled" | "past_due"
    val currentPeriodEnd: String,
)
