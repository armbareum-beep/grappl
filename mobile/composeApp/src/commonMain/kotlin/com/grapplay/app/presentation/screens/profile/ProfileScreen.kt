package com.grapplay.app.presentation.screens.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.grapplay.app.presentation.components.LoadingState
import com.grapplay.app.presentation.theme.Violet
import com.grapplay.app.presentation.theme.Zinc
import org.koin.compose.koinInject

@Composable
fun ProfileScreen() {
    val viewModel: ProfileViewModel = koinInject()
    val state by viewModel.state.collectAsState()

    if (state.isLoading) {
        LoadingState()
        return
    }

    val user = state.user

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Zinc.Zinc950)
            .padding(top = 24.dp)
    ) {
        // Profile header
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            // Avatar
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(CircleShape)
                    .background(Violet.Violet800),
                contentAlignment = Alignment.Center
            ) {
                if (user?.profileImage != null) {
                    AsyncImage(
                        model = user.profileImage,
                        contentDescription = "프로필",
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop,
                    )
                } else {
                    Icon(
                        Icons.Default.Person,
                        contentDescription = "프로필",
                        tint = Violet.Violet300,
                        modifier = Modifier.size(40.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = user?.name ?: "사용자",
                style = MaterialTheme.typography.titleLarge,
                color = Zinc.Zinc50,
            )

            Text(
                text = user?.email ?: "",
                style = MaterialTheme.typography.bodySmall,
                color = Zinc.Zinc400,
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Menu items
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(Zinc.Zinc900)
        ) {
            ProfileMenuItem(
                icon = Icons.Default.Settings,
                title = "설정",
                onClick = { /* TODO */ }
            )
            HorizontalDivider(color = Zinc.Zinc800)
            ProfileMenuItem(
                icon = Icons.Default.Notifications,
                title = "알림 설정",
                onClick = { /* TODO */ }
            )
            HorizontalDivider(color = Zinc.Zinc800)
            ProfileMenuItem(
                icon = Icons.Default.Info,
                title = "앱 정보",
                subtitle = "v1.0.0",
                onClick = { /* TODO */ }
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Sign out
        TextButton(
            onClick = viewModel::signOut,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
        ) {
            Icon(
                Icons.AutoMirrored.Filled.ExitToApp,
                contentDescription = null,
                tint = Zinc.Zinc500,
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "로그아웃",
                color = Zinc.Zinc500,
            )
        }
    }
}

@Composable
private fun ProfileMenuItem(
    icon: ImageVector,
    title: String,
    subtitle: String? = null,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = Zinc.Zinc400,
            modifier = Modifier.size(22.dp)
        )
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyMedium,
                color = Zinc.Zinc50,
            )
            subtitle?.let {
                Text(
                    text = it,
                    style = MaterialTheme.typography.labelSmall,
                    color = Zinc.Zinc500,
                )
            }
        }
        Icon(
            Icons.Default.ChevronRight,
            contentDescription = null,
            tint = Zinc.Zinc600,
            modifier = Modifier.size(20.dp)
        )
    }
}
