import React from 'react';

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-[3px]',
  lg: 'h-12 w-12 border-4',
};

const Spinner = ({ size = 'md', className = '' }) => {
  const spinnerSize = sizeClasses[size] || sizeClasses.md;

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`${spinnerSize} animate-spin rounded-full border-slate-200 border-t-brand-500`}
        role="status"
        aria-label="Loading"
      />
    </div>
  );
};

export default Spinner;
