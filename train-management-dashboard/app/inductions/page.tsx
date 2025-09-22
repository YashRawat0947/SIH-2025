"use client";

import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Train,
  Plus,
  CalendarIcon,
  Clock,
  BookOpen,
  CheckCircle,
  AlertCircle,
  History,
  Eye,
  Play,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";

interface TrainData {
  _id: string;
  trainsetId: string;
  model?: string;
  manufacturer?: string;
  fitnessStatus?: {
    isValid: boolean;
    expiryDate: string;
  };
  maintenanceStatus?: string;
  cleaningStatus?: string;
  branding?: {
    brandingPriority: number;
  };
  currentMileage?: number;
}

interface InductionPlan {
  _id: string;
  planDate: string;
  generatedAt: string;
  status: "DRAFT" | "FINALIZED" | "SIMULATION";
  rankedTrains: {
    train: TrainData | string; // Can be populated object or ObjectId string
    rank: number;
    reasoning: string;
    confidenceScore: number;
    constraints: {
      fitnessValid: boolean;
      maintenanceReady: boolean;
      cleaningStatus: string;
      brandingPriority: number;
      mileageBalance: number;
    };
  }[];
  alerts: {
    type: "CRITICAL" | "WARNING" | "INFO";
    message: string;
    trainId: string;
    severity: number;
  }[];
  optimizationMetrics: {
    totalTrainsEvaluated: number;
    constraintsSatisfied: number;
    averageConfidence: number;
    processingTimeMs: number;
  };
  generatedBy: any;
  aiModelInfo: {
    version: string;
    algorithm: string;
    parameters: any;
  };
  simulationParams?: any;
  createdAt?: string;
  updatedAt?: string;
}

interface SimulationRequest {
  trainId: string;
  modifications: {
    maintenanceStatus?: string;
    fitnessStatus?: {
      isValid: boolean;
      expiryDate: string;
    };
    currentMileage?: number;
    cleaningStatus?: string;
  };
  constraints?: any;
  baseDate?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

const makeAPICall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}/api/induction${endpoint}`.replace(
    "//api",
    "/api"
  ); // handle empty base
  const token =
    localStorage.getItem("train_auth_token") || localStorage.getItem("token");
  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) defaultHeaders["Authorization"] = `Bearer ${token}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  });

  return response;
};

