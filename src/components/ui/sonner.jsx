"use client";
import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

const Toaster = ({
  ...props
}) => {
  const { theme = "system" } = useTheme()

  return (
    (<Sonner
      theme={theme}
      position="top-center"
      className="toaster group"
      style={{ top: '4px', zIndex: 99999 }}
      closeButton
      duration={1500}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-slate-950/95 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-white group-[.toaster]:border group-[.toaster]:border-slate-800 group-[.toaster]:shadow-[0_0_30px_rgba(0,0,0,0.5)] group-[.toaster]:!px-3 group-[.toaster]:!py-2.5 group-[.toaster]:!rounded-xl group-[.toaster]:!w-[calc(100vw-32px)] sm:group-[.toaster]:!w-[400px] sm:group-[.toaster]:!max-w-none group-[.toaster]:!min-h-0 group-[.toaster]:!text-xs font-medium flex items-center gap-3 overflow-hidden break-words ring-1 ring-[#0ea5e9]/20",
          description: "group-[.toast]:!text-gray-200 group-[.toast]:!text-[12px] group-[.toast]:mt-1 group-[.toast]:!font-medium",
          actionButton:
            "group-[.toast]:bg-[#0ea5e9] group-[.toast]:text-white group-[.toast]:hover:bg-[#38bdf8] group-[.toast]:font-black group-[.toast]:rounded-md group-[.toast]:!px-3 group-[.toast]:!py-1.5 group-[.toast]:!text-[10px] group-[.toast]:uppercase group-[.toast]:tracking-widest transition-colors shadow-[0_0_10px_rgba(14,165,233,0.3)] border-none",
          cancelButton:
            "group-[.toast]:bg-slate-800 group-[.toast]:text-gray-300 group-[.toast]:hover:text-white group-[.toast]:hover:bg-slate-700 border-none transition-colors",
          closeButton: 
            "group-[.toast]:!bg-transparent group-[.toast]:hover:!bg-slate-800 group-[.toast]:!text-gray-400 group-[.toast]:hover:!text-white group-[.toast]:!border-none transition-all",
        },
      }}
      {...props} />)
  );
}

export { Toaster }
