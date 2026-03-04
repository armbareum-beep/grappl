package com.grapplay.app.presentation.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import cafe.adriel.voyager.navigator.tab.CurrentTab
import cafe.adriel.voyager.navigator.tab.LocalTabNavigator
import cafe.adriel.voyager.navigator.tab.Tab
import cafe.adriel.voyager.navigator.tab.TabNavigator
import cafe.adriel.voyager.navigator.tab.TabOptions
import com.grapplay.app.presentation.screens.browse.BrowseScreen
import com.grapplay.app.presentation.screens.home.HomeScreen
import com.grapplay.app.presentation.screens.profile.ProfileScreen
import com.grapplay.app.presentation.screens.saved.SavedScreen
import com.grapplay.app.presentation.theme.Violet
import com.grapplay.app.presentation.theme.Zinc

@Composable
fun MainTabNavigation() {
    TabNavigator(HomeTab) {
        Scaffold(
            bottomBar = {
                NavigationBar(
                    containerColor = Zinc.Zinc900,
                    contentColor = Zinc.Zinc400,
                ) {
                    TabNavItem(HomeTab)
                    TabNavItem(BrowseTab)
                    TabNavItem(SavedTab)
                    TabNavItem(ProfileTab)
                }
            },
            containerColor = Zinc.Zinc950,
        ) { paddingValues ->
            Box(modifier = Modifier.padding(paddingValues)) {
                CurrentTab()
            }
        }
    }
}

@Composable
private fun RowScope.TabNavItem(tab: Tab) {
    val tabNavigator = LocalTabNavigator.current
    val isSelected = tabNavigator.current == tab

    NavigationBarItem(
        selected = isSelected,
        onClick = { tabNavigator.current = tab },
        icon = {
            val tabData = tab as? GrapplayTab ?: return@NavigationBarItem
            Icon(
                imageVector = if (isSelected) tabData.selectedIcon else tabData.unselectedIcon,
                contentDescription = tab.options.title,
            )
        },
        label = {
            Text(
                text = tab.options.title,
                style = MaterialTheme.typography.labelSmall
            )
        },
        colors = NavigationBarItemDefaults.colors(
            selectedIconColor = Violet.Violet400,
            selectedTextColor = Violet.Violet400,
            unselectedIconColor = Zinc.Zinc500,
            unselectedTextColor = Zinc.Zinc500,
            indicatorColor = Violet.Violet600.copy(alpha = 0.15f),
        )
    )
}

interface GrapplayTab : Tab {
    val selectedIcon: ImageVector
    val unselectedIcon: ImageVector
}

object HomeTab : GrapplayTab {
    override val selectedIcon = Icons.Filled.Home
    override val unselectedIcon = Icons.Outlined.Home

    override val options: TabOptions
        @Composable get() = TabOptions(
            index = 0u,
            title = "홈",
        )

    @Composable
    override fun Content() {
        HomeScreen()
    }
}

object BrowseTab : GrapplayTab {
    override val selectedIcon = Icons.Filled.Search
    override val unselectedIcon = Icons.Outlined.Search

    override val options: TabOptions
        @Composable get() = TabOptions(
            index = 1u,
            title = "둘러보기",
        )

    @Composable
    override fun Content() {
        BrowseScreen()
    }
}

object SavedTab : GrapplayTab {
    override val selectedIcon = Icons.Filled.Bookmark
    override val unselectedIcon = Icons.Outlined.BookmarkBorder

    override val options: TabOptions
        @Composable get() = TabOptions(
            index = 2u,
            title = "저장",
        )

    @Composable
    override fun Content() {
        SavedScreen()
    }
}

object ProfileTab : GrapplayTab {
    override val selectedIcon = Icons.Filled.Person
    override val unselectedIcon = Icons.Outlined.Person

    override val options: TabOptions
        @Composable get() = TabOptions(
            index = 3u,
            title = "프로필",
        )

    @Composable
    override fun Content() {
        ProfileScreen()
    }
}
