"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Bell, Menu, Train, LogOut } from "lucide-react"
import { removeAuthToken } from "@/lib/auth"
import { apiClient } from "@/lib/api"

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter()
  const [user, setUser] = useState<{ username?: string; name?: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        console.log("Fetching user profile...")
        const response = await apiClient.getProfile()
        console.log("Profile API response:", response)
        if (response.data) {
          const userData =
            typeof response.data === "object" &&
            response.data !== null &&
            "user" in response.data
              ? (response.data as { user: any }).user
              : response.data
          console.log("Setting user data:", userData)
          setUser(userData)
        } else {
          console.log("No user data in response")
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error)
        if (typeof error === "object" && error !== null && "response" in error) {
          const err = error as { response?: { status?: any; data?: any } }
          console.error("Profile API error response:", err.response?.status, err.response?.data)
        } else if (typeof error === "object" && error !== null && "request" in error) {
          const err = error as { request?: any }
          console.error("Profile API no response received:", err.request)
        } else if (typeof error === "object" && error !== null && "message" in error) {
          const err = error as { message?: any }
          console.error("Profile API error:", err.message)
        } else {
          console.error("Profile API unknown error:", error)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const handleLogout = () => {
    removeAuthToken()
    router.push("/auth/login")
  }

  const displayName = user?.username || user?.name || "User"
  console.log("Current user:", user, "Display name:", displayName)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
            <Menu className="h-5 w-5" />
          </Button>

          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Train className="h-5 w-5" />
            </div>
            <span className="hidden font-bold sm:inline-block">TrainManager</span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />

          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>

          {!loading && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{displayName}</p>
                  </div>
                </div>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild>
              <Link href="/auth/login">Login</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
