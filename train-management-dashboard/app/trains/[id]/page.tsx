"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, MapPin, Clock, Users, Fuel, Wrench, AlertTriangle, CheckCircle, Activity } from "lucide-react"
import { apiClient } from "@/lib/api"

interface TrainDetails {
  id: string
  number: string
  name: string
  type: string
  status: "active" | "maintenance" | "inactive" | "delayed"
  currentLocation: string
  nextDestination: string
  departureTime: string
  arrivalTime: string
  capacity: number
  occupancy: number
  fuelLevel: number
  lastMaintenance: string
  nextMaintenance: string
  driver: string
  route: string
  speed: number
  maxSpeed: number
  engineHealth: number
  brakeHealth: number
  recentAlerts: Array<{
    id: string
    type: "warning" | "error" | "info"
    message: string
    timestamp: string
  }>
}

export default function TrainDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const trainId = params.id as string

  const [train, setTrain] = useState<TrainDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  useEffect(() => {
    fetchTrainDetails()
  }, [trainId])

  const fetchTrainDetails = async () => {
    setIsLoading(true)
    const response = await apiClient.getTrainDetails(trainId)

    if (response.error) {
      setError(response.error)
      // Mock data for demonstration
      setTrain({
        id: trainId,
        number: "T-001",
        name: "Express Line A",
        type: "Express",
        status: "active",
        currentLocation: "Central Station",
        nextDestination: "North Terminal",
        departureTime: "14:30",
        arrivalTime: "15:45",
        capacity: 300,
        occupancy: 245,
        fuelLevel: 85,
        lastMaintenance: "2024-01-10",
        nextMaintenance: "2024-02-10",
        driver: "John Smith",
        route: "Route A - Express",
        speed: 65,
        maxSpeed: 120,
        engineHealth: 92,
        brakeHealth: 88,
        recentAlerts: [
          {
            id: "1",
            type: "info",
            message: "Scheduled departure in 15 minutes",
            timestamp: "2024-01-15T14:15:00Z",
          },
          {
            id: "2",
            type: "warning",
            message: "Fuel level below 90%",
            timestamp: "2024-01-15T13:45:00Z",
          },
          {
            id: "3",
            type: "info",
            message: "Passenger boarding completed",
            timestamp: "2024-01-15T13:30:00Z",
          },
        ],
      })
    } else if (response.data) {
      setTrain(response.data)
    }

    setIsLoading(false)
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (!train) return

    setIsUpdatingStatus(true)
    const response = await apiClient.updateTrainStatus(train.id, newStatus)

    if (response.error) {
      setError(response.error)
    } else {
      setTrain({ ...train, status: newStatus as TrainDetails["status"] })
    }

    setIsUpdatingStatus(false)
  }

  const getStatusBadge = (status: TrainDetails["status"]) => {
    const variants = {
      active: { variant: "default" as const, icon: CheckCircle },
      maintenance: { variant: "secondary" as const, icon: Wrench },
      inactive: { variant: "outline" as const, icon: AlertTriangle },
      delayed: { variant: "destructive" as const, icon: AlertTriangle },
    }

    const { variant, icon: Icon } = variants[status]
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    )
  }

  const getAlertIcon = (type: "warning" | "error" | "info") => {
    switch (type) {
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <CheckCircle className="h-4 w-4 text-blue-500" />
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    )
  }

  if (error || !train) {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error || "Train not found"}</AlertDescription>
        </Alert>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {train.number} - {train.name}
              </h1>
              <p className="text-muted-foreground">{train.type} Train Details</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(train.status)}
            <Select onValueChange={handleStatusUpdate} disabled={isUpdatingStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Update Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="delayed">Delayed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Location</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{train.currentLocation}</div>
              <p className="text-xs text-muted-foreground">Next: {train.nextDestination}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Schedule</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{train.departureTime}</div>
              <p className="text-xs text-muted-foreground">Arrives: {train.arrivalTime}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Occupancy</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {train.occupancy}/{train.capacity}
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.round((train.occupancy / train.capacity) * 100)}% full
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fuel Level</CardTitle>
              <Fuel className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{train.fuelLevel}%</div>
              <Progress value={train.fuelLevel} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Detailed Information */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm">
                  <span>Current Speed</span>
                  <span>{train.speed} km/h</span>
                </div>
                <Progress value={(train.speed / train.maxSpeed) * 100} className="mt-1" />
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span>Engine Health</span>
                  <span>{train.engineHealth}%</span>
                </div>
                <Progress value={train.engineHealth} className="mt-1" />
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span>Brake Health</span>
                  <span>{train.brakeHealth}%</span>
                </div>
                <Progress value={train.brakeHealth} className="mt-1" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Maintenance Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Driver</label>
                <p className="text-sm text-muted-foreground">{train.driver}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Route</label>
                <p className="text-sm text-muted-foreground">{train.route}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Last Maintenance</label>
                <p className="text-sm text-muted-foreground">{train.lastMaintenance}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Next Maintenance</label>
                <p className="text-sm text-muted-foreground">{train.nextMaintenance}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Recent Alerts
            </CardTitle>
            <CardDescription>Latest system notifications and alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {train.recentAlerts.map((alert) => (
                <div key={alert.id} className="flex items-start space-x-4">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{alert.message}</p>
                    <p className="text-sm text-muted-foreground">{new Date(alert.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
