"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  
  // Parallax effect state
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const parallaxRef = useRef<HTMLDivElement>(null);
  
  // Track mouse movement for parallax effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (parallaxRef.current) {
        const rect = parallaxRef.current.getBoundingClientRect();
        // Calculate mouse position relative to the center of the container
        const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
        const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
        setMousePosition({ x, y });
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    console.log('Login attempt with:', { email, password });

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      // Parse the JSON response once
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      // Store user data in localStorage for persistence
      localStorage.setItem('user', JSON.stringify(data.user));
      
      console.log('Login successful:', data.user);
      // Role-based routing
      console.log('Redirecting based on role:', data.user.role);
      
      let targetPath = "/patient/dashboard";
      switch (data.user.role) {
        case "patient":
          targetPath = "/patient/dashboard";
          break;
        case "admin":
          targetPath = "/admin/dashboard";
          break;
        case "helper":
          targetPath = "/helper/dashboard";
          break;
        default:
          targetPath = "/patient/dashboard";
      }
      
      console.log('Navigating to:', targetPath);
      
      // Try a more forceful navigation approach
      try {
        router.push(targetPath);
        
        // If router.push doesn't seem to work, try window.location as a fallback
        setTimeout(() => {
          console.log('Fallback navigation with window.location');
          window.location.href = targetPath;
        }, 500);
      } catch (navError) {
        console.error('Navigation error:', navError);
        // Direct browser navigation as last resort
        window.location.href = targetPath;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <div
      ref={parallaxRef}
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden relative"
      style={{
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        perspective: '1000px'
      }}
    >
      {/* Parallax Background Layers */}
      <div
        className="absolute inset-0 z-0"
        style={{
          transform: `translateX(${mousePosition.x * -20}px) translateY(${mousePosition.y * -20}px)`,
          transition: 'transform 0.1s ease-out',
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 10%, transparent 10%)',
          backgroundSize: '20px 20px',
          opacity: 0.5
        }}
      />
      
      <div
        className="absolute inset-0 z-0"
        style={{
          transform: `translateX(${mousePosition.x * -30}px) translateY(${mousePosition.y * -30}px) scale(1.1)`,
          transition: 'transform 0.2s ease-out',
          backgroundImage: 'radial-gradient(circle, rgba(173,216,230,0.6) 15%, transparent 15%)',
          backgroundSize: '40px 40px',
          opacity: 0.4
        }}
      />
      
      <div
        className="absolute inset-0 z-0"
        style={{
          transform: `translateX(${mousePosition.x * -50}px) translateY(${mousePosition.y * -50}px) scale(1.2)`,
          transition: 'transform 0.3s ease-out',
          backgroundImage: 'radial-gradient(circle, rgba(100,149,237,0.4) 20%, transparent 20%)',
          backgroundSize: '60px 60px',
          opacity: 0.3
        }}
      />
      
      {/* Pills floating in background */}
      <div
        className="absolute w-16 h-8 rounded-full bg-blue-200 z-0"
        style={{
          top: '20%',
          left: '15%',
          transform: `translateX(${mousePosition.x * -70}px) translateY(${mousePosition.y * -70}px) rotate(${mousePosition.x * 20}deg)`,
          transition: 'transform 0.4s ease-out',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
      />
      
      <div
        className="absolute w-12 h-12 rounded-full bg-green-200 z-0"
        style={{
          top: '60%',
          right: '20%',
          transform: `translateX(${mousePosition.x * -60}px) translateY(${mousePosition.y * -60}px) rotate(${mousePosition.y * 20}deg)`,
          transition: 'transform 0.3s ease-out',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
      />
      
      <div
        className="absolute w-10 h-5 rounded-full bg-red-200 z-0"
        style={{
          bottom: '25%',
          left: '25%',
          transform: `translateX(${mousePosition.x * -80}px) translateY(${mousePosition.y * -80}px) rotate(${mousePosition.x * -20}deg)`,
          transition: 'transform 0.5s ease-out',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
      />
      
      {/* Tagline with parallax effect */}
      <div
        className="absolute text-4xl font-bold text-black/40 whitespace-nowrap z-10"
        style={{
          top: '10%',
          left: '50%',
          transform: `translateX(-50%) translateY(${mousePosition.y * -25}px) translateZ(-100px)`,
          transition: 'transform 0.5s ease-out',
          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.1)',
          width: 'max-content'
        }}
      >
        Never Miss a Dose Again
      </div>
      
      {/* Second tagline with different parallax effect */}
      <div
        className="absolute text-3xl font-bold text-black/40 whitespace-nowrap z-10"
        style={{
          bottom: '10%',
          left: '50%',
          transform: `translateX(-50%) translateY(${mousePosition.y * 25}px) translateZ(-50px)`,
          transition: 'transform 0.5s ease-out',
          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.1)',
          width: 'max-content'
        }}
      >
        <div className="flex items-center space-x-2">
          <span>Powered by Microsoft Azure</span>
          <img
            src="/Azure-Logo-2020-present.png"
            alt="Microsoft Azure Logo"
            className="h-5 w-auto"
          />
        </div>
      </div>
      
      {/* Mortar and pestle */}
      <div
        className="absolute w-16 h-16 z-0"
        style={{
          top: '25%',
          left: '5%',
          transform: `translateX(${mousePosition.x * -30}px) translateY(${mousePosition.y * -30}px) rotate(${mousePosition.x * 5}deg)`,
          transition: 'transform 0.4s ease-out',
        }}
      >
        {/* Mortar */}
        <div className="absolute bottom-0 w-14 h-10 bg-gray-300 rounded-b-full overflow-hidden"
          style={{
            borderTopLeftRadius: '40%',
            borderTopRightRadius: '40%',
            boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          {/* Inner mortar */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-6 bg-gray-200 rounded-b-full"
            style={{
              borderTopLeftRadius: '40%',
              borderTopRightRadius: '40%',
            }}
          ></div>
        </div>
        {/* Pestle */}
        <div className="absolute top-0 right-0 w-4 h-12 bg-gray-300 rounded-t-full rounded-b-md transform rotate-30"
          style={{
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transform: 'rotate(30deg)'
          }}
        ></div>
      </div>
      
      {/* Medicine dropper */}
      <div
        className="absolute w-4 h-16 z-0"
        style={{
          top: '30%',
          left: '25%',
          transform: `translateX(${mousePosition.x * -40}px) translateY(${mousePosition.y * -40}px) rotate(${20 + mousePosition.y * 5}deg)`,
          transition: 'transform 0.35s ease-out',
        }}
      >
        {/* Dropper tube */}
        <div className="absolute top-0 left-0 w-full h-12 bg-gray-100 rounded-t-sm rounded-b-sm border border-gray-300"></div>
        {/* Dropper bulb */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-6 h-6 bg-red-200 rounded-full border border-red-300"></div>
        {/* Dropper tip */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-4 bg-gray-100 rounded-b-full border border-gray-300"></div>
      </div>
      
      {/* Stethoscope */}
      <div
        className="absolute w-24 h-24 z-0"
        style={{
          bottom: '35%',
          right: '5%',
          transform: `translateX(${mousePosition.x * -25}px) translateY(${mousePosition.y * -25}px) rotate(${mousePosition.x * -5}deg)`,
          transition: 'transform 0.45s ease-out',
        }}
      >
        {/* Stethoscope tube */}
        <div className="absolute top-8 left-4 w-16 h-2 bg-teal-500 rounded-full"
          style={{
            transform: 'rotate(30deg)'
          }}
        ></div>
        {/* Stethoscope head */}
        <div className="absolute bottom-2 left-2 w-10 h-10 bg-teal-600 rounded-full border-2 border-teal-700"
          style={{
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}
        ></div>
        {/* Stethoscope earpieces */}
        <div className="absolute top-2 right-2 w-8 h-8 border-t-4 border-r-4 border-teal-500 rounded-tr-full"></div>
      </div>
      
      {/* Prescription pad */}
      <div
        className="absolute w-20 h-24 bg-white z-0 rounded-sm"
        style={{
          top: '45%',
          left: '15%',
          transform: `translateX(${mousePosition.x * -20}px) translateY(${mousePosition.y * -20}px) rotate(${mousePosition.y * 3}deg)`,
          transition: 'transform 0.3s ease-out',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}
      >
        {/* Prescription header */}
        <div className="w-full h-4 bg-blue-100 border-b border-gray-200"></div>
        {/* Prescription lines */}
        <div className="w-full h-full pt-5 px-2">
          <div className="w-full h-0.5 bg-gray-100 mb-2"></div>
          <div className="w-full h-0.5 bg-gray-100 mb-2"></div>
          <div className="w-full h-0.5 bg-gray-100 mb-2"></div>
          <div className="w-full h-0.5 bg-gray-100 mb-2"></div>
          <div className="w-full h-0.5 bg-gray-100 mb-2"></div>
          <div className="w-3/4 h-0.5 bg-gray-100"></div>
        </div>
      </div>
      
      {/* Additional oval pill */}
      <div
        className="absolute w-12 h-6 rounded-full bg-pink-200 z-0"
        style={{
          top: '55%',
          left: '35%',
          transform: `translateX(${mousePosition.x * -35}px) translateY(${mousePosition.y * -35}px) rotate(${mousePosition.x * 15}deg)`,
          transition: 'transform 0.4s ease-out',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '1px solid rgba(0,0,0,0.05)'
        }}
      >
        {/* Pill score line */}
        <div className="w-full h-0.5 bg-pink-300 absolute top-1/2 left-0 -translate-y-1/2"></div>
      </div>
      
      {/* Triangle pill */}
      <div
        className="absolute w-0 h-0 z-0"
        style={{
          top: '65%',
          left: '45%',
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderBottom: '16px solid #d1fae5', // Green-100
          transform: `translateX(${mousePosition.x * -45}px) translateY(${mousePosition.y * -45}px) rotate(${mousePosition.y * 20}deg)`,
          transition: 'transform 0.35s ease-out',
          filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.1))'
        }}
      ></div>
      
      {/* Round pill */}
      <div
        className="absolute w-8 h-8 rounded-full bg-yellow-200 z-0"
        style={{
          top: '35%',
          right: '30%',
          transform: `translateX(${mousePosition.x * -65}px) translateY(${mousePosition.y * -65}px) rotate(${mousePosition.x * 15}deg)`,
          transition: 'transform 0.35s ease-out',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(0,0,0,0.1)'
        }}
      >
        {/* Pill score line */}
        <div className="w-6 h-0.5 bg-yellow-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
      </div>
      
      {/* Square pill */}
      <div
        className="absolute w-10 h-10 bg-purple-200 z-0 rounded-md"
        style={{
          top: '70%',
          right: '40%',
          transform: `translateX(${mousePosition.x * -55}px) translateY(${mousePosition.y * -55}px) rotate(${mousePosition.y * 25}deg)`,
          transition: 'transform 0.4s ease-out',
          boxShadow: '0 3px 5px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(0,0,0,0.1)'
        }}
      >
        {/* Pill score line */}
        <div className="w-full h-0.5 bg-purple-300 absolute top-1/2 left-0"></div>
      </div>
      
      {/* Capsule pill */}
      <div
        className="absolute w-14 h-6 rounded-full bg-orange-200 z-0"
        style={{
          top: '15%',
          right: '65%',
          transform: `translateX(${mousePosition.x * -45}px) translateY(${mousePosition.y * -45}px) rotate(${45 + mousePosition.x * 10}deg)`,
          transition: 'transform 0.3s ease-out',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}
      >
        {/* Two-tone capsule effect */}
        <div className="absolute top-0 left-0 w-1/2 h-full bg-orange-300 rounded-l-full"></div>
      </div>
      
      {/* Pill bottle */}
      <div
        className="absolute w-12 h-16 bg-blue-100 rounded-md z-0"
        style={{
          bottom: '15%',
          right: '15%',
          transform: `translateX(${mousePosition.x * -40}px) translateY(${mousePosition.y * -40}px) rotate(${mousePosition.y * 5}deg)`,
          transition: 'transform 0.45s ease-out',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.15)',
          border: '1px solid rgba(0,0,0,0.1)'
        }}
      >
        {/* Bottle cap */}
        <div className="absolute -top-2 left-1/2 w-8 h-3 bg-blue-400 rounded-t-md -translate-x-1/2"></div>
        {/* Bottle label */}
        <div className="absolute top-1/4 left-1/2 w-10 h-8 bg-white rounded-sm -translate-x-1/2 border border-gray-200">
          <div className="w-8 h-0.5 bg-gray-300 absolute top-1/3 left-1/2 -translate-x-1/2"></div>
          <div className="w-8 h-0.5 bg-gray-300 absolute top-2/3 left-1/2 -translate-x-1/2"></div>
        </div>
      </div>
      
      {/* Pill blister pack */}
      <div
        className="absolute w-20 h-14 bg-gray-100 rounded-sm z-0"
        style={{
          top: '65%',
          left: '10%',
          transform: `translateX(${mousePosition.x * -35}px) translateY(${mousePosition.y * -35}px) rotate(${mousePosition.x * -10}deg)`,
          transition: 'transform 0.5s ease-out',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(3, 1fr)',
          padding: '2px',
          gap: '2px'
        }}
      >
        {/* Blister bubbles - rendering programmatically would be better but keeping it simple */}
        <div className="rounded-full bg-white border border-gray-200"></div>
        <div className="rounded-full bg-white border border-gray-200"></div>
        <div className="rounded-full bg-white border border-gray-200"></div>
        <div className="rounded-full bg-white border border-gray-200"></div>
        <div className="rounded-full bg-white border border-gray-200"></div>
        <div className="rounded-full bg-pink-100 border border-gray-200"></div>
        <div className="rounded-full bg-white border border-gray-200"></div>
        <div className="rounded-full bg-white border border-gray-200"></div>
        <div className="rounded-full bg-white border border-gray-200"></div>
        <div className="rounded-full bg-white border border-gray-200"></div>
        <div className="rounded-full bg-pink-100 border border-gray-200"></div>
        <div className="rounded-full bg-white border border-gray-200"></div>
      </div>
      
      {/* Login Form Card with parallax effect */}
      <div
        className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-2xl z-10"
        style={{
          transform: `translateX(${mousePosition.x * 10}px) translateY(${mousePosition.y * 10}px) rotateX(${mousePosition.y * -5}deg) rotateY(${mousePosition.x * 5}deg)`,
          transition: 'transform 0.2s ease-out',
          backdropFilter: 'blur(5px)',
          background: 'rgba(255, 255, 255, 0.9)'
        }}
      >
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Medication Assistant
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to access your dashboard
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign in
            </button>
          </div>

          <div className="text-sm text-center">
            <Link
              href="/signup"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Don&apos;t have an account? Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
