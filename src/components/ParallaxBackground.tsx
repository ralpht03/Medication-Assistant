"use client"

import { useState, useEffect, useRef } from "react";

export default function ParallaxBackground() {
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

  return (
    <div
      ref={parallaxRef}
      className="fixed inset-0 -z-10 overflow-hidden"
      style={{ 
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        perspective: '1000px'
      }}
    >
      {/* Parallax Background Layers */}
      <div 
        className="absolute inset-0"
        style={{
          transform: `translateX(${mousePosition.x * -20}px) translateY(${mousePosition.y * -20}px)`,
          transition: 'transform 0.1s ease-out',
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 10%, transparent 10%)',
          backgroundSize: '20px 20px',
          opacity: 0.5
        }}
      />
      
      <div 
        className="absolute inset-0"
        style={{
          transform: `translateX(${mousePosition.x * -30}px) translateY(${mousePosition.y * -30}px) scale(1.1)`,
          transition: 'transform 0.2s ease-out',
          backgroundImage: 'radial-gradient(circle, rgba(173,216,230,0.6) 15%, transparent 15%)',
          backgroundSize: '40px 40px',
          opacity: 0.4
        }}
      />
      
      <div 
        className="absolute inset-0"
        style={{
          transform: `translateX(${mousePosition.x * -50}px) translateY(${mousePosition.y * -50}px) scale(1.2)`,
          transition: 'transform 0.3s ease-out',
          backgroundImage: 'radial-gradient(circle, rgba(100,149,237,0.4) 20%, transparent 20%)',
          backgroundSize: '60px 60px',
          opacity: 0.3
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
        <div className="flex items-center space-x-2">
        </div>
      </div>
      
      {/* Pills and medical elements */}
      
      {/* Round pill */}
      <div 
        className="absolute w-8 h-8 rounded-full bg-yellow-200"
        style={{
          top: '25%',
          left: '5%',
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
        className="absolute w-10 h-10 bg-purple-200 rounded-md"
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
        className="absolute w-14 h-6 rounded-full bg-orange-200"
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
        className="absolute w-12 h-16 bg-blue-100 rounded-md"
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
      
      {/* Mortar and pestle */}
      <div 
        className="absolute w-16 h-16"
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
        className="absolute w-4 h-16"
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
      
      {/* Additional oval pill */}
      <div 
        className="absolute w-12 h-6 rounded-full bg-pink-200"
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
        className="absolute w-0 h-0"
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
    </div>
  );
}