"use client";

interface IntegrationLogoProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function IntegrationLogo({ name, size = "md", className = "" }: IntegrationLogoProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  const logoSizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const containerSizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

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
