/**
 * Floating debug reporter button with keyboard shortcut.
 * Always visible in bottom-right corner for easy bug reporting.
 */

import { useState, useEffect } from "react";
import { Bug } from "lucide-react";
import { BugReportModal } from "./bug-report-modal";
import { Button } from "../ui/button";

export function DebugReporter() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sessionReportCount, setSessionReportCount] = useState(0);

  // Keyboard shortcut: Ctrl/Cmd + Shift + B
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "B") {
        e.preventDefault();
        setIsModalOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Track session report count (fetched on mount)
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await fetch("/api/debug/count");
        if (response.ok) {
          const data = await response.json();
          setSessionReportCount(data.count);
        }
      } catch (error) {
        console.error("Failed to fetch debug report count:", error);
      }
    };

    fetchCount();

    // Re-fetch count when modal closes (in case report was submitted)
    if (!isModalOpen) {
      fetchCount();
    }
  }, [isModalOpen]);

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsModalOpen(true)}
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-shadow relative"
          title="Report a bug (Ctrl/Cmd + Shift + B)"
        >
          <Bug className="h-6 w-6" />

          {/* Badge showing count of reports this session */}
          {sessionReportCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {sessionReportCount > 9 ? "9+" : sessionReportCount}
            </span>
          )}
        </Button>
      </div>

      {/* Modal */}
      <BugReportModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </>
  );
}
