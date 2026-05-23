/**
 * Event tracking context for the debug reporting system.
 * Captures user interactions, navigation, errors, and API failures.
 */

import { createContext, useContext, useEffect, useRef, ReactNode } from "react";
import { useLocation } from "react-router";
import type { InteractionEvent, BrowserContext } from "./types";

const MAX_INTERACTIONS = 50; // Keep last 50 interactions
const MAX_ERRORS = 20; // Keep last 20 console errors
const MAX_FAILED_REQUESTS = 20; // Keep last 20 failed requests
const MAX_HISTORY = 10; // Keep last 10 navigation entries

interface EventTrackerContextValue {
  captureContext: () => BrowserContext;
}

const EventTrackerContext = createContext<EventTrackerContextValue | null>(
  null
);

interface EventTrackerProviderProps {
  children: ReactNode;
}

export function EventTrackerProvider({ children }: EventTrackerProviderProps) {
  const location = useLocation();
  const interactionsRef = useRef<InteractionEvent[]>([]);
  const errorsRef = useRef<string[]>([]);
  const failedRequestsRef = useRef<
    Array<{ url: string; status?: number; error: string }>
  >([]);
  const navigationHistoryRef = useRef<string[]>([]);

  // Track navigation changes
  useEffect(() => {
    const path = location.pathname + location.search;

    // Add to navigation history
    navigationHistoryRef.current = [
      ...navigationHistoryRef.current.slice(-MAX_HISTORY + 1),
      path,
    ];

    // Record as interaction
    addInteraction({
      type: "navigation",
      timestamp: new Date().toISOString(),
      details: {
        from:
          navigationHistoryRef.current[navigationHistoryRef.current.length - 2],
        to: path,
      },
    });
  }, [location]);

  // Track click events
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Extract element information
      const elementInfo = {
        tag: target.tagName.toLowerCase(),
        text: target.textContent?.slice(0, 100) || "", // Truncate long text
        classes: Array.from(target.classList),
        id: target.id || "",
        dataset: { ...target.dataset },
        ariaLabel: target.getAttribute("aria-label") || undefined,
      };

      addInteraction({
        type: "click",
        timestamp: new Date().toISOString(),
        element: elementInfo,
        details: {
          x: e.clientX,
          y: e.clientY,
        },
      });
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  // Track form submissions
  useEffect(() => {
    const handleSubmit = (e: SubmitEvent) => {
      const target = e.target as HTMLFormElement;

      addInteraction({
        type: "form_submit",
        timestamp: new Date().toISOString(),
        element: {
          tag: "form",
          text: "",
          classes: Array.from(target.classList),
          id: target.id || "",
          dataset: { ...target.dataset },
        },
        details: {
          action: target.action,
          method: target.method,
        },
      });
    };

    document.addEventListener("submit", handleSubmit, true);
    return () => document.removeEventListener("submit", handleSubmit, true);
  }, []);

  // Track console errors
  useEffect(() => {
    const originalError = console.error;

    console.error = (...args: unknown[]) => {
      const errorMessage = args
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg) : String(arg)
        )
        .join(" ");

      errorsRef.current = [
        ...errorsRef.current.slice(-MAX_ERRORS + 1),
        errorMessage,
      ];

      addInteraction({
        type: "error",
        timestamp: new Date().toISOString(),
        details: { message: errorMessage },
      });

      // Call original console.error
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  // Track failed API requests (intercept fetch)
  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);

        // Track failed requests (4xx, 5xx)
        if (!response.ok) {
          const url = typeof args[0] === "string" ? args[0] : args[0].url;
          const failedRequest = {
            url,
            status: response.status,
            error: response.statusText,
          };

          failedRequestsRef.current = [
            ...failedRequestsRef.current.slice(-MAX_FAILED_REQUESTS + 1),
            failedRequest,
          ];

          addInteraction({
            type: "api_failure",
            timestamp: new Date().toISOString(),
            details: failedRequest,
          });
        }

        return response;
      } catch (error) {
        // Track network errors
        const url = typeof args[0] === "string" ? args[0] : args[0].url;
        const failedRequest = {
          url,
          error: error instanceof Error ? error.message : "Network error",
        };

        failedRequestsRef.current = [
          ...failedRequestsRef.current.slice(-MAX_FAILED_REQUESTS + 1),
          failedRequest,
        ];

        addInteraction({
          type: "api_failure",
          timestamp: new Date().toISOString(),
          details: failedRequest,
        });

        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const addInteraction = (interaction: InteractionEvent) => {
    interactionsRef.current = [
      ...interactionsRef.current.slice(-MAX_INTERACTIONS + 1),
      interaction,
    ];
  };

  const captureContext = (): BrowserContext => {
    return {
      route: location.pathname,
      url: window.location.href,
      user_agent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      navigation_history: [...navigationHistoryRef.current],
      recent_interactions: [...interactionsRef.current],
      console_errors: [...errorsRef.current],
      failed_requests: [...failedRequestsRef.current],
    };
  };

  return (
    <EventTrackerContext.Provider value={{ captureContext }}>
      {children}
    </EventTrackerContext.Provider>
  );
}

export function useEventTracker() {
  const context = useContext(EventTrackerContext);

  if (!context) {
    throw new Error(
      "useEventTracker must be used within an EventTrackerProvider"
    );
  }

  return context;
}
