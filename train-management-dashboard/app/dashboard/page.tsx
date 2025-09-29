"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Train, Users, AlertTriangle, TrendingUp, Activity } from "lucide-react"
import { apiClient } from "@/lib/api"

interface DashboardData {
  totalTrains: number
  activeTrains: number
  scheduledInductions: number
  systemAlerts: number
  trainPerformance: Array<{ month: string; onTime: number; delayed: number }>
  statusDistribution: Array<{ name: string; value: number; color: string }>
  recentActivity: Array<{ id: string; type: string; message: string; timestamp: string }>
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true)

      try {
        const [trainsResponse, constraintsResponse] = await Promise.all([
          apiClient.getTrains(),
          apiClient.getTrainConstraints(),
        ])

        if (trainsResponse.error || constraintsResponse.error) {
          setError(trainsResponse.error || constraintsResponse.error || "Failed to fetch data")
        } else if (trainsResponse.data && constraintsResponse.data) {
          const trains = (trainsResponse.data && Array.isArray((trainsResponse.data as any).trains))
            ? (trainsResponse.data as any).trains
            : []
          const constraints = constraintsResponse.data ?? {}

          const constraintsObj = (constraints as any).constraints ?? {}

          const totalTrains = trains.length
          const activeTrains = trains.filter((t: any) => t.maintenanceStatus === "OPERATIONAL").length
          const maintenanceTrains = trains.filter((t: any) => t.maintenanceStatus === "MAINTENANCE_DUE").length
          const inactiveTrains = trains.filter((t: any) => t.maintenanceStatus === "IN_MAINTENANCE").length

          const systemAlerts =
            (constraintsObj.fitnessExpiring?.length || 0) +
            (constraintsObj.maintenanceDue?.length || 0) +
            (constraintsObj.cleaningDue?.length || 0)

          setData({
            totalTrains,
            activeTrains,
            scheduledInductions: 12, // This would come from induction API
            systemAlerts,
            trainPerformance: [
              { month: "Jan", onTime: 85, delayed: 15 },
              { month: "Feb", onTime: 88, delayed: 12 },
              { month: "Mar", onTime: 82, delayed: 18 },
              { month: "Apr", onTime: 90, delayed: 10 },
              { month: "May", onTime: 87, delayed: 13 },
              { month: "Jun", onTime: 92, delayed: 8 },
            ],
            statusDistribution: [
              { name: "Active", value: activeTrains, color: "#34d399" },
              { name: "Maintenance", value: maintenanceTrains, color: "#fbbf24" },
              { name: "Inactive", value: inactiveTrains, color: "#f87171" },
            ],
            recentActivity: [
              { id: "1", type: "train", message: `${totalTrains} trains in fleet`, timestamp: "Just now" },
              {
                id: "2",
                type: "alert",
                message: `${systemAlerts} system alerts require attention`,
                timestamp: "Just now",
              },
              { id: "3", type: "induction", message: "Induction system ready", timestamp: "Just now" },
              { id: "4", type: "train", message: `${activeTrains} trains operational`, timestamp: "Just now" },
            ],
          })
        } else {
          setData({
            totalTrains: 45,
            activeTrains: 38,
            scheduledInductions: 12,
            systemAlerts: 3,
            trainPerformance: [
              { month: "Jan", onTime: 85, delayed: 15 },
              { month: "Feb", onTime: 88, delayed: 12 },
              { month: "Mar", onTime: 82, delayed: 18 },
              { month: "Apr", onTime: 90, delayed: 10 },
              { month: "May", onTime: 87, delayed: 13 },
              { month: "Jun", onTime: 92, delayed: 8 },
            ],
            statusDistribution: [
              { name: "Active", value: 38, color: "#34d399" },
              { name: "Maintenance", value: 5, color: "#fbbf24" },
              { name: "Inactive", value: 2, color: "#f87171" },
            ],
            recentActivity: [
              {
                id: "1",
                type: "train",
                message: "Train T-001 completed route successfully",
                timestamp: "2 minutes ago",
              },
              { id: "2", type: "alert", message: "Maintenance required for Train T-015", timestamp: "15 minutes ago" },
              {
                id: "3",
                type: "induction",
                message: "New driver induction scheduled for tomorrow",
                timestamp: "1 hour ago",
              },
              { id: "4", type: "train", message: "Train T-023 departed on schedule", timestamp: "2 hours ago" },
            ],
          })
        }
      } catch (error) {
        console.error("Dashboard data fetch error:", error)
        setError("Failed to load dashboard data")
      }

      setIsLoading(false)
    }

    fetchDashboardData()
  }, [])

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </DashboardLayout>
    )
  }

  if (!data) return null

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Welcome to your train management overview</p>
          </div>
          <Button>
            <Activity className="mr-2 h-4 w-4" />
            Refresh Data
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Trains</CardTitle>
              <Train className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totalTrains}</div>
              <p className="text-xs text-muted-foreground">Fleet size</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Trains</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.activeTrains}</div>
              <p className="text-xs text-muted-foreground">Currently operational</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scheduled Inductions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.scheduledInductions}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.systemAlerts}</div>
              <p className="text-xs text-muted-foreground">Requires attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Train Performance</CardTitle>
              <CardDescription>Monthly on-time vs delayed trains</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={data.trainPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="onTime" fill="#34d399" name="On Time" />
                  <Bar dataKey="delayed" fill="#f87171" name="Delayed" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Train Status Distribution</CardTitle>
              <CardDescription>Current fleet status breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={data.statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, index }) => {
                      const total = data.statusDistribution.reduce((sum, entry) => sum + (typeof entry.value === "number" ? entry.value : 0), 0)
                      const safeValue = typeof value === "number" ? value : 0
                      const percent = total > 0 ? (safeValue / total) * 100 : 0
                      return `${name} ${percent.toFixed(0)}%`
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system events and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    {activity.type === "train" && <Train className="h-4 w-4" />}
                    {activity.type === "alert" && <AlertTriangle className="h-4 w-4" />}
                    {activity.type === "induction" && <Users className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{activity.message}</p>
                    <p className="text-sm text-muted-foreground">{activity.timestamp}</p>
                  </div>
                  <Badge variant={activity.type === "alert" ? "destructive" : "secondary"}>{activity.type}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
