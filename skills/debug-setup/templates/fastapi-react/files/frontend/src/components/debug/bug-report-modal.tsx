/**
 * Bug report modal component.
 * Displays auto-captured context and allows user to add description and severity.
 */

import { useState } from "react";
import html2canvas from "html2canvas";
import { useEventTracker } from "../../lib/debug/event-tracker";
import type { Severity, DebugReportCreate } from "../../lib/debug/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { toast } from "sonner";

interface BugReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SEVERITY_OPTIONS: Array<{ value: Severity; label: string; color: string }> = [
  { value: "critical", label: "Critical", color: "bg-red-500" },
  { value: "medium", label: "Medium", color: "bg-yellow-500" },
  { value: "minor", label: "Minor", color: "bg-blue-500" },
];

const TAG_OPTIONS = [
  "UI",
  "Data",
  "Performance",
  "Navigation",
  "Form",
  "API",
  "Other",
];

export function BugReportModal({ open, onOpenChange }: BugReportModalProps) {
  const { captureContext } = useEventTracker();
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<Severity>("medium");
  const [tags, setTags] = useState<string[]>([]);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCaptureScreenshot = async () => {
    setIsCapturingScreenshot(true);

    try {
      // Brief delay to let the modal close/hide if needed
      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        scale: 0.5, // Reduce size for faster capture
        ignoreElements: (element) => {
          // Ignore the modal itself to avoid rendering issues
          return element.getAttribute("role") === "dialog";
        },
        onclone: (clonedDoc) => {
          // Fix CSS variables that html2canvas struggles with
          const style = clonedDoc.createElement("style");
          style.textContent = `
            * {
              color: inherit !important;
              background-color: inherit !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        },
      });

      const dataUrl = canvas.toDataURL("image/png");
      setScreenshot(dataUrl);
      toast.success("Screenshot captured");
    } catch (error) {
      console.error("Failed to capture screenshot:", error);
      toast.error(
        "Screenshot capture failed - continuing without screenshot"
      );
      // Don't block the user, just skip the screenshot
      setScreenshot(null);
    } finally {
      setIsCapturingScreenshot(false);
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error("Please add a description");
      return;
    }

    setIsSubmitting(true);

    try {
      const context = captureContext();

      const report: DebugReportCreate = {
        context,
        screenshot,
        user_report: {
          severity,
          description: description.trim(),
          tags,
        },
      };

      const response = await fetch("/api/debug", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(report),
      });

      if (!response.ok) {
        throw new Error("Failed to submit report");
      }

      const result = await response.json();
      toast.success(result.message || "Bug report submitted successfully");

      // Reset form
      setDescription("");
      setSeverity("medium");
      setTags([]);
      setScreenshot(null);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to submit bug report:", error);
      toast.error("Failed to submit bug report");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const context = captureContext();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report a Bug</DialogTitle>
          <DialogDescription>
            Context has been automatically captured. Add your description below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Auto-captured context preview */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Auto-captured Context</Label>
            <div className="p-3 bg-muted rounded-md text-xs space-y-1 font-mono">
              <div>
                <span className="font-semibold">Route:</span> {context.route}
              </div>
              <div>
                <span className="font-semibold">Timestamp:</span>{" "}
                {new Date().toLocaleString()}
              </div>
              <div>
                <span className="font-semibold">Viewport:</span>{" "}
                {context.viewport.width}x{context.viewport.height}
              </div>
              <div>
                <span className="font-semibold">Recent Interactions:</span>{" "}
                {context.recent_interactions.length} events
              </div>
              <div>
                <span className="font-semibold">Console Errors:</span>{" "}
                {context.console_errors.length} errors
              </div>
              <div>
                <span className="font-semibold">Failed Requests:</span>{" "}
                {context.failed_requests.length} requests
              </div>
            </div>
          </div>

          {/* Severity selector */}
          <div className="space-y-2">
            <Label>Severity</Label>
            <div className="flex gap-2">
              {SEVERITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSeverity(option.value)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    severity === option.value
                      ? `${option.color} text-white`
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags (optional)</Label>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((tag) => (
                <Badge
                  key={tag}
                  variant={tags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Describe what went wrong, what you expected to happen, and any steps to reproduce..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>

          {/* Screenshot */}
          <div className="space-y-2">
            <Label>Screenshot (optional)</Label>
            {screenshot ? (
              <div className="space-y-2">
                <img
                  src={screenshot}
                  alt="Screenshot preview"
                  className="w-full rounded-md border"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setScreenshot(null)}
                >
                  Remove Screenshot
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={handleCaptureScreenshot}
                disabled={isCapturingScreenshot}
              >
                {isCapturingScreenshot
                  ? "Capturing..."
                  : "Capture Screenshot"}
              </Button>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !description.trim()}
            >
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
