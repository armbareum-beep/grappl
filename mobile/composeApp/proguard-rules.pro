# Grapplay ProGuard Rules

# Keep all app classes
-keep class com.grapplay.app.** { *; }

# Kotlin Multiplatform
-keepattributes *Annotation*, Signature, Exception
-dontwarn kotlinx.**

# Supabase / Ktor serialization
-keep class io.github.jan.tennert.supabase.** { *; }
-keep class io.ktor.** { *; }

# Kotlinx Serialization
-keepattributes InnerClasses
-keep class kotlinx.serialization.** { *; }
-keepclassmembers class ** {
    @kotlinx.serialization.Serializable *;
}

# Coroutines
-keep class kotlinx.coroutines.** { *; }
-dontwarn kotlinx.coroutines.**

# Ktor debug classes not available on Android
-dontwarn java.lang.management.ManagementFactory
-dontwarn java.lang.management.RuntimeMXBean
