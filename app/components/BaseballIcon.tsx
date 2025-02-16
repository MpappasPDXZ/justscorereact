export function BaseballIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      fill="none"
      viewBox="0 0 24 24" 
      stroke="currentColor"
    >
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
      {/* Curved lines to represent baseball stitching */}
      <path
        d="M12 2C14.5 4.5 14.5 7.5 14.5 12C14.5 16.5 14.5 19.5 12 22"
        strokeWidth="1"
      />
      <path
        d="M12 2C9.5 4.5 9.5 7.5 9.5 12C9.5 16.5 9.5 19.5 12 22"
        strokeWidth="1"
      />
    </svg>
  )
} 