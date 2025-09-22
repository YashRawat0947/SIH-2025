"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { isAuthenticated } from "@/lib/auth"

export default function HomePage() {
  const router = useRouter()

  router.push("/dashboard") 


  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">TrainManager</h1>
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  )
}