export default function InductionsPage() {
  const [currentPlan, setCurrentPlan] = useState<InductionPlan | null>(null);
  const [planHistory, setPlanHistory] = useState<InductionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isSimulateDialogOpen, setIsSimulateDialogOpen] = useState(false);
  const [isExplainDialogOpen, setIsExplainDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [simulationData, setSimulationData] = useState<SimulationRequest>({
    trainId: "",
    modifications: {},
  });
  const [planExplanation, setPlanExplanation] = useState<any>(null);

  useEffect(() => {
    fetchLatestPlan();
    fetchPlanHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLatestPlan = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await makeAPICall("/latest");
      if (res.ok) {
        const data = await res.json();
        // backend might return { plan, summary, ... } or directly plan
        const plan = data.plan ?? data;
        setCurrentPlan(plan);
      } else if (res.status === 404) {
        setCurrentPlan(null);
      } else if (res.status === 401) {
        localStorage.removeItem("train_auth_token");
        localStorage.removeItem("token");
        setCurrentPlan(null);
      } else {
        const errText = await res.text();
        try {
          const parsed = JSON.parse(errText);
          setError(parsed.error || parsed.message || `Failed (${res.status})`);
        } catch {
          setError(`Failed (${res.status}): ${errText}`);
        }
      }
    } catch (err: any) {
      setError(
        `Network error: ${err?.message || "Unable to fetch latest plan"}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlanHistory = async () => {
    try {
      const res = await makeAPICall("/history?limit=10");
      if (res.ok) {
        const data = await res.json();
        const plans = data.plans ?? data;
        setPlanHistory(plans || []);
      }
    } catch (err) {
      console.error("history fetch failed", err);
    }
  };

  const handleGeneratePlan = async () => {
    setIsLoading(true);
    setError("");
    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("train_auth_token");
      if (!token) {
        setError("Authentication token not found. Please log in.");
        setIsLoading(false);
        return;
      }

      const payload = {
        planDate: selectedDate.toISOString(),
        forceRegenerate: false,
      };

      const res = await makeAPICall("/generate", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentPlan(data.plan ?? data);
        setIsGenerateDialogOpen(false);
        await fetchPlanHistory();
      } else {
        const errText = await res.text();
        try {
          const parsed = JSON.parse(errText);
          setError(parsed.error || parsed.message || `Failed (${res.status})`);
        } catch {
          setError(`Failed (${res.status}): ${errText}`);
        }
      }
    } catch (err: any) {
      setError(`Network error: ${err?.message || "Unable to generate plan"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulation = async () => {
    if (
      !simulationData.trainId ||
      Object.keys(simulationData.modifications).length === 0
    ) {
      setError("Please provide train ID and at least one modification");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const res = await makeAPICall("/simulate", {
        method: "POST",
        body: JSON.stringify(simulationData),
      });
      if (res.ok) {
        const data = await res.json();
        setIsSimulateDialogOpen(false);
        // we show simulation as selectedPlan via explanation modal or setCurrentPlan temporarily
        setPlanExplanation({
          plan: data.simulation,
          explanations: data.changes ? [] : [],
        });
        setIsExplainDialogOpen(true);
      } else {
        const errText = await res.text();
        try {
          const parsed = JSON.parse(errText);
          setError(parsed.error || parsed.message || `Failed (${res.status})`);
        } catch {
          setError(`Failed (${res.status}): ${errText}`);
        }
      }
    } catch (err: any) {
      setError(`Network error: ${err?.message || "Unable to run simulation"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExplainPlan = async (planId: string) => {
    setIsLoading(true);
    setError("");
    try {
      const res = await makeAPICall(`/explain/${planId}`);
      if (res.ok) {
        const data = await res.json();
        setPlanExplanation(data);
        setIsExplainDialogOpen(true);
      } else {
        const errText = await res.text();
        try {
          const parsed = JSON.parse(errText);
          setError(parsed.error || parsed.message || `Failed (${res.status})`);
        } catch {
          setError(`Failed (${res.status}): ${errText}`);
        }
      }
    } catch (err: any) {
      setError(
        `Network error: ${err?.message || "Unable to fetch explanation"}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to display train ID - handles both populated objects and ObjectId strings
  const displayTrainId = (train: TrainData | string): string => {
    if (!train) return "N/A";
    
    // If train is a populated object
    if (typeof train === "object" && train !== null) {
      return train.trainsetId || train._id || "Unknown";
    }
    
    // If train is just an ObjectId string, we can't resolve it without additional API call
    // In this case, we show the ObjectId (this should ideally be resolved by backend population)
    if (typeof train === "string") {
      return train; // This will show ObjectId, but better than nothing
    }
    
    return "N/A";
  };

  const getStatusBadge = (status: InductionPlan["status"]) => {
    const variants = {
      DRAFT: {
        variant: "outline" as const,
        icon: Clock,
        color: "text-yellow-600",
      },
      FINALIZED: {
        variant: "default" as const,
        icon: CheckCircle,
        color: "text-green-600",
      },
      SIMULATION: {
        variant: "secondary" as const,
        icon: Play,
        color: "text-blue-600",
      },
    };

    const fallback = { variant: "secondary" as const, icon: Clock };
    const mapping = (variants as any)[status] || fallback;
    const { variant, icon: Icon } = mapping;
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getAlertBadge = (type: "CRITICAL" | "WARNING" | "INFO") => {
    const variants = {
      CRITICAL: { variant: "destructive" as const, color: "text-red-600" },
      WARNING: { variant: "default" as const, color: "text-yellow-600" },
      INFO: { variant: "secondary" as const, color: "text-blue-600" },
    };

    const { variant } = variants[type];
    return <Badge variant={variant}>{type}</Badge>;
  };

  const getMaintenanceStatusBadge = (isReady: boolean) => {
    return (
      <Badge variant={isReady ? "default" : "destructive"}>
        {isReady ? "Ready" : "Not Ready"}
      </Badge>
    );
  };

  const getCleaningStatusBadge = (status: string) => {
    const variants = {
      CLEAN: { variant: "default" as const, text: "Clean" },
      NEEDS_CLEANING: {
        variant: "destructive" as const,
        text: "Needs Cleaning",
      },
      IN_CLEANING: { variant: "secondary" as const, text: "In Cleaning" },
    };

    const mapping = (variants as any)[status] || {
      variant: "secondary" as const,
      text: status,
    };
    return <Badge variant={mapping.variant}>{mapping.text}</Badge>;
  };

  const getFitnessStatusBadge = (isValid: boolean) => {
    return (
      <Badge variant={isValid ? "default" : "destructive"}>
        {isValid ? "Valid" : "Invalid"}
      </Badge>
    );
  };

  const getBrandingPriorityBadge = (priority: number) => {
    let variant: "default" | "secondary" | "outline" = "secondary";
    if (priority >= 4) variant = "default";
    else if (priority <= 2) variant = "outline";

    return <Badge variant={variant}>{priority}/5</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Train Induction Planning
            </h1>
            <p className="text-muted-foreground">
              AI-powered train optimization and induction planning
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog
              open={isSimulateDialogOpen}
              onOpenChange={setIsSimulateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Play className="mr-2 h-4 w-4" />
                  Run Simulation
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Train Modification Simulation</DialogTitle>
                  <DialogDescription>
                    Simulate how changes to a train would affect the induction
                    plan ranking.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="trainId">Train ID</Label>
                    <Input
                      id="trainId"
                      placeholder="Enter train ID (e.g., TR001 or ObjectId)"
                      value={simulationData.trainId}
                      onChange={(e) =>
                        setSimulationData({
                          ...simulationData,
                          trainId: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Maintenance Status</Label>
                    <Select
                      value={
                        simulationData.modifications.maintenanceStatus || ""
                      }
                      onValueChange={(value) =>
                        setSimulationData({
                          ...simulationData,
                          modifications: {
                            ...simulationData.modifications,
                            maintenanceStatus: value,
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select maintenance status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPERATIONAL">Operational</SelectItem>
                        <SelectItem value="MAINTENANCE">
                          Under Maintenance
                        </SelectItem>
                        <SelectItem value="OUT_OF_SERVICE">
                          Out of Service
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currentMileage">Current Mileage</Label>
                    <Input
                      id="currentMileage"
                      type="number"
                      placeholder="Enter mileage"
                      value={simulationData.modifications.currentMileage ?? ""}
                      onChange={(e) =>
                        setSimulationData({
                          ...simulationData,
                          modifications: {
                            ...simulationData.modifications,
                            currentMileage: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Cleaning Status</Label>
                    <Select
                      value={simulationData.modifications.cleaningStatus || ""}
                      onValueChange={(value) =>
                        setSimulationData({
                          ...simulationData,
                          modifications: {
                            ...simulationData.modifications,
                            cleaningStatus: value,
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select cleaning status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CLEAN">Clean</SelectItem>
                        <SelectItem value="NEEDS_CLEANING">
                          Needs Cleaning
                        </SelectItem>
                        <SelectItem value="IN_CLEANING">In Cleaning</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleSimulation} disabled={isLoading}>
                    {isLoading ? (
                      <LoadingSpinner size="sm" className="mr-2" />
                    ) : (
                      <Play className="mr-2 h-4 w-4" />
                    )}
                    Run Simulation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog
              open={isGenerateDialogOpen}
              onOpenChange={setIsGenerateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Generate Plan
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate New Induction Plan</DialogTitle>
                  <DialogDescription>
                    Create a new AI-optimized train induction plan for the
                    specified date.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Plan Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !selectedDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate
                            ? format(selectedDate, "PPP")
                            : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          required
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleGeneratePlan} disabled={isLoading}>
                    {isLoading ? (
                      <LoadingSpinner size="sm" className="mr-2" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Generate Plan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Current Plan
              </CardTitle>
              <Train className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currentPlan ? currentPlan.rankedTrains.length : 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {currentPlan
                  ? `Generated ${format(
                      new Date(currentPlan.generatedAt),
                      "MMM dd"
                    )}`
                  : "No plan available"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Service Ready
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currentPlan
                  ? currentPlan.optimizationMetrics.constraintsSatisfied
                  : 0}
              </div>
              <p className="text-xs text-muted-foreground">Trains available</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Confidence
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currentPlan
                  ? Math.round(
                      currentPlan.optimizationMetrics.averageConfidence
                    )
                  : 0}
                %
              </div>
              <p className="text-xs text-muted-foreground">
                AI confidence score
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Alerts
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currentPlan
                  ? currentPlan.alerts.filter((a) => a.type === "CRITICAL")
                      .length
                  : 0}
              </div>
              <p className="text-xs text-muted-foreground">Critical alerts</p>
            </CardContent>
          </Card>
        </div>

        {currentPlan && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Current Induction Plan
              </CardTitle>
              <CardDescription>
                Generated on{" "}
                {format(new Date(currentPlan.generatedAt), "PPP 'at' p")} • Plan
                Date: {format(new Date(currentPlan.planDate), "PPP")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  {getStatusBadge(currentPlan.status)}
                  <span className="text-sm text-muted-foreground">
                    Processing Time:{" "}
                    {currentPlan.optimizationMetrics.processingTimeMs}ms
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExplainPlan(currentPlan._id)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Explain
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Train ID</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Fitness</TableHead>
                      <TableHead>Maintenance</TableHead>
                      <TableHead>Cleaning</TableHead>
                      <TableHead>Branding</TableHead>
                      <TableHead>Mileage</TableHead>
                      <TableHead>Reasoning</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentPlan.rankedTrains
                      .slice(0, 10)
                      .map((entry, index) => {
                        const trainId = displayTrainId(entry.train);
                        return (
                          <TableRow
                            key={`${trainId}-${index}`}
                          >
                            <TableCell className="font-medium">
                              #{entry.rank}
                            </TableCell>
                            <TableCell className="font-mono text-xs break-words">
                              {trainId}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  entry.confidenceScore >= 90
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {entry.confidenceScore}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {getFitnessStatusBadge(
                                entry.constraints.fitnessValid
                              )}
                            </TableCell>
                            <TableCell>
                              {getMaintenanceStatusBadge(
                                entry.constraints.maintenanceReady
                              )}
                            </TableCell>
                            <TableCell>
                              {getCleaningStatusBadge(
                                entry.constraints.cleaningStatus
                              )}
                            </TableCell>
                            <TableCell>
                              {getBrandingPriorityBadge(
                                entry.constraints.brandingPriority
                              )}
                            </TableCell>
                            <TableCell>
                              {entry.constraints.mileageBalance.toLocaleString()}
                              km
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                              {entry.reasoning}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>

                {currentPlan.alerts.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Active Alerts</h4>
                    <div className="space-y-1">
                      {currentPlan.alerts.map((alert, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 bg-muted rounded"
                        >
                          {getAlertBadge(alert.type as any)}
                          <span className="text-sm">{alert.message}</span>
                          <Badge variant="outline" className="ml-auto">
                            Severity: {alert.severity}
                          </Badge>
                          <Badge variant="outline">{alert.trainId}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Plan History
            </CardTitle>
            <CardDescription>
              Previous induction plans and their performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <LoadingSpinner size="lg" />
              </div>
            ) : planHistory.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan Date</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Trains</TableHead>
                    <TableHead>Avg Confidence</TableHead>
                    <TableHead>Alerts</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {planHistory.map((plan) => (
                    <TableRow key={plan._id}>
                      <TableCell>
                        {format(new Date(plan.planDate), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(plan.generatedAt), "MMM dd, p")}
                      </TableCell>
                      <TableCell>{getStatusBadge(plan.status)}</TableCell>
                      <TableCell>{plan.rankedTrains?.length ?? 0}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {Math.round(
                            plan.optimizationMetrics?.averageConfidence ?? 0
                          )}
                          %
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {(plan.alerts || []).filter(
                            (a) => a.type === "CRITICAL"
                          ).length > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {
                                (plan.alerts || []).filter(
                                  (a) => a.type === "CRITICAL"
                                ).length
                              }{" "}
                              Critical
                            </Badge>
                          )}
                          {(plan.alerts || []).filter(
                            (a) => a.type === "WARNING"
                          ).length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {
                                (plan.alerts || []).filter(
                                  (a) => a.type === "WARNING"
                                ).length
                              }{" "}
                              Warning
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExplainPlan(plan._id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No plan history available. Generate your first plan to get
                started.
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog
          open={isExplainDialogOpen}
          onOpenChange={setIsExplainDialogOpen}
        >
          <DialogContent className="sm:max-w-[800px] max-h-[600px] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Plan Explanation</DialogTitle>
              <DialogDescription>
                Detailed analysis and reasoning behind the induction plan
              </DialogDescription>
            </DialogHeader>

            {planExplanation ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Plan Date:</strong>{" "}
                    {planExplanation.plan?.planDate
                      ? format(new Date(planExplanation.plan.planDate), "PPP")
                      : "—"}
                  </div>
                  <div>
                    <strong>Generated:</strong>{" "}
                    {planExplanation.plan?.generatedAt
                      ? format(
                          new Date(planExplanation.plan.generatedAt),
                          "PPP p"
                        )
                      : "—"}
                  </div>
                  <div>
                    <strong>Status:</strong>{" "}
                    {planExplanation.plan?.status ?? "—"}
                  </div>
                  <div>
                    <strong>Generated By:</strong>{" "}
                    {planExplanation.plan?.generatedBy?.username ??
                      planExplanation.plan?.generatedBy ??
                      "System"}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">AI Model Information</h4>
                  <div className="bg-muted p-3 rounded text-sm">
                    <div>
                      <strong>Algorithm:</strong>{" "}
                      {planExplanation.aiModelInfo?.algorithm ??
                        planExplanation.plan?.aiModelInfo?.algorithm}
                    </div>
                    <div>
                      <strong>Version:</strong>{" "}
                      {planExplanation.aiModelInfo?.version ??
                        planExplanation.plan?.aiModelInfo?.version}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Optimization Metrics</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      Trains Evaluated:{" "}
                      {planExplanation.optimizationMetrics
                        ?.totalTrainsEvaluated ??
                        planExplanation.plan?.optimizationMetrics
                          ?.totalTrainsEvaluated ??
                        "—"}
                    </div>
                    <div>
                      Constraints Satisfied:{" "}
                      {planExplanation.optimizationMetrics
                        ?.constraintsSatisfied ??
                        planExplanation.plan?.optimizationMetrics
                          ?.constraintsSatisfied ??
                        "—"}
                    </div>
                    <div>
                      Average Confidence:{" "}
                      {Math.round(
                        planExplanation.optimizationMetrics
                          ?.averageConfidence ??
                          planExplanation.plan?.optimizationMetrics
                            ?.averageConfidence ??
                          0
                      )}
                      %
                    </div>
                    <div>
                      Processing Time:{" "}
                      {planExplanation.optimizationMetrics?.processingTimeMs ??
                        planExplanation.plan?.optimizationMetrics
                          ?.processingTimeMs ??
                        "—"}
                      ms
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">
                    Train Rankings Explanation
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {(planExplanation.explanations ?? [])
                      .slice(0, 50)
                      .map((explanation: any, i: number) => {
                        const trainId = displayTrainId(explanation.train);
                        return (
                          <div
                            key={`${trainId}-${i}`}
                            className="border p-3 rounded"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <strong>
                                #{explanation.rank ?? "—"} - {trainId}
                              </strong>
                              <Badge variant="secondary">
                                {explanation.confidenceScore ??
                                  explanation.confidence ??
                                  "—"}
                                %
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground mb-2">
                              {explanation.reasoning}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                Fitness:{" "}
                                {explanation.detailedAnalysis?.fitnessStatus ??
                                explanation.constraints?.fitnessValid
                                  ? "Valid"
                                  : "Invalid"}
                              </div>
                              <div>
                                Maintenance:{" "}
                                {explanation.detailedAnalysis
                                  ?.maintenanceUrgency ??
                                explanation.constraints?.maintenanceReady
                                  ? "OK"
                                  : "N/A"}
                              </div>
                              <div>
                                Mileage:{" "}
                                {(
                                  explanation.detailedAnalysis
                                    ?.mileageBalance ??
                                  explanation.constraints?.mileageBalance
                                )?.toLocaleString?.() ?? 0}
                                km
                              </div>
                              <div>
                                Location:{" "}
                                {explanation.detailedAnalysis
                                  ?.locationAdvantage ?? "N/A"}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    {(planExplanation.explanations ?? []).length === 0 && (
                      <div className="text-sm text-muted-foreground">
                        No per-train explanations returned by server.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-sm text-muted-foreground">
                No explanation available.
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}