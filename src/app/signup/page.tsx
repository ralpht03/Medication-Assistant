"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function SignUpPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "patient"
  })
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Sign up failed")
      }

      // Redirect based on role from the user object
      switch (data.user.role) {
        case "patient":
          router.push("/patient/dashboard")
          break
        case "helper":
          router.push("/helper/dashboard")
          break
        case "admin":
          router.push("/admin/dashboard")
          break
        default:
          router.push("/dashboard")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <form onSubmit={handleSubmit} className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow">
        <h1 className="text-3xl font-bold text-center">Create Account</h1>
        
        <input
          name="name"
          type="text"
          required
          placeholder="Full Name"
          value={formData.name}
          onChange={handleChange}
          disabled={isLoading}
          className="block w-full rounded border p-2"
        />
        
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          disabled={isLoading}
          className="block w-full rounded border p-2"
        />
        
        <input
          name="password"
          type="password"
          required
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          disabled={isLoading}
          className="block w-full rounded border p-2"
        />
        
        <select
          name="role"
          value={formData.role}
          onChange={handleChange}
          disabled={isLoading}
          className="block w-full rounded border p-2"
        >
          <option value="patient">Patient</option>
          <option value="admin">Medicine Administrator</option>
          <option value="helper">Patient Helper</option>
        </select>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? "Creating account..." : "Sign up"}
        </button>

        <Link 
          href="/login"
          className="block text-center text-sm text-blue-600 hover:text-blue-500"
        >
          Already have an account? Sign in
        </Link>
      </form>
    </main>
  )
}
