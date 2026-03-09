package com.grapplay.app.data.remote

import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.storage.Storage
import io.github.jan.supabase.functions.Functions

object SupabaseConfig {
    const val URL = "https://vbfxwlhngyvafskyukxa.supabase.co"
    const val ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiZnh3bGhuZ3l2YWZza3l1a3hhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4NzkxNjAsImV4cCI6MjA3OTQ1NTE2MH0.khnDGS4WLs_hWxfT7FRoUlJnxsjCX4_yY9qA88i4gug"
}

val supabaseClient = createSupabaseClient(
    supabaseUrl = SupabaseConfig.URL,
    supabaseKey = SupabaseConfig.ANON_KEY
) {
    install(Auth) {
        // Session persistence is handled automatically by supabase-kt
    }
    install(Postgrest)
    install(Storage)
    install(Functions)
}
