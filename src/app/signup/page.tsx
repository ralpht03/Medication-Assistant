"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function SignUpPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "patient",
    dateOfBirth: "",
    phoneNumber: "",
    address: "",
    emergencyContact: ""
  })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [error, setError] = useState("")
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    // Clear validation error when field is changed
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = {...prev}
        delete newErrors[name]
        return newErrors
      })
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }
  
  // Validate phone number format (111-111-1111)
  const validatePhoneNumber = (phone: string): boolean => {
    if (!phone) return true // Optional field
    const phoneRegex = /^\d{3}-\d{3}-\d{4}$/
    return phoneRegex.test(phone)
  }
  
  // Format date from yyyy-mm-dd to mm/dd/yyyy
  const formatDateOfBirth = (dateString: string): string => {
    if (!dateString) return ""
    const [year, month, day] = dateString.split('-')
    return `${month}/${day}/${year}`
  }

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {}
    
    // Validate phone number
    if (formData.phoneNumber && !validatePhoneNumber(formData.phoneNumber)) {
      errors.phoneNumber = "Phone number must be in format: 111-111-1111"
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    // Validate form
    if (!validateForm()) {
      return
    }
    
    setIsLoading(true)

    try {
      // Format date of birth before sending
      const formattedData = {
        ...formData,
        dateOfBirth: formatDateOfBirth(formData.dateOfBirth)
      }
      
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formattedData)
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
      <form onSubmit={handleSubmit} className="max-w-md w-full space-y-6 bg-white p-8 rounded-lg shadow">
        <h1 className="text-3xl font-bold text-center">Create Account</h1>
        
        <div className="grid grid-cols-2 gap-4">
          <input
            name="firstName"
            type="text"
            required
            placeholder="First Name"
            value={formData.firstName}
            onChange={handleChange}
            disabled={isLoading}
            className="block w-full rounded border p-2"
          />
          
          <input
            name="lastName"
            type="text"
            required
            placeholder="Last Name"
            value={formData.lastName}
            onChange={handleChange}
            disabled={isLoading}
            className="block w-full rounded border p-2"
          />
        </div>
        
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

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-blue-600 text-sm hover:underline"
        >
          {showAdvanced ? "Hide" : "Show"} additional information
        </button>

        {showAdvanced && (
          <div className="space-y-4 border-t pt-4">
            <input
              name="dateOfBirth"
              type="date"
              placeholder="Date of Birth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              disabled={isLoading}
              className="block w-full rounded border p-2"
            />
            
            <div>
              <input
                name="phoneNumber"
                type="tel"
                placeholder="Phone Number (111-111-1111)"
                value={formData.phoneNumber}
                onChange={handleChange}
                disabled={isLoading}
                className={`block w-full rounded border p-2 ${validationErrors.phoneNumber ? 'border-red-500' : ''}`}
                pattern="\d{3}-\d{3}-\d{4}"
              />
              {validationErrors.phoneNumber && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.phoneNumber}</p>
              )}
            </div>
            
            <textarea
              name="address"
              placeholder="Address"
              value={formData.address}
              onChange={handleChange}
              disabled={isLoading}
              className="block w-full rounded border p-2"
              rows={2}
            />
            
            <input
              name="emergencyContact"
              type="text"
              placeholder="Emergency Contact"
              value={formData.emergencyContact}
              onChange={handleChange}
              disabled={isLoading}
              className="block w-full rounded border p-2"
            />
          </div>
        )}

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
