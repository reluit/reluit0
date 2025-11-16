"use client";

interface IntegrationLogoProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  noBackground?: boolean;
}

export function IntegrationLogo({ name, size = "md", className = "", noBackground = false }: IntegrationLogoProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  // Make logos bigger when no background
  const logoSizeClasses = {
    sm: noBackground ? "w-6 h-6" : "w-4 h-4",
    md: noBackground ? "w-8 h-8" : "w-6 h-6",
    lg: noBackground ? "w-14 h-14" : "w-10 h-10", // Increased for drawer header and integration cards (with background)
  };

  const containerSizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12", // Keep container same size, only logo image gets bigger
  };

  if (noBackground) {
    return (
      <div className={`${containerSizeClasses[size]} flex items-center justify-center flex-shrink-0 ${className}`}>
        <img
          src={`/${name}.png`}
          alt={name}
          className={`${logoSizeClasses[size]} object-contain rounded`}
        />
      </div>
    );
  }

  return (
    <div className={`${containerSizeClasses[size]} rounded-sm flex items-center justify-center bg-gray-100 flex-shrink-0 ${className}`}>
      <img
        src={`/${name}.png`}
        alt={name}
        className={`${logoSizeClasses[size]} object-contain rounded`}
      />
    </div>
  );
}
