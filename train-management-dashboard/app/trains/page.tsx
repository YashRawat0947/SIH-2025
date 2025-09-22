"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Train, Search, Filter, Eye, Settings, MapPin, Clock, Fuel } from "lucide-react"
import { apiClient } from "@/lib/api"

interface TrainRecord {
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
}

export default function TrainsPage() {
  const [trains, setTrains] = useState<TrainRecord[]>([])
  const [filteredTrains, setFilteredTrains] = useState<TrainRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    fetchTrains()
  }, [])

  useEffect(() => {
    filterTrains()
  }, [trains, searchTerm, statusFilter])

  const fetchTrains = async () => {
    setIsLoading(true)
    setError("") // Clear previous errors

    console.log("Fetching trains from API...") // Add debug logging
    const response = await apiClient.getTrains()
    console.log("API response:", response) // Log the full response

    if (response.error) {
      console.log("API error:", response.error) // Log API errors
      setError(`API Error: ${response.error}. Using mock data instead.`) // More descriptive error message
      // Mock data for demonstration
      setTrains([
        {
          id: "1",
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
        },
        {
          id: "2",
          number: "T-002",
          name: "Local Route B",
          type: "Local",
          status: "delayed",
          currentLocation: "West Junction",
          nextDestination: "East Plaza",
          departureTime: "14:15",
          arrivalTime: "15:30",
          capacity: 200,
          occupancy: 156,
          fuelLevel: 62,
          lastMaintenance: "2024-01-08",
        },
        {
          id: "3",
          number: "T-003",
          name: "Freight Carrier",
          type: "Freight",
          status: "maintenance",
          currentLocation: "Maintenance Depot",
          nextDestination: "Industrial Zone",
          departureTime: "16:00",
          arrivalTime: "17:30",
          capacity: 500,
          occupancy: 0,
          fuelLevel: 95,
          lastMaintenance: "2024-01-15",
        },
        {
          id: "4",
          number: "T-004",
          name: "Suburban Line C",
          type: "Suburban",
          status: "active",
          currentLocation: "Suburban Hub",
          nextDestination: "City Center",
          departureTime: "14:45",
          arrivalTime: "15:20",
          capacity: 250,
          occupancy: 189,
          fuelLevel: 78,
          lastMaintenance: "2024-01-12",
        },
        {
          id: "5",
          number: "T-005",
          name: "Night Express",
          type: "Express",
          status: "inactive",
          currentLocation: "Terminal Yard",
          nextDestination: "Not Scheduled",
          departureTime: "22:00",
          arrivalTime: "06:30",
          capacity: 350,
          occupancy: 0,
          fuelLevel: 45,
          lastMaintenance: "2024-01-05",
        },
      ])
    } else if (response.data) {
      console.log("Successfully loaded trains:", response.data) // Log successful data

      const trainsData = response.data.trains || response.data
      console.log("Extracted trains data:", trainsData)

      if (Array.isArray(trainsData)) {
        const mappedTrains = trainsData.map((train: any) => ({
          id: train._id || train.id,
          number: train.trainsetId || train.number,
          name: train.trainsetId || train.name || `Train ${train.trainsetId}`,
          type: "Express", // Default type since backend doesn't have this field
          status:
            train.maintenanceStatus === "OPERATIONAL"
              ? "active"
              : train.maintenanceStatus === "MAINTENANCE_DUE"
                ? "maintenance"
                : "inactive",
          currentLocation: train.currentLocation || "Unknown",
          nextDestination: "Not Available", // Backend doesn't provide this
          departureTime: "Not Scheduled", // Backend doesn't provide this
          arrivalTime: "Not Scheduled", // Backend doesn't provide this
          capacity: 300, // Default capacity
          occupancy: Math.floor(Math.random() * 300), // Mock occupancy
          fuelLevel: Math.floor(Math.random() * 100), // Mock fuel level
          lastMaintenance: train.lastMaintenanceDate
            ? new Date(train.lastMaintenanceDate).toISOString().split("T")[0]
            : "2024-01-01",
        }))

        setTrains(mappedTrains)
        setError("") // Clear error on success
      } else {
        console.log("Trains data is not an array:", trainsData)
        setError("Invalid data format received from API. Using mock data.")
        setTrains([])
      }
    } else {
      console.log("No data received from API") // Log when no data
      setError("No data received from API. Using mock data.")
      // Use same mock data as fallback
      setTrains([
        {
          id: "1",
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
        },
      ])
    }

    setIsLoading(false)
  }

  const filterTrains = () => {
    if (!Array.isArray(trains)) {
      console.log("trains is not an array:", trains)
      setFilteredTrains([])
      return
    }

    let filtered = trains

    if (searchTerm) {
      filtered = filtered.filter(
        (train) =>
          train.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          train.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          train.currentLocation.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((train) => train.status === statusFilter)
    }

    setFilteredTrains(Array.isArray(filtered) ? filtered : [])
  }

  const getStatusBadge = (status: TrainRecord["status"]) => {
    const variants = {
      active: { variant: "default" as const, color: "bg-green-500" },
      maintenance: { variant: "secondary" as const, color: "bg-yellow-500" },
      inactive: { variant: "outline" as const, color: "bg-gray-500" },
      delayed: { variant: "destructive" as const, color: "bg-red-500" },
    }

    return <Badge variant={variants[status].variant}>{status}</Badge>
  }

  const getOccupancyColor = (occupancy: number, capacity: number) => {
    const percentage = (occupancy / capacity) * 100
    if (percentage >= 90) return "text-red-600"
    if (percentage >= 70) return "text-yellow-600"
    return "text-green-600"
  }

  const getFuelColor = (level: number) => {
    if (level <= 25) return "text-red-600"
    if (level <= 50) return "text-yellow-600"
    return "text-green-600"
  }
                  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Trains Management</h1>
            <p className="text-muted-foreground">Monitor and manage your train fleet</p>
          </div>
          <Button>
            <Settings className="mr-2 h-4 w-4" />
            Fleet Settings
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search trains by number, name, or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="delayed">Delayed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Trains Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Train className="h-5 w-5" />
              Fleet Overview ({filteredTrains.length} trains)
            </CardTitle>
            <CardDescription>Current status and details of all trains</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Train</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Occupancy</TableHead>
                    <TableHead>Fuel</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(filteredTrains) &&
                    filteredTrains.map((train) => (
                      <TableRow key={train.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{train.number}</div>
                            <div className="text-sm text-muted-foreground">{train.name}</div>
                            <Badge variant="outline" className="text-xs">
                              {train.type}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(train.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{train.currentLocation}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">→ {train.nextDestination}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{train.departureTime}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">Arr: {train.arrivalTime}</div>
                        </TableCell>
                        <TableCell>
                          <div className={`text-sm font-medium ${getOccupancyColor(train.occupancy, train.capacity)}`}>
                            {train.occupancy}/{train.capacity}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {Math.round((train.occupancy / train.capacity) * 100)}% full
                          </div>
                        </TableCell>
                        <TableCell>
                          <div
                            className={`flex items-center gap-1 text-sm font-medium ${getFuelColor(train.fuelLevel)}`}
                          >
                            <Fuel className="h-3 w-3" />
                            {train.fuelLevel}%
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/trains/${train.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  {(!Array.isArray(filteredTrains) || filteredTrains.length === 0) && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No trains available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
