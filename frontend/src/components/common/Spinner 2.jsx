import React from "react";

const Spinner = ({
  size = "md",
  text = "Loading...",
  fullScreen = false,
  className = ""
}) => {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  };

  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`
          ${sizeClasses[size]}
          border-gray-200
          border-t-brand-500
          rounded-full
          animate-spin
        `}
      />

      {text && (
        <p className="text-sm text-gray-500 animate-pulse">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        {spinner}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      {spinner}
    </div>
  );
};

export default Spinner;