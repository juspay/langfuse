import React, { useState } from "react";
import { useRouter } from "next/router";
import Page from "@/src/components/layouts/page";
import { api } from "@/src/utils/api";
import { Card } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Input } from "@/src/components/ui/input";
import { ScrollArea } from "@/src/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  User,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  GripVertical,
  Menu,
  X,
  BarChart3,
} from "lucide-react";
import { cn } from "@/src/utils/tailwind";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Button } from "@/src/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/src/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { Calendar as CalendarComponent } from "@/src/components/ui/calendar";
import { MarkdownJsonView } from "@/src/components/ui/MarkdownJsonView";
import { PrettyJsonView } from "@/src/components/ui/PrettyJsonView";
import { toast } from "sonner";
import { useTableDateRange } from "@/src/hooks/useTableDateRange";
import { toAbsoluteTimeRange } from "@/src/utils/date-range-utils";

export default function JuspayDashboard() {
  const router = useRouter();
  const projectId = router.query.projectId as string;

  React.useEffect(() => {
    console.log("🚀 PRODUCTION DEBUG - JuspayDashboard loaded:", {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      userAgent:
        typeof window !== "undefined" ? window.navigator.userAgent : "SSR",
      url: typeof window !== "undefined" ? window.location.href : "SSR",
    });
  }, []);

  // Use the same date range approach as traces page for consistency
  const { timeRange, setTimeRange } = useTableDateRange(projectId, {
    defaultRelativeAggregation: "last1Day",
  });

  // Ensure URL is updated with default date range on first visit (for sharing)
  React.useEffect(() => {
    if (router.isReady && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);

      // If no dateRange parameter exists in URL, ensure it gets set
      if (!params.has("dateRange")) {
        // The hook should handle this, but let's ensure it happens
        // by triggering a setTimeRange with the current timeRange
        if (timeRange) {
          setTimeRange(timeRange);
        }
      }
    }
  }, [router.isReady, timeRange, setTimeRange]);

  // Convert timeRange to absolute date range for compatibility
  const tableDateRange = React.useMemo(() => {
    return toAbsoluteTimeRange(timeRange);
  }, [timeRange]);

  // Use tableDateRange as our dateRange with proper fallback
  const dateRange = React.useMemo(() => {
    if (tableDateRange) {
      return tableDateRange;
    }
    // Create fallback date range
    const today = new Date();
    return {
      from: new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        0,
        0,
        0,
        0,
      ),
      to: new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        23,
        59,
        59,
        999,
      ),
    };
  }, [tableDateRange]);

  // Filter persistence using localStorage (same approach as before but simpler)
  const filterStorageKey = `juspay-dashboard-filters-${projectId}`;

  // Get other URL parameters (not date range - that's handled by useTableDateRange)
  const sessionIdFromUrl = router.query.sessionId as string | undefined;
  const merchantFilterUrl = router.query.merchantOnly as string | undefined;
  const teamFilterUrl = router.query.teamOnly as string | undefined;
  const juspayOthersFilterUrl = router.query.juspayOthersOnly as
    | string
    | undefined;
  const tagFilterUrl = router.query.tag as string | undefined;
  const correctFilterUrl = router.query.correct as string | undefined;
  const incorrectFilterUrl = router.query.incorrect as string | undefined;
  const hideUnknownUrl = router.query.hideUnknown as string | undefined;
  const teamEmailsFromUrl = router.query.teamEmails as string | undefined;

  // Check if URL has any filter parameters (shared link)
  const hasUrlFilters = !!(
    merchantFilterUrl ||
    teamFilterUrl ||
    juspayOthersFilterUrl ||
    tagFilterUrl ||
    correctFilterUrl ||
    incorrectFilterUrl ||
    hideUnknownUrl ||
    teamEmailsFromUrl
  );

  // Load filters from localStorage
  const loadFiltersFromStorage = () => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(filterStorageKey);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  // Save filters to localStorage
  const saveFiltersToStorage = React.useCallback(
    (filters: any) => {
      if (typeof window === "undefined") return;
      try {
        localStorage.setItem(filterStorageKey, JSON.stringify(filters));
      } catch (error) {
        console.error("Failed to save filters:", error);
      }
    },
    [filterStorageKey],
  );

  // Update URL for sharing (but don't trigger navigation)
  const updateUrlForSharing = React.useCallback((filters: any) => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);

    // Add filter parameters (dateRange is handled by useTableDateRange)
    if (filters.showOnlyMerchant) {
      params.set("merchantOnly", "true");
    } else {
      params.delete("merchantOnly");
    }

    if (filters.showOnlyTeam) {
      params.set("teamOnly", "true");
    } else {
      params.delete("teamOnly");
    }

    if (filters.showOnlyJuspayOthers) {
      params.set("juspayOthersOnly", "true");
    } else {
      params.delete("juspayOthersOnly");
    }

    if (filters.selectedTag && filters.selectedTag !== "all") {
      params.set("tag", filters.selectedTag);
    } else {
      params.delete("tag");
    }

    if (filters.filterCorrect) {
      params.set("correct", "true");
    } else {
      params.delete("correct");
    }

    if (filters.filterIncorrect) {
      params.set("incorrect", "true");
    } else {
      params.delete("incorrect");
    }

    if (!filters.hideUnknownUser) {
      params.set("hideUnknown", "false");
    } else {
      params.delete("hideUnknown");
    }

    // Add team emails to URL for sharing
    if (filters.teamEmails && filters.teamEmails.length > 0) {
      params.set(
        "teamEmails",
        encodeURIComponent(JSON.stringify(filters.teamEmails)),
      );
    } else {
      params.delete("teamEmails");
    }

    // Update URL without navigation
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", newUrl);
    console.log("🔗 URL updated for sharing:", newUrl);
  }, []);

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    sessionIdFromUrl || null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedToolCall, setSelectedToolCall] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [showOnlyMerchant, setShowOnlyMerchant] = useState(() => {
    if (hasUrlFilters && merchantFilterUrl !== undefined)
      return merchantFilterUrl === "true";
    const stored = loadFiltersFromStorage();
    return stored?.showOnlyMerchant ?? false;
  });

  const [showOnlyTeam, setShowOnlyTeam] = useState(() => {
    if (hasUrlFilters && teamFilterUrl !== undefined)
      return teamFilterUrl === "true";
    const stored = loadFiltersFromStorage();
    return stored?.showOnlyTeam ?? false;
  });

  const [showOnlyJuspayOthers, setShowOnlyJuspayOthers] = useState(() => {
    if (hasUrlFilters && juspayOthersFilterUrl !== undefined)
      return juspayOthersFilterUrl === "true";
    const stored = loadFiltersFromStorage();
    return stored?.showOnlyJuspayOthers ?? false;
  });

  const [selectedTag, setSelectedTag] = useState<string>(() => {
    if (hasUrlFilters && tagFilterUrl !== undefined) return tagFilterUrl;
    const stored = loadFiltersFromStorage();
    return stored?.selectedTag ?? "all";
  });

  const [filterCorrect, setFilterCorrect] = useState(() => {
    if (hasUrlFilters && correctFilterUrl !== undefined)
      return correctFilterUrl === "true";
    const stored = loadFiltersFromStorage();
    return stored?.filterCorrect ?? false;
  });

  const [filterIncorrect, setFilterIncorrect] = useState(() => {
    if (hasUrlFilters && incorrectFilterUrl !== undefined)
      return incorrectFilterUrl === "true";
    const stored = loadFiltersFromStorage();
    return stored?.filterIncorrect ?? false;
  });

  const [hideUnknownUser, setHideUnknownUser] = useState(() => {
    if (hasUrlFilters && hideUnknownUrl !== undefined)
      return hideUnknownUrl !== "false";
    const stored = loadFiltersFromStorage();
    return stored?.hideUnknownUser ?? true;
  });

  // Team whitelist state
  const [teamEmails, setTeamEmails] = useState<string[]>(() => {
    // If URL has team emails, use those (for shared links)
    if (hasUrlFilters && teamEmailsFromUrl !== undefined) {
      try {
        return JSON.parse(decodeURIComponent(teamEmailsFromUrl));
      } catch {
        return [];
      }
    }
    // Otherwise use localStorage
    const stored = loadFiltersFromStorage();
    return stored?.teamEmails ?? [];
  });
  const [newEmailInput, setNewEmailInput] = useState("");

  // Fetch traces for all sessions within date range with pagination
  const [allTraces, setAllTraces] = React.useState<any[]>([]);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [hasMoreTraces, setHasMoreTraces] = React.useState(true);

  const allSessionsTraces = api.traces.all.useQuery(
    {
      projectId,
      filter: [
        {
          column: "timestamp",
          type: "datetime",
          operator: ">=",
          value: dateRange.from,
        },
        {
          column: "timestamp",
          type: "datetime",
          operator: "<=",
          value: dateRange.to,
        },
      ],
      searchQuery: null,
      searchType: [],
      page: currentPage,
      limit: 99,
      orderBy: { column: "timestamp", order: "DESC" },
    },
    {
      enabled: !!projectId && hasMoreTraces,
    },
  );

  // Accumulate traces from pagination
  React.useEffect(() => {
    if (allSessionsTraces.data?.traces) {
      const newTraces = allSessionsTraces.data.traces;
      if (currentPage === 0) {
        setAllTraces(newTraces);
      } else {
        setAllTraces((prev) => [...prev, ...newTraces]);
      }

      if (newTraces.length < 99) {
        setHasMoreTraces(false);
      }
    }
  }, [allSessionsTraces.data?.traces, currentPage]);

  // Auto-load more traces when there are more available
  React.useEffect(() => {
    if (
      hasMoreTraces &&
      !allSessionsTraces.isLoading &&
      allSessionsTraces.data?.traces
    ) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [
    hasMoreTraces,
    allSessionsTraces.isLoading,
    allSessionsTraces.data?.traces,
  ]);

  // Reset trace pagination when date range changes
  React.useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      setAllTraces([]);
      setCurrentPage(0);
      setHasMoreTraces(true);
    }
  }, [dateRange?.from, dateRange?.to]);

  // Create a wrapper object
  const allSessionsTracesData = React.useMemo(
    () => ({
      traces: allTraces,
    }),
    [allTraces],
  );

  // Fetch manual ratings from database
  const manualRatingsQuery = api.scores.getManualRatings.useMutation();

  // Fetch ratings when traces are available
  React.useEffect(() => {
    if (projectId && allSessionsTracesData.traces.length > 0) {
      manualRatingsQuery.mutate({
        projectId,
        traceIds: allSessionsTracesData.traces.map((t) => t.id),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, allSessionsTracesData.traces.length]);

  // Create manual ratings mutation
  const createManualRatingMutation = api.scores.createManualRating.useMutation({
    onSuccess: () => {
      // Re-fetch manual ratings after successful creation
      if (projectId && allSessionsTracesData.traces.length > 0) {
        manualRatingsQuery.mutate({
          projectId,
          traceIds: allSessionsTracesData.traces.map((t) => t.id),
        });
      }
    },
    onError: (error) => {
      console.error("Failed to create manual rating:", error);
      toast.error("Failed to save rating");
    },
  });

  // Delete manual rating mutation
  const deleteManualRatingMutation = api.scores.deleteManualRating.useMutation({
    onSuccess: () => {
      // Re-fetch manual ratings after successful deletion
      if (projectId && allSessionsTracesData.traces.length > 0) {
        manualRatingsQuery.mutate({
          projectId,
          traceIds: allSessionsTracesData.traces.map((t) => t.id),
        });
      }
    },
    onError: (error) => {
      console.error("Failed to delete manual rating:", error);
      toast.error("Failed to clear rating");
    },
  });

  // Convert manual ratings data to Map for easier access
  const manualRatings = React.useMemo(() => {
    const ratingsMap = new Map<string, string>();
    if (manualRatingsQuery.data) {
      manualRatingsQuery.data.forEach((rating) => {
        ratingsMap.set(rating.traceId, rating.rating);
      });
    }
    return ratingsMap;
  }, [manualRatingsQuery.data]);

  // Function to update manual rating for a trace
  const updateManualRating = React.useCallback(
    (traceId: string, rating: string | null) => {
      if (rating === null) {
        // Delete the rating
        deleteManualRatingMutation.mutate({
          projectId,
          traceId,
        });
      } else {
        // Create or update the rating
        createManualRatingMutation.mutate({
          projectId,
          traceId,
          rating: rating as "correct" | "needs-work" | "wrong",
        });
      }
    },
    [projectId, createManualRatingMutation, deleteManualRatingMutation],
  );

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sessionPage, setSessionPage] = useState(0);

  // Resizable panels state
  const [rightPanelWidth, setRightPanelWidth] = useState(450);
  const [isResizing, setIsResizing] = useState<"right" | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileRightPanelOpen, setIsMobileRightPanelOpen] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showManualRatingsModal, setShowManualRatingsModal] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const handleDateRangeChange = React.useCallback(
    (newDateRange: { from: Date; to: Date }) => {
      console.log("📅 Date range changed:", {
        from: newDateRange.from.toISOString(),
        to: newDateRange.to.toISOString(),
      });

      // Cancel previous loading and start new one immediately
      setIsLoadingData(true);

      // Clear existing data immediately to show loading state
      setAllSessions([]);
      setAllTraces([]);
      setAllScores([]);

      // Reset pagination
      setSessionPage(0);
      setCurrentPage(0);
      setScoresPage(0);
      setHasMoreSessions(true);
      setHasMoreTraces(true);
      setHasMoreScores(true);

      // Set new date range (this will trigger new API calls)
      setTimeRange({ from: newDateRange.from, to: newDateRange.to });
    },
    [setTimeRange],
  );

  const handleShowOnlyMerchantChange = (value: boolean) => {
    setShowOnlyMerchant(value);
  };

  const handleSelectedTagChange = (value: string) => {
    setSelectedTag(value);
  };

  const handleFilterCorrectChange = (value: boolean) => {
    setFilterCorrect(value);
  };

  const handleFilterIncorrectChange = (value: boolean) => {
    setFilterIncorrect(value);
  };

  const handleHideUnknownUserChange = (value: boolean) => {
    setHideUnknownUser(value);
  };

  const handleShowOnlyTeamChange = (value: boolean) => {
    setShowOnlyTeam(value);
  };

  const handleShowOnlyJuspayOthersChange = (value: boolean) => {
    setShowOnlyJuspayOthers(value);
  };

  // Save filters to localStorage AND update URL for sharing whenever they change
  React.useEffect(() => {
    const filters = {
      showOnlyMerchant,
      showOnlyTeam,
      showOnlyJuspayOthers,
      selectedTag,
      filterCorrect,
      filterIncorrect,
      hideUnknownUser,
      teamEmails,
    };

    // Save to localStorage for personal persistence
    saveFiltersToStorage(filters);

    // Update URL for sharing (only after initial load)
    if (router.isReady) {
      updateUrlForSharing(filters);
    }
  }, [
    showOnlyMerchant,
    showOnlyTeam,
    showOnlyJuspayOthers,
    selectedTag,
    filterCorrect,
    filterIncorrect,
    hideUnknownUser,
    teamEmails,
    router.isReady,
    updateUrlForSharing,
    saveFiltersToStorage,
  ]);

  // Clear selected tool call when session changes
  React.useEffect(() => {
    setSelectedToolCall(null);
    setSelectedTraceForDetails(null);
  }, [selectedSessionId]);

  // Session selection handler with URL update for sharing
  const handleSessionSelect = (sessionId: string) => {
    setSelectedSessionId(sessionId);

    // Update URL to include selected session for sharing
    if (typeof window !== "undefined" && router.isReady) {
      const params = new URLSearchParams(window.location.search);
      params.set("sessionId", sessionId);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, "", newUrl);
      console.log("🔗 Session URL updated for sharing:", newUrl);
    }
  };

  // Fetch sessions based on date range with pagination
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [hasMoreSessions, setHasMoreSessions] = useState(true);

  const sessions = api.sessions.all.useQuery(
    {
      projectId,
      filter: [
        {
          column: "createdAt",
          type: "datetime",
          operator: ">=",
          value: dateRange.from,
        },
        {
          column: "createdAt",
          type: "datetime",
          operator: "<=",
          value: dateRange.to,
        },
      ],
      page: sessionPage,
      limit: 99,
      orderBy: { column: "createdAt", order: "DESC" },
    },
    {
      enabled: !!projectId && !!dateRange?.from && !!dateRange?.to,
    },
  );

  // Accumulate sessions from pagination
  React.useEffect(() => {
    if (sessions.data?.sessions) {
      const newSessions = sessions.data.sessions;
      if (sessionPage === 0) {
        // First page - replace all sessions
        setAllSessions(newSessions);
      } else {
        // Subsequent pages - append to existing sessions
        setAllSessions((prev) => [...prev, ...newSessions]);
      }

      // Check if we have more sessions to load
      if (newSessions.length < 99) {
        setHasMoreSessions(false);
      }
    }
  }, [sessions.data?.sessions, sessionPage]);

  // Auto-load more sessions when there are more available
  React.useEffect(() => {
    if (hasMoreSessions && !sessions.isLoading && sessions.data?.sessions) {
      setSessionPage((prev) => prev + 1);
    }
  }, [hasMoreSessions, sessions.isLoading, sessions.data?.sessions]);

  // Reset session pagination when date range changes with loading state
  React.useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      setIsLoadingData(true);
      setAllSessions([]);
      setSessionPage(0);
      setHasMoreSessions(true);

      // Clear loading state after a short delay to prevent race conditions
      const timer = setTimeout(() => {
        setIsLoadingData(false);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [projectId, dateRange?.from, dateRange?.to]);

  // Create wrapper for sessions
  const allSessionsData = React.useMemo(
    () => ({
      sessions: allSessions,
    }),
    [allSessions],
  );

  // Reset when date range changes
  React.useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      console.log("🔄 SESSIONS - Date range changed, will refetch:", {
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
      });
    }
  }, [dateRange?.from, dateRange?.to]);

  // Fetch all tags for filtering (no limit issues!)
  const traceFilterOptions = api.traces.filterOptions.useQuery(
    {
      projectId,
      timestampFilter: [
        {
          column: "timestamp",
          type: "datetime",
          operator: ">=",
          value: dateRange.from,
        },
      ],
    },
    {
      enabled: !!projectId,
    },
  );

  // Fetch scores with pagination
  const [allScores, setAllScores] = React.useState<any[]>([]);
  const [scoresPage, setScoresPage] = React.useState(0);
  const [hasMoreScores, setHasMoreScores] = React.useState(true);

  const scoresQuery = api.scores.all.useQuery(
    {
      projectId,
      filter: [
        {
          column: "name",
          type: "string",
          operator: "=",
          value: "genius-feedback",
        },
      ],
      page: scoresPage,
      limit: 99,
      orderBy: { column: "timestamp", order: "DESC" },
    },
    {
      enabled: !!projectId && !!allTraces.length && hasMoreScores,
    },
  );

  // Accumulate scores from pagination
  React.useEffect(() => {
    if (scoresQuery.data?.scores) {
      const newScores = scoresQuery.data.scores;
      if (scoresPage === 0) {
        setAllScores(newScores);
      } else {
        setAllScores((prev) => [...prev, ...newScores]);
      }

      if (newScores.length < 99) {
        setHasMoreScores(false);
      }
    }
  }, [scoresQuery.data?.scores, scoresPage]);

  // Auto-load more scores when there are more available
  React.useEffect(() => {
    if (hasMoreScores && !scoresQuery.isLoading && scoresQuery.data?.scores) {
      setScoresPage((prev) => prev + 1);
    }
  }, [hasMoreScores, scoresQuery.isLoading, scoresQuery.data?.scores]);

  // Reset scores pagination when date range changes
  React.useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      setAllScores([]);
      setScoresPage(0);
      setHasMoreScores(true);
    }
  }, [dateRange?.from, dateRange?.to]);

  // Simple scores data wrapper
  const allScoresData = React.useMemo(
    () => ({
      scores: allScores,
    }),
    [allScores],
  );

  // Create a map of session IDs to their evaluation status (correct/incorrect)
  const sessionEvaluationMap = React.useMemo(() => {
    if (!allScoresData.scores.length || !allSessionsTracesData.traces.length) {
      return new Map<string, "correct" | "incorrect" | "mixed">();
    }

    const map = new Map<string, "correct" | "incorrect" | "mixed">();

    // Group scores by session
    const sessionScores = new Map<string, number[]>();
    allScoresData.scores.forEach((score: any) => {
      const trace = allSessionsTracesData.traces.find(
        (t) => t.id === score.traceId,
      );
      if (trace?.sessionId) {
        if (!sessionScores.has(trace.sessionId)) {
          sessionScores.set(trace.sessionId, []);
        }
        sessionScores.get(trace.sessionId)!.push(score.value);
      }
    });

    // Determine session evaluation status
    sessionScores.forEach((scores, sessionId) => {
      const hasCorrect = scores.some((v) => v === 1);
      const hasIncorrect = scores.some((v) => v === 0);

      if (hasCorrect && hasIncorrect) {
        map.set(sessionId, "mixed");
      } else if (hasCorrect) {
        map.set(sessionId, "correct");
      } else if (hasIncorrect) {
        map.set(sessionId, "incorrect");
      }
    });

    return map;
  }, [allScoresData.scores, allSessionsTracesData.traces]);

  // Create a map of session IDs to their tags
  const sessionToTagsMap = React.useMemo(() => {
    if (!allSessionsTracesData.traces.length)
      return new Map<string, string[]>();

    const map = new Map<string, string[]>();
    allSessionsTracesData.traces.forEach((trace) => {
      if (trace.sessionId && trace.tags && trace.tags.length > 0) {
        // Store all tags for each session
        if (!map.has(trace.sessionId)) {
          map.set(trace.sessionId, trace.tags);
        } else {
          // Merge tags if session already exists
          const existingTags = map.get(trace.sessionId) || [];
          map.set(trace.sessionId, [
            ...new Set([...existingTags, ...trace.tags]),
          ]);
        }
      }
    });
    return map;
  }, [allSessionsTracesData.traces]);

  // Get unique tags from filterOptions API (no 100-trace limit!)
  const uniqueTags = React.useMemo(() => {
    if (!traceFilterOptions.data?.tags) return [];
    return traceFilterOptions.data.tags.map((t) => t.value).sort();
  }, [traceFilterOptions.data?.tags]);

  // Fetch traces for selected session
  const sessionTraces = api.traces.all.useQuery(
    {
      projectId,
      filter: selectedSessionId
        ? [
            {
              column: "sessionId",
              type: "string",
              operator: "=",
              value: selectedSessionId,
            },
          ]
        : [],
      searchQuery: null,
      searchType: [],
      page: 0,
      limit: 100,
      orderBy: { column: "timestamp", order: "ASC" },
    },
    {
      enabled: !!projectId && !!selectedSessionId,
    },
  );

  // Fetch full trace details for input/output
  const [selectedTraceForDetails, setSelectedTraceForDetails] = useState<{
    traceId: string;
    timestamp: Date;
  } | null>(null);

  const traceDetails = api.traces.byIdWithObservationsAndScores.useQuery(
    {
      traceId: selectedTraceForDetails?.traceId ?? "",
      projectId,
      timestamp: selectedTraceForDetails?.timestamp ?? new Date(),
    },
    {
      enabled: !!selectedTraceForDetails && !!projectId,
    },
  );

  // Get observations (tool calls) from trace details - filter out GENERATION type (llm-call) and sort by startTime
  const observations = (traceDetails.data?.observations || [])
    .filter((obs: any) => {
      // Filter out llm-call observations by checking the name
      const name = obs.name || "";
      return !name.toLowerCase().includes("llm-call");
    })
    .sort((a: any, b: any) => a.startTime.getTime() - b.startTime.getTime()); // Sort chronologically (earliest first)

  // Fetch metrics for traces to get level information
  const traceMetrics = api.traces.metrics.useQuery(
    {
      projectId,
      filter: selectedSessionId
        ? [
            {
              column: "sessionId",
              type: "string",
              operator: "=",
              value: selectedSessionId,
            },
          ]
        : [],
      traceIds: sessionTraces.data?.traces.map((t) => t.id) ?? [],
    },
    {
      enabled:
        !!projectId && !!selectedSessionId && !!sessionTraces.data?.traces,
    },
  );

  const filteredSessions = React.useMemo(() => {
    return allSessionsData.sessions.filter((session) => {
      // Search filter
      const matchesSearch = searchQuery
        ? session.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          session.userIds?.some((uid: string) =>
            uid.toLowerCase().includes(searchQuery.toLowerCase()),
          )
        : true;

      if (!matchesSearch) return false;

      // Helper function to categorize user for filtering
      const categorizeUserForFilter = (userIds: string[] | undefined) => {
        if (!userIds || userIds.length === 0 || userIds[0] === "Unknown User") {
          return "unknown";
        }

        const userId = userIds[0];

        // Check if user is in team whitelist - more flexible matching
        if (
          teamEmails.some((email) => {
            const emailLower = email.toLowerCase().trim();
            const userIdLower = userId.toLowerCase().trim();

            // Try exact match first
            if (userIdLower === emailLower) return true;

            // Try contains match (user ID contains the email)
            if (userIdLower.includes(emailLower)) return true;

            // Try email contains user ID (for partial email matches)
            if (emailLower.includes(userIdLower)) return true;

            // Try domain matching if email has @ symbol
            if (emailLower.includes("@")) {
              const emailUsername = emailLower.split("@")[0];

              // Check if user ID matches username part
              if (userIdLower === emailUsername) return true;

              // Check if user ID contains username
              if (userIdLower.includes(emailUsername)) return true;
            }

            return false;
          })
        ) {
          return "team";
        }

        // Check if user is juspay internal (contains @juspay)
        if (userId.toLowerCase().includes("@juspay")) {
          return "juspay-genius-merchant";
        }

        // Otherwise it's a merchant
        return "merchant";
      };

      const userCategory = categorizeUserForFilter(session.userIds);

      // Category filters - if any are checked, show only those categories
      if (showOnlyMerchant || showOnlyTeam || showOnlyJuspayOthers) {
        const matchesSelectedCategories =
          (showOnlyMerchant && userCategory === "merchant") ||
          (showOnlyTeam && userCategory === "team") ||
          (showOnlyJuspayOthers && userCategory === "juspay-genius-merchant");

        if (!matchesSelectedCategories) {
          return false;
        }
      }

      // Tag filter
      if (selectedTag !== "all") {
        const sessionTags = sessionToTagsMap.get(session.id);
        if (!sessionTags || !sessionTags.includes(selectedTag)) return false;
      }

      // Correct/Incorrect filter
      if (filterCorrect || filterIncorrect) {
        const evaluation = sessionEvaluationMap.get(session.id);

        // If both filters are checked, show sessions that match either
        if (filterCorrect && filterIncorrect) {
          if (!evaluation) return false;
        }
        // If only correct is checked
        else if (filterCorrect) {
          if (evaluation !== "correct") return false;
        }
        // If only incorrect is checked
        else if (filterIncorrect) {
          if (evaluation !== "incorrect" && evaluation !== "mixed")
            return false;
        }
      }

      // Hide Unknown User filter
      if (hideUnknownUser) {
        const isUnknownUser =
          !session.userIds ||
          session.userIds.length === 0 ||
          session.userIds[0] === "Unknown User";
        if (isUnknownUser) return false;
      }

      return true;
    });
  }, [
    allSessionsData.sessions,
    searchQuery,
    showOnlyMerchant,
    showOnlyTeam,
    showOnlyJuspayOthers,
    selectedTag,
    filterCorrect,
    filterIncorrect,
    hideUnknownUser,
    sessionToTagsMap,
    sessionEvaluationMap,
    teamEmails,
  ]);

  // Enhanced statistics with three categories
  const statistics = React.useMemo(() => {
    if (!allSessionsTracesData.traces.length) {
      return {
        totalQueries: 0,
        merchantQueries: 0,
        geniusTeamQueries: 0,
        juspayGeniusMerchantQueries: 0,
        correctQueries: 0,
        incorrectQueries: 0,
        correctPercentage: 0,
        totalSessions: 0,
      };
    }

    // Helper function to categorize user
    const categorizeUser = (userIds: string[] | undefined) => {
      if (!userIds || userIds.length === 0 || userIds[0] === "Unknown User") {
        return "unknown";
      }

      const userId = userIds[0];

      // Check if user is in team whitelist - more flexible matching
      if (
        teamEmails.some((email) => {
          const emailLower = email.toLowerCase().trim();
          const userIdLower = userId.toLowerCase().trim();

          // Try exact match first
          if (userIdLower === emailLower) return true;

          // Try contains match (user ID contains the email)
          if (userIdLower.includes(emailLower)) return true;

          // Try email contains user ID (for partial email matches)
          if (emailLower.includes(userIdLower)) return true;

          // Try domain matching if email has @ symbol
          if (emailLower.includes("@")) {
            const emailUsername = emailLower.split("@")[0];

            // Check if user ID matches username part
            if (userIdLower === emailUsername) return true;

            // Check if user ID contains username
            if (userIdLower.includes(emailUsername)) return true;
          }

          return false;
        })
      ) {
        return "team";
      }

      // Check if user is juspay internal (contains @juspay)
      if (userId.toLowerCase().includes("@juspay")) {
        return "juspay-genius-merchant";
      }

      // Otherwise it's a merchant
      return "merchant";
    };

    // Filter sessions for statistics
    const sessionsForStats = allSessionsData.sessions.filter((session) => {
      // Search filter
      const matchesSearch = searchQuery
        ? session.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          session.userIds?.some((uid: string) =>
            uid.toLowerCase().includes(searchQuery.toLowerCase()),
          )
        : true;

      if (!matchesSearch) return false;

      const userCategory = categorizeUser(session.userIds);

      // Category filters - if any are checked, show only those categories
      if (showOnlyMerchant || showOnlyTeam || showOnlyJuspayOthers) {
        const matchesSelectedCategories =
          (showOnlyMerchant && userCategory === "merchant") ||
          (showOnlyTeam && userCategory === "team") ||
          (showOnlyJuspayOthers && userCategory === "juspay-genius-merchant");

        if (!matchesSelectedCategories) {
          return false;
        }
      }

      // Tag filter
      if (selectedTag !== "all") {
        const sessionTags = sessionToTagsMap.get(session.id);
        if (!sessionTags || !sessionTags.includes(selectedTag)) return false;
      }

      // Hide Unknown User filter
      if (hideUnknownUser) {
        const userCategory = categorizeUser(session.userIds);
        if (userCategory === "unknown") return false;
      }

      // NOTE: We deliberately exclude filterCorrect and filterIncorrect here
      // so statistics show overall numbers regardless of these filters

      return true;
    });

    // Get session IDs from sessions for statistics
    const sessionIdsForStats = new Set(
      sessionsForStats.map((session) => session.id),
    );

    // Filter traces to only include those from sessions for statistics
    const tracesForStats = allSessionsTracesData.traces.filter((trace) => {
      // Only include traces from sessions for statistics
      if (!trace.sessionId || !sessionIdsForStats.has(trace.sessionId)) {
        return false;
      }

      // Apply tag filter if selected
      if (selectedTag !== "all") {
        if (!trace.tags || !trace.tags.includes(selectedTag)) return false;
      }
      return true;
    });

    // Total queries = traces for statistics
    const totalQueries = tracesForStats.length;

    // Count correct/incorrect queries from genius-feedback scores
    let correctQueries = 0;
    let incorrectQueries = 0;

    if (allScoresData.scores.length > 0) {
      allScoresData.scores.forEach((score: any) => {
        // Check if this score belongs to a trace for statistics
        const trace = tracesForStats.find((t) => t.id === score.traceId);
        if (trace) {
          if (score.value === 1) {
            correctQueries++;
          } else if (score.value === 0) {
            incorrectQueries++;
          }
        }
      });
    }

    // Calculate percentage based on evaluated queries only (correct + incorrect)
    const evaluatedQueries = correctQueries + incorrectQueries;
    const correctPercentage =
      evaluatedQueries > 0
        ? Math.round((correctQueries / evaluatedQueries) * 100)
        : 0;
    const totalSessions = filteredSessions?.length || 0;

    return {
      totalQueries,
      merchantQueries: 0, // Will be calculated separately
      geniusTeamQueries: 0, // Will be calculated separately
      juspayGeniusMerchantQueries: 0, // Will be calculated separately
      correctQueries,
      incorrectQueries,
      correctPercentage,
      totalSessions,
    };
  }, [
    allScoresData.scores,
    allSessionsTracesData.traces,
    allSessionsData.sessions,
    filteredSessions,
    searchQuery,
    showOnlyMerchant,
    showOnlyTeam,
    showOnlyJuspayOthers,
    selectedTag,
    hideUnknownUser,
    sessionToTagsMap,
    teamEmails,
  ]);

  // Separate statistics for filter cards - always show total counts regardless of category filters
  const cardStatistics = React.useMemo(() => {
    if (!allSessionsTracesData.traces.length) {
      return {
        merchantQueries: 0,
        geniusTeamQueries: 0,
        juspayGeniusMerchantQueries: 0,
      };
    }

    // Helper function to categorize user
    const categorizeUser = (userIds: string[] | undefined) => {
      if (!userIds || userIds.length === 0 || userIds[0] === "Unknown User") {
        return "unknown";
      }

      const userId = userIds[0];

      // Check if user is in team whitelist - more flexible matching
      if (
        teamEmails.some((email) => {
          const emailLower = email.toLowerCase().trim();
          const userIdLower = userId.toLowerCase().trim();

          // Try exact match first
          if (userIdLower === emailLower) return true;

          // Try contains match (user ID contains the email)
          if (userIdLower.includes(emailLower)) return true;

          // Try email contains user ID (for partial email matches)
          if (emailLower.includes(userIdLower)) return true;

          // Try domain matching if email has @ symbol
          if (emailLower.includes("@")) {
            const emailUsername = emailLower.split("@")[0];

            // Check if user ID matches username part
            if (userIdLower === emailUsername) return true;

            // Check if user ID contains username
            if (userIdLower.includes(emailUsername)) return true;
          }

          return false;
        })
      ) {
        return "team";
      }

      // Check if user is juspay internal (contains @juspay)
      if (userId.toLowerCase().includes("@juspay")) {
        return "juspay-genius-merchant";
      }

      // Otherwise it's a merchant
      return "merchant";
    };

    // Filter sessions for card statistics - exclude category filters but include other filters
    const sessionsForCardStats = allSessionsData.sessions.filter((session) => {
      // Search filter
      const matchesSearch = searchQuery
        ? session.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          session.userIds?.some((uid: string) =>
            uid.toLowerCase().includes(searchQuery.toLowerCase()),
          )
        : true;

      if (!matchesSearch) return false;

      const userCategory = categorizeUser(session.userIds);

      // Tag filter
      if (selectedTag !== "all") {
        const sessionTags = sessionToTagsMap.get(session.id);
        if (!sessionTags || !sessionTags.includes(selectedTag)) return false;
      }

      // Hide Unknown User filter
      if (hideUnknownUser) {
        if (userCategory === "unknown") return false;
      }

      // NOTE: We deliberately exclude category filters (showOnlyMerchant, showOnlyTeam, showOnlyJuspayOthers)
      // and evaluation filters (filterCorrect, filterIncorrect) here
      // so card statistics always show total counts

      return true;
    });

    // Get session IDs from sessions for card statistics
    const sessionIdsForCardStats = new Set(
      sessionsForCardStats.map((session) => session.id),
    );

    // Filter traces to only include those from sessions for card statistics
    const tracesForCardStats = allSessionsTracesData.traces.filter((trace) => {
      // Only include traces from sessions for card statistics
      if (!trace.sessionId || !sessionIdsForCardStats.has(trace.sessionId)) {
        return false;
      }

      // Apply tag filter if selected
      if (selectedTag !== "all") {
        if (!trace.tags || !trace.tags.includes(selectedTag)) return false;
      }
      return true;
    });

    // Categorize queries by user type for cards
    let merchantQueries = 0;
    let geniusTeamQueries = 0;
    let juspayGeniusMerchantQueries = 0;

    tracesForCardStats.forEach((trace) => {
      const session = allSessionsData.sessions.find(
        (s) => s.id === trace.sessionId,
      );
      if (session) {
        const userCategory = categorizeUser(session.userIds);
        switch (userCategory) {
          case "merchant":
            merchantQueries++;
            break;
          case "team":
            geniusTeamQueries++;
            break;
          case "juspay-genius-merchant":
            juspayGeniusMerchantQueries++;
            break;
        }
      }
    });

    return {
      merchantQueries,
      geniusTeamQueries,
      juspayGeniusMerchantQueries,
    };
  }, [
    allSessionsTracesData.traces,
    allSessionsData.sessions,
    searchQuery,
    selectedTag,
    hideUnknownUser,
    sessionToTagsMap,
    teamEmails,
  ]);

  // Extract agent name from the first trace's tags (since we can't access input from list query)
  const selectedSessionAgentName = React.useMemo(() => {
    if (!sessionTraces.data?.traces || sessionTraces.data.traces.length === 0) {
      return null;
    }

    // Get the first trace's tags
    const firstTrace = sessionTraces.data.traces[0];
    if (!firstTrace?.tags || firstTrace.tags.length === 0) return null;

    // Return the first tag as the agent name
    return firstTrace.tags[0];
  }, [sessionTraces.data?.traces]);

  // Auto-scroll to selected session only when needed (page refresh or URL navigation)
  const [hasAutoScrolled, setHasAutoScrolled] = React.useState(false);

  React.useEffect(() => {
    if (
      selectedSessionId &&
      filteredSessions.length > 0 &&
      !sessions.isLoading &&
      !hasAutoScrolled &&
      sessionIdFromUrl
    ) {
      const timer = setTimeout(() => {
        const selectedElement = document.querySelector(
          `[data-session-id="${selectedSessionId}"]`,
        );
        if (selectedElement) {
          // Check if element is already visible
          const rect = selectedElement.getBoundingClientRect();
          const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;

          // Only scroll if not visible
          if (!isVisible) {
            selectedElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }
          setHasAutoScrolled(true);
        }
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [
    selectedSessionId,
    filteredSessions.length,
    sessions.isLoading,
    hasAutoScrolled,
    sessionIdFromUrl,
  ]);

  // Reset auto-scroll flag when session changes manually (not from URL)
  React.useEffect(() => {
    if (!sessionIdFromUrl) {
      setHasAutoScrolled(false);
    }
  }, [sessionIdFromUrl]);

  // Mouse event handlers for resizing (right panel only)
  const [dragStartX, setDragStartX] = React.useState(0);
  const [dragStartWidth, setDragStartWidth] = React.useState(0);

  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing("right");
      setDragStartX(e.clientX);
      setDragStartWidth(rightPanelWidth);
    },
    [rightPanelWidth],
  );

  const handleMouseMove = React.useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const deltaX = e.clientX - dragStartX;

      // For right panel, subtract the delta from the starting width
      const newWidth = Math.max(300, Math.min(800, dragStartWidth - deltaX));
      setRightPanelWidth(newWidth);
    },
    [isResizing, dragStartX, dragStartWidth],
  );

  const handleMouseUp = React.useCallback(() => {
    setIsResizing(null);
  }, []);

  // Add mouse event listeners
  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Responsive breakpoints
  const [windowWidth, setWindowWidth] = React.useState(0);

  React.useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    if (typeof window !== "undefined") {
      setWindowWidth(window.innerWidth);
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const isDesktop = windowWidth >= 1024;

  // Calculate detailed statistics for the table
  const detailedStatistics = React.useMemo(() => {
    if (!allSessionsTracesData.traces.length) {
      return {
        merchant: {
          totalSessions: 0,
          totalQueries: 0,
          incorrectQueries: 0,
          accuracy: 0,
        },
        team: {
          totalSessions: 0,
          totalQueries: 0,
          incorrectQueries: 0,
          accuracy: 0,
        },
        other: {
          totalSessions: 0,
          totalQueries: 0,
          incorrectQueries: 0,
          accuracy: 0,
        },
      };
    }

    // Helper function to categorize user
    const categorizeUser = (userIds: string[] | undefined) => {
      if (!userIds || userIds.length === 0 || userIds[0] === "Unknown User") {
        return "unknown";
      }

      const userId = userIds[0];

      // Check if user is in team whitelist
      if (
        teamEmails.some((email) => {
          const emailLower = email.toLowerCase().trim();
          const userIdLower = userId.toLowerCase().trim();

          return (
            userIdLower === emailLower ||
            userIdLower.includes(emailLower) ||
            emailLower.includes(userIdLower) ||
            (emailLower.includes("@") &&
              userIdLower === emailLower.split("@")[0])
          );
        })
      ) {
        return "team";
      }

      // Check if user is juspay internal
      if (userId.toLowerCase().includes("@juspay")) {
        return "juspay-genius-merchant";
      }

      return "merchant";
    };

    // Filter sessions based on current filters (excluding correct/incorrect filters)
    const sessionsForStats = allSessionsData.sessions.filter((session) => {
      const matchesSearch = searchQuery
        ? session.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          session.userIds?.some((uid: string) =>
            uid.toLowerCase().includes(searchQuery.toLowerCase()),
          )
        : true;

      if (!matchesSearch) return false;

      const userCategory = categorizeUser(session.userIds);

      if (showOnlyMerchant || showOnlyTeam || showOnlyJuspayOthers) {
        const matchesSelectedCategories =
          (showOnlyMerchant && userCategory === "merchant") ||
          (showOnlyTeam && userCategory === "team") ||
          (showOnlyJuspayOthers && userCategory === "juspay-genius-merchant");

        if (!matchesSelectedCategories) return false;
      }

      if (selectedTag !== "all") {
        const sessionTags = sessionToTagsMap.get(session.id);
        if (!sessionTags || !sessionTags.includes(selectedTag)) return false;
      }

      if (hideUnknownUser && userCategory === "unknown") return false;

      return true;
    });

    // Group sessions by category
    const sessionsByCategory = {
      merchant: sessionsForStats.filter(
        (s) => categorizeUser(s.userIds) === "merchant",
      ),
      team: sessionsForStats.filter(
        (s) => categorizeUser(s.userIds) === "team",
      ),
      other: sessionsForStats.filter(
        (s) => categorizeUser(s.userIds) === "juspay-genius-merchant",
      ),
    };

    // Calculate stats for each category
    const calculateCategoryStats = (sessions: any[]) => {
      const sessionIds = new Set(sessions.map((s) => s.id));

      // Get traces for these sessions
      const categoryTraces = allSessionsTracesData.traces.filter(
        (trace) => trace.sessionId && sessionIds.has(trace.sessionId),
      );

      // Get scores for these traces
      const categoryScores = allScoresData.scores.filter((score) =>
        categoryTraces.some((trace) => trace.id === score.traceId),
      );

      const correctQueries = categoryScores.filter(
        (score) => score.value === 1,
      ).length;
      const incorrectQueries = categoryScores.filter(
        (score) => score.value === 0,
      ).length;
      const totalEvaluated = correctQueries + incorrectQueries;
      const accuracy =
        totalEvaluated > 0
          ? Math.round((correctQueries / totalEvaluated) * 100)
          : 0;

      return {
        totalSessions: sessions.length,
        totalQueries: categoryTraces.length,
        incorrectQueries,
        accuracy,
      };
    };

    return {
      merchant: calculateCategoryStats(sessionsByCategory.merchant),
      team: calculateCategoryStats(sessionsByCategory.team),
      other: calculateCategoryStats(sessionsByCategory.other),
    };
  }, [
    allSessionsTracesData.traces,
    allSessionsData.sessions,
    allScoresData.scores,
    searchQuery,
    showOnlyMerchant,
    showOnlyTeam,
    showOnlyJuspayOthers,
    selectedTag,
    hideUnknownUser,
    sessionToTagsMap,
    teamEmails,
  ]);

  return (
    <Page
      headerProps={{
        title: "Session Analytics V2",
        help: {
          description:
            "Session-based conversation view with detailed trace analysis.",
        },
      }}
    >
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* Mobile Menu Button - Only show when sidebar is closed */}
        {isMobile && !isMobileMenuOpen && (
          <div className="absolute left-4 top-6 z-50 shadow-lg lg:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Mobile Overlay */}
        {isMobile && isMobileMenuOpen && (
          <div
            className="absolute inset-0 z-30 bg-black/50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Left Sidebar - Sessions List */}
        <div
          className={cn(
            "border-r bg-background transition-all duration-300",
            isMobile
              ? cn(
                  "absolute inset-y-0 left-0 z-40 w-80 transform",
                  isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
                )
              : isTablet
                ? "w-72"
                : "w-84",
          )}
          style={undefined}
        >
          <div className="flex h-full flex-col">
            {/* Mobile Close Button - Inside sidebar */}
            {isMobile && (
              <div className="flex flex-shrink-0 items-center justify-between border-b p-3">
                <h2 className="text-lg font-semibold">Filters</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Date Range Filter - Always visible */}
            <div
              className={cn(
                "flex-shrink-0 border-b",
                isMobile ? "px-3 pb-4 pt-8" : "p-4",
              )}
            >
              <Collapsible
                open={showDatePicker}
                onOpenChange={setShowDatePicker}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-auto w-full justify-start px-3 py-3",
                      isMobile ? "min-h-[6rem]" : "min-h-[3rem]",
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4 flex-shrink-0" />
                    <div className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left">
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        Select date range
                      </span>
                      <span
                        className={cn(
                          "w-full font-medium leading-tight",
                          isMobile
                            ? "break-words text-xs"
                            : "break-words text-xs",
                        )}
                      >
                        {dateRange.from.toLocaleDateString()} -{" "}
                        {dateRange.to.toLocaleDateString()}
                      </span>
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <Card className="p-3">
                    <div className="space-y-2">
                      <div className="mb-2 text-xs font-medium">
                        Quick select
                      </div>
                      <div className="space-y-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-xs"
                          onClick={() => {
                            const today = new Date();
                            const newRange = {
                              from: new Date(
                                today.getFullYear(),
                                today.getMonth(),
                                today.getDate(),
                                0,
                                0,
                                0,
                                0,
                              ),
                              to: new Date(
                                today.getFullYear(),
                                today.getMonth(),
                                today.getDate(),
                                23,
                                59,
                                59,
                                999,
                              ),
                            };
                            handleDateRangeChange(newRange);
                          }}
                        >
                          Today
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-xs"
                          onClick={() => {
                            const today = new Date();
                            const yesterday = new Date(
                              today.getFullYear(),
                              today.getMonth(),
                              today.getDate() - 1,
                            );
                            const newRange = {
                              from: new Date(
                                yesterday.getFullYear(),
                                yesterday.getMonth(),
                                yesterday.getDate(),
                                0,
                                0,
                                0,
                                0,
                              ),
                              to: new Date(
                                yesterday.getFullYear(),
                                yesterday.getMonth(),
                                yesterday.getDate(),
                                23,
                                59,
                                59,
                                999,
                              ),
                            };
                            handleDateRangeChange(newRange);
                          }}
                        >
                          Yesterday
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-xs"
                          onClick={() => {
                            const today = new Date();
                            const last7Days = new Date(
                              today.getFullYear(),
                              today.getMonth(),
                              today.getDate() - 7,
                            );
                            const newRange = {
                              from: new Date(
                                last7Days.getFullYear(),
                                last7Days.getMonth(),
                                last7Days.getDate(),
                                0,
                                0,
                                0,
                                0,
                              ),
                              to: new Date(
                                today.getFullYear(),
                                today.getMonth(),
                                today.getDate(),
                                23,
                                59,
                                59,
                                999,
                              ),
                            };
                            handleDateRangeChange(newRange);
                          }}
                        >
                          Last 7 days
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-xs"
                          onClick={() => {
                            const today = new Date();
                            const last30Days = new Date(
                              today.getFullYear(),
                              today.getMonth(),
                              today.getDate() - 30,
                            );
                            const newRange = {
                              from: new Date(
                                last30Days.getFullYear(),
                                last30Days.getMonth(),
                                last30Days.getDate(),
                                0,
                                0,
                                0,
                                0,
                              ),
                              to: new Date(
                                today.getFullYear(),
                                today.getMonth(),
                                today.getDate(),
                                23,
                                59,
                                59,
                                999,
                              ),
                            };
                            handleDateRangeChange(newRange);
                          }}
                        >
                          Last 30 days
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-xs"
                          onClick={() => {
                            const today = new Date();
                            const last90Days = new Date(
                              today.getFullYear(),
                              today.getMonth(),
                              today.getDate() - 90,
                            );
                            const newRange = {
                              from: new Date(
                                last90Days.getFullYear(),
                                last90Days.getMonth(),
                                last90Days.getDate(),
                                0,
                                0,
                                0,
                                0,
                              ),
                              to: new Date(
                                today.getFullYear(),
                                today.getMonth(),
                                today.getDate(),
                                23,
                                59,
                                59,
                                999,
                              ),
                            };
                            handleDateRangeChange(newRange);
                          }}
                        >
                          Last 90 days
                        </Button>

                        {/* Custom Date Picker */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs"
                            >
                              Custom
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="range"
                              selected={{
                                from: dateRange.from,
                                to: dateRange.to,
                              }}
                              onSelect={(range: any) => {
                                if (range?.from) {
                                  const fromDate = new Date(
                                    range.from.getTime(),
                                  );
                                  const toDate = range.to
                                    ? new Date(range.to.getTime())
                                    : new Date(range.from.getTime());

                                  const newRange = {
                                    from: new Date(
                                      fromDate.getFullYear(),
                                      fromDate.getMonth(),
                                      fromDate.getDate(),
                                      0,
                                      0,
                                      0,
                                      0,
                                    ),
                                    to: new Date(
                                      toDate.getFullYear(),
                                      toDate.getMonth(),
                                      toDate.getDate(),
                                      23,
                                      59,
                                      59,
                                      999,
                                    ),
                                  };
                                  handleDateRangeChange(newRange);
                                }
                              }}
                              numberOfMonths={2}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </Card>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Enhanced Statistics Section */}
            <div
              className={cn(
                "flex-shrink-0 border-b",
                isMobile ? "px-3 py-4" : "p-4",
              )}
            >
              {sessions.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <div className="space-y-3">
                  {/* Main Stats Card */}
                  <div className="rounded-lg border bg-gradient-to-r from-blue-50 to-purple-50 p-4 dark:from-blue-950/20 dark:to-purple-950/20">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-blue-600 dark:text-blue-400">
                        📊
                      </span>
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {filteredSessions && filteredSessions.length > 100
                          ? "100+"
                          : filteredSessions?.length || 0}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        sessions
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-red-600 dark:text-red-400">
                          {statistics.incorrectQueries}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          incorrect
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">/</span>
                        <span className="font-bold text-gray-600 dark:text-gray-400">
                          {statistics.totalQueries}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          total
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="font-bold text-green-600 dark:text-green-400">
                          ({statistics.correctPercentage}%
                        </span>
                        <span className="text-xs text-muted-foreground">
                          correct)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Query Categories - Now Clickable Filter Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    {/* Merchant Queries - Clickable */}
                    <div
                      className={cn(
                        "cursor-pointer rounded-lg border p-2 text-center transition-all duration-200 hover:scale-105",
                        showOnlyMerchant
                          ? "border-green-500 bg-green-100 ring-2 ring-green-200 dark:border-green-400 dark:bg-green-900/40"
                          : "border-green-200 bg-green-50 hover:bg-green-100 dark:border-green-800 dark:bg-green-950/20 dark:hover:bg-green-900/30",
                      )}
                      onClick={() =>
                        handleShowOnlyMerchantChange(!showOnlyMerchant)
                      }
                    >
                      <div
                        className={cn(
                          "relative mx-auto mb-1 flex items-center justify-center rounded-full font-bold text-white",
                          cardStatistics.merchantQueries.toString().length <= 2
                            ? "h-8 w-8 text-xs"
                            : cardStatistics.merchantQueries.toString()
                                  .length === 3
                              ? "h-9 w-9 text-xs"
                              : "h-10 w-10 text-xs",
                          showOnlyMerchant ? "bg-green-600" : "bg-green-500",
                        )}
                      >
                        {cardStatistics.merchantQueries > 9999
                          ? "9999+"
                          : cardStatistics.merchantQueries}
                        {showOnlyMerchant && (
                          <div className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-green-600">
                            <span className="text-xs text-white">✓</span>
                          </div>
                        )}
                      </div>
                      <div
                        className={cn(
                          "text-xs font-medium",
                          showOnlyMerchant
                            ? "text-green-800 dark:text-green-300"
                            : "text-green-700 dark:text-green-400",
                        )}
                      >
                        Merchant
                      </div>
                    </div>

                    {/* Genius Team Queries - Clickable */}
                    <div
                      className={cn(
                        "cursor-pointer rounded-lg border p-2 text-center transition-all duration-200 hover:scale-105",
                        showOnlyTeam
                          ? "border-blue-500 bg-blue-100 ring-2 ring-blue-200 dark:border-blue-400 dark:bg-blue-900/40"
                          : "border-blue-200 bg-blue-50 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/20 dark:hover:bg-blue-900/30",
                      )}
                      onClick={() => handleShowOnlyTeamChange(!showOnlyTeam)}
                    >
                      <div
                        className={cn(
                          "relative mx-auto mb-1 flex items-center justify-center rounded-full font-bold text-white",
                          cardStatistics.geniusTeamQueries.toString().length <=
                            2
                            ? "h-8 w-8 text-xs"
                            : cardStatistics.geniusTeamQueries.toString()
                                  .length === 3
                              ? "h-9 w-9 text-xs"
                              : "h-10 w-10 text-xs",
                          showOnlyTeam ? "bg-blue-600" : "bg-blue-500",
                        )}
                      >
                        {cardStatistics.geniusTeamQueries > 9999
                          ? "9999+"
                          : cardStatistics.geniusTeamQueries}
                        {showOnlyTeam && (
                          <div className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-blue-600">
                            <span className="text-xs text-white">✓</span>
                          </div>
                        )}
                      </div>
                      <div
                        className={cn(
                          "text-xs font-medium",
                          showOnlyTeam
                            ? "text-blue-800 dark:text-blue-300"
                            : "text-blue-700 dark:text-blue-400",
                        )}
                      >
                        Team
                      </div>
                    </div>

                    {/* Juspay-Genius-Merchant Queries - Clickable */}
                    <div
                      className={cn(
                        "cursor-pointer rounded-lg border p-2 text-center transition-all duration-200 hover:scale-105",
                        showOnlyJuspayOthers
                          ? "border-purple-500 bg-purple-100 ring-2 ring-purple-200 dark:border-purple-400 dark:bg-purple-900/40"
                          : "border-purple-200 bg-purple-50 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/20 dark:hover:bg-purple-900/30",
                      )}
                      onClick={() =>
                        handleShowOnlyJuspayOthersChange(!showOnlyJuspayOthers)
                      }
                    >
                      <div
                        className={cn(
                          "relative mx-auto mb-1 flex items-center justify-center rounded-full font-bold text-white",
                          cardStatistics.juspayGeniusMerchantQueries.toString()
                            .length <= 2
                            ? "h-8 w-8 text-xs"
                            : cardStatistics.juspayGeniusMerchantQueries.toString()
                                  .length === 3
                              ? "h-9 w-9 text-xs"
                              : "h-10 w-10 text-xs",
                          showOnlyJuspayOthers
                            ? "bg-purple-600"
                            : "bg-purple-500",
                        )}
                      >
                        {cardStatistics.juspayGeniusMerchantQueries > 9999
                          ? "9999+"
                          : cardStatistics.juspayGeniusMerchantQueries}
                        {showOnlyJuspayOthers && (
                          <div className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-purple-600">
                            <span className="text-xs text-white">✓</span>
                          </div>
                        )}
                      </div>
                      <div
                        className={cn(
                          "text-xs font-medium",
                          showOnlyJuspayOthers
                            ? "text-purple-800 dark:text-purple-300"
                            : "text-purple-700 dark:text-purple-400",
                        )}
                      >
                        Other
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Search and Filters */}
            <div
              className={cn(
                "flex-shrink-0 space-y-3 border-b",
                isMobile ? "px-3 py-3" : "p-4",
              )}
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search sessions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <Filter className="mr-2 h-4 w-4" />
                    {showFilters ? "Hide" : "Show"} Filters
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-3">
                  <div className="space-y-3">
                    {/* Tag Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Filter by Agent Name
                      </label>
                      <Select
                        value={selectedTag}
                        onValueChange={handleSelectedTagChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="All Tags" />
                        </SelectTrigger>
                        <SelectContent side="bottom" align="start">
                          <SelectItem value="all">All Tags</SelectItem>
                          {uniqueTags.map((tag) => (
                            <SelectItem key={tag} value={tag}>
                              {tag}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Correct/Incorrect Filters */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Filter by Evaluation
                      </label>
                      <div className="space-y-1">
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={filterCorrect}
                            onChange={(e) =>
                              handleFilterCorrectChange(e.target.checked)
                            }
                            className="rounded"
                          />
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                          <span className="text-sm">
                            Show only correct sessions
                          </span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={filterIncorrect}
                            onChange={(e) =>
                              handleFilterIncorrectChange(e.target.checked)
                            }
                            className="rounded"
                          />
                          <XCircle className="h-3 w-3 text-red-600" />
                          <span className="text-sm">
                            Show only incorrect sessions
                          </span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={hideUnknownUser}
                            onChange={(e) =>
                              handleHideUnknownUserChange(e.target.checked)
                            }
                            className="rounded"
                          />
                          <User className="h-3 w-3 text-gray-600" />
                          <span className="text-sm">Hide unknown user</span>
                        </label>
                      </div>
                    </div>

                    {/* Show More Filters Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowAdvancedFilters(true)}
                    >
                      <Filter className="mr-2 h-4 w-4" />
                      Show More Filters
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Advanced Filters Overlay */}
              {showAdvancedFilters && (
                <>
                  {/* Overlay Background */}
                  <div
                    className="fixed inset-0 z-50 bg-black/50"
                    onClick={() => setShowAdvancedFilters(false)}
                  />

                  {/* Advanced Filters Modal */}
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md bg-background shadow-lg">
                      <div className="flex items-center justify-between border-b p-4">
                        <h3 className="text-lg font-semibold">
                          Advanced Filters
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAdvancedFilters(false)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-4 p-4">
                        {/* Team Email Selection with Dropdown */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Team Emails
                          </label>
                          <div className="space-y-2">
                            {/* Email Dropdown with Search */}
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-full justify-between text-xs"
                                  size="sm"
                                >
                                  <span>
                                    {teamEmails.length > 0
                                      ? `${teamEmails.length} email(s) selected`
                                      : "Select team emails..."}
                                  </span>
                                  <Search className="ml-2 h-3 w-3" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-72 p-3"
                                align="start"
                              >
                                <div className="space-y-3">
                                  <div className="text-sm font-medium">
                                    Select Team Members
                                  </div>

                                  {/* Search Input */}
                                  <div className="relative">
                                    <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                      placeholder="Search emails..."
                                      value={newEmailInput}
                                      onChange={(e) =>
                                        setNewEmailInput(e.target.value)
                                      }
                                      className="pl-7 text-xs"
                                    />
                                  </div>

                                  {/* Available Emails List */}
                                  <ScrollArea className="h-32">
                                    <div className="space-y-1">
                                      {(() => {
                                        // Get unique user emails from current date range
                                        const uniqueEmails = new Set<string>();
                                        allSessionsData.sessions.forEach(
                                          (session) => {
                                            if (
                                              session.userIds &&
                                              session.userIds.length > 0
                                            ) {
                                              const userId = session.userIds[0];
                                              if (
                                                userId &&
                                                userId !== "Unknown User" &&
                                                (userId.includes("@") ||
                                                  userId.includes("."))
                                              ) {
                                                uniqueEmails.add(userId);
                                              }
                                            }
                                          },
                                        );

                                        // Filter emails based on search
                                        const filteredEmails = Array.from(
                                          uniqueEmails,
                                        )
                                          .filter(
                                            (email) =>
                                              newEmailInput === "" ||
                                              email
                                                .toLowerCase()
                                                .includes(
                                                  newEmailInput.toLowerCase(),
                                                ),
                                          )
                                          .sort();

                                        return filteredEmails.map((email) => (
                                          <label
                                            key={email}
                                            className="flex cursor-pointer items-center gap-2 rounded p-1 hover:bg-accent"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={teamEmails.includes(
                                                email,
                                              )}
                                              onChange={(e) => {
                                                if (e.target.checked) {
                                                  setTeamEmails((prev) => [
                                                    ...prev,
                                                    email,
                                                  ]);
                                                } else {
                                                  setTeamEmails((prev) =>
                                                    prev.filter(
                                                      (e) => e !== email,
                                                    ),
                                                  );
                                                }
                                              }}
                                              className="rounded"
                                            />
                                            <span className="flex-1 truncate text-xs">
                                              {email}
                                            </span>
                                          </label>
                                        ));
                                      })()}
                                    </div>
                                  </ScrollArea>

                                  {/* Quick Actions */}
                                  <div className="space-y-1 border-t pt-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="w-full justify-start text-xs"
                                      onClick={() => {
                                        // Select all emails from current date range
                                        const uniqueEmails = new Set<string>();
                                        allSessionsData.sessions.forEach(
                                          (session) => {
                                            if (
                                              session.userIds &&
                                              session.userIds.length > 0
                                            ) {
                                              const userId = session.userIds[0];
                                              if (
                                                userId &&
                                                userId !== "Unknown User" &&
                                                (userId.includes("@") ||
                                                  userId.includes("."))
                                              ) {
                                                uniqueEmails.add(userId);
                                              }
                                            }
                                          },
                                        );
                                        setTeamEmails(Array.from(uniqueEmails));
                                      }}
                                    >
                                      Select All Emails
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="w-full justify-start text-xs"
                                      onClick={() => setTeamEmails([])}
                                    >
                                      Clear All
                                    </Button>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>

                            {/* Selected Emails Display */}
                            {teamEmails.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {teamEmails.map((email, index) => (
                                  <Badge
                                    key={index}
                                    variant="secondary"
                                    className="cursor-pointer text-xs"
                                    onClick={() => {
                                      setTeamEmails((prev) =>
                                        prev.filter((_, i) => i !== index),
                                      );
                                    }}
                                  >
                                    {email} ×
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Apply Filters Button - For Team Email Settings */}
                        <div className="border-t pt-4">
                          <Button
                            className="w-full"
                            onClick={() => setShowAdvancedFilters(false)}
                          >
                            Apply Filters
                          </Button>
                        </div>

                        {/* Manual Ratings Section */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Manual Ratings
                          </label>
                          <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-red-50 p-4 dark:border-orange-800 dark:from-orange-950/20 dark:to-red-950/20">
                            <div className="space-y-3">
                              <div className="mb-2 flex items-center gap-2">
                                <Clock className="h-4 w-4 text-orange-600" />
                                <span className="text-sm font-medium text-orange-800 dark:text-orange-300">
                                  Rate Assistant Responses
                                </span>
                              </div>

                              <p className="mb-3 text-xs text-orange-700 dark:text-orange-400">
                                Click the button below to open the manual
                                ratings interface
                              </p>

                              <Button
                                onClick={() => {
                                  setShowManualRatingsModal(true);
                                  setShowAdvancedFilters(false);
                                }}
                                className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white hover:from-orange-700 hover:to-red-700"
                                size="sm"
                              >
                                <Clock className="mr-2 h-4 w-4" />
                                Open Manual Ratings
                              </Button>

                              {/* Show rating statistics if any ratings exist */}
                              {manualRatings.size > 0 && (
                                <div className="mt-3 border-t border-orange-200 pt-3 dark:border-orange-800">
                                  <div className="mb-2 text-xs text-orange-700 dark:text-orange-400">
                                    Current Ratings:
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div className="text-center">
                                      <div className="font-semibold text-green-600">
                                        {
                                          Array.from(
                                            manualRatings.values(),
                                          ).filter((r) => r === "correct")
                                            .length
                                        }
                                      </div>
                                      <div className="text-green-600">
                                        Correct
                                      </div>
                                    </div>
                                    <div className="text-center">
                                      <div className="font-semibold text-yellow-600">
                                        {
                                          Array.from(
                                            manualRatings.values(),
                                          ).filter((r) => r === "needs-work")
                                            .length
                                        }
                                      </div>
                                      <div className="text-yellow-600">
                                        Needs Work
                                      </div>
                                    </div>
                                    <div className="text-center">
                                      <div className="font-semibold text-red-600">
                                        {
                                          Array.from(
                                            manualRatings.values(),
                                          ).filter((r) => r === "wrong").length
                                        }
                                      </div>
                                      <div className="text-red-600">Wrong</div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </Card>
                        </div>
                      </div>
                    </Card>
                  </div>
                </>
              )}

              <div className="text-xs text-muted-foreground">
                Showing: {filteredSessions?.length || 0} of{" "}
                {allSessionsData.sessions.length || 0} sessions
              </div>
            </div>

            {/* Sessions List */}
            <ScrollArea className="flex-1">
              {sessions.isLoading || isLoadingData ? (
                <div className="space-y-3 p-4 pb-8">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                  {isLoadingData && (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      Loading data for new date range...
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-2 pb-8">
                  {filteredSessions?.map((session) => {
                    // Get the most recent trace timestamp for this session
                    const sessionTraceTimestamp = allSessionsTracesData.traces
                      .filter((trace) => trace.sessionId === session.id)
                      .sort(
                        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
                      )[0]?.timestamp;

                    const displayTime =
                      sessionTraceTimestamp || session.createdAt;

                    return (
                      <Card
                        key={session.id}
                        data-session-id={session.id}
                        className={cn(
                          "mb-3 cursor-pointer p-3 transition-colors hover:bg-accent",
                          selectedSessionId === session.id &&
                            "border-2 border-blue-500 bg-accent",
                        )}
                        onClick={() => handleSessionSelect(session.id)}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                {session.userIds?.[0] || "Unknown User"}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {session.countTraces} traces
                            </Badge>
                          </div>

                          <div className="text-xs text-muted-foreground">
                            Session: {session.id.slice(0, 16)}...
                          </div>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(displayTime).toLocaleString()}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Middle Section - Conversation Flow */}
        <div
          className={cn(
            "relative flex flex-1 flex-col",
            isMobile && isMobileMenuOpen && "opacity-50",
          )}
        >
          {selectedSessionId ? (
            <>
              {/* Session Header */}
              <div className="border-b bg-muted/50 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">
                      Session: {selectedSessionId}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {sessionTraces.data?.traces.length || 0} messages
                    </p>
                  </div>
                  {selectedSessionAgentName && (
                    <Badge variant="secondary" className="text-sm">
                      Agent: {selectedSessionAgentName}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Conversation Messages */}
              <ScrollArea className="flex-1 p-4">
                {sessionTraces.isLoading ? (
                  <div className="space-y-4 pb-8">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="mx-auto max-w-4xl space-y-4 pb-8">
                    {sessionTraces.data?.traces.map((trace, _index) => {
                      const traceMetric = traceMetrics.data?.find(
                        (m) => m.id === trace.id,
                      );
                      return (
                        <TraceMessage
                          key={trace.id}
                          trace={trace}
                          traceMetric={traceMetric}
                          projectId={projectId}
                          isSelected={selectedToolCall?.id === trace.id}
                          manualRating={manualRatings.get(trace.id)}
                          onManualRatingChange={updateManualRating}
                          onSelect={(traceId, timestamp) => {
                            setSelectedTraceForDetails({ traceId, timestamp });
                            setSelectedToolCall({
                              ...trace,
                              metric: traceMetric,
                            });
                            // Auto-open right panel on mobile when tool call is selected
                            if (isMobile) {
                              setIsMobileRightPanelOpen(true);
                            }
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <User className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p>Select a session to view conversation</p>
              </div>
            </div>
          )}

          {/* Manual Ratings Modal */}
          <Dialog
            open={showManualRatingsModal}
            onOpenChange={setShowManualRatingsModal}
          >
            <DialogContent className="max-h-[80vh] max-w-6xl overflow-y-auto p-0">
              <DialogHeader className="p-6 pb-4">
                <DialogTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Manual Ratings Management
                </DialogTitle>
              </DialogHeader>

              <div className="px-6 pb-6">
                <ManualRatingsContent
                  manualRatings={manualRatings}
                  allTraces={allSessionsTracesData.traces}
                  allSessions={allSessionsData.sessions}
                  onUpdateRating={updateManualRating}
                  onNavigateToSession={(sessionId) => {
                    handleSessionSelect(sessionId);
                    setShowManualRatingsModal(false);
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>

          {/* Total Stats Button - Positioned in Middle Section */}
          <Dialog open={showStatsModal} onOpenChange={setShowStatsModal}>
            <DialogTrigger asChild>
              <Button
                className={cn(
                  "absolute bottom-6 right-6 z-40 h-16 w-16 rounded-full shadow-lg transition-all duration-300 hover:scale-110",
                  "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700",
                  "flex flex-col items-center justify-center gap-1",
                )}
                size="lg"
              >
                <BarChart3 className="h-5 w-5 text-white" />
                <span className="text-xs font-medium text-white">Metrics</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] max-w-5xl overflow-y-auto p-0">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Total Statistics Overview
                </DialogTitle>
              </DialogHeader>

              <div className="p-6">
                <div className="w-full space-y-6">
                  {/* Summary Cards */}
                  <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Card className="min-w-0 border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 p-3 dark:border-blue-800 dark:from-blue-950/20 dark:to-blue-900/20">
                      <div className="text-center">
                        <div className="truncate text-xl font-bold text-blue-600 dark:text-blue-400">
                          {statistics.totalSessions}
                        </div>
                        <div className="text-xs leading-tight text-muted-foreground">
                          Total Sessions
                        </div>
                      </div>
                    </Card>

                    <Card className="min-w-0 border border-green-200 bg-gradient-to-r from-green-50 to-green-100 p-3 dark:border-green-800 dark:from-green-950/20 dark:to-green-900/20">
                      <div className="text-center">
                        <div className="truncate text-xl font-bold text-green-600 dark:text-green-400">
                          {statistics.totalQueries}
                        </div>
                        <div className="text-xs leading-tight text-muted-foreground">
                          Total Queries
                        </div>
                      </div>
                    </Card>

                    <Card className="min-w-0 border border-purple-200 bg-gradient-to-r from-purple-50 to-purple-100 p-3 dark:border-purple-800 dark:from-purple-950/20 dark:to-purple-900/20">
                      <div className="text-center">
                        <div className="truncate text-xl font-bold text-purple-600 dark:text-purple-400">
                          {statistics.correctPercentage}%
                        </div>
                        <div className="text-xs leading-tight text-muted-foreground">
                          Overall Accuracy
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Detailed Statistics Table */}
                  <Card>
                    <div className="border-b p-4">
                      <h3 className="text-lg font-semibold">
                        Detailed Breakdown by User Category
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Statistics filtered by current date range and applied
                        filters
                      </p>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-semibold">
                            Category
                          </TableHead>
                          <TableHead className="text-center font-semibold">
                            Total Sessions
                          </TableHead>
                          <TableHead className="text-center font-semibold">
                            Total Queries
                          </TableHead>
                          <TableHead className="text-center font-semibold">
                            Incorrect Queries
                          </TableHead>
                          <TableHead className="text-center font-semibold">
                            Accuracy
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow className="hover:bg-green-50 dark:hover:bg-green-950/10">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-green-500"></div>
                              Merchant
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-semibold">
                            {detailedStatistics.merchant.totalSessions}
                          </TableCell>
                          <TableCell className="text-center font-semibold">
                            {detailedStatistics.merchant.totalQueries}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-semibold text-red-600 dark:text-red-400">
                              {detailedStatistics.merchant.incorrectQueries}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={
                                detailedStatistics.merchant.accuracy >= 80
                                  ? "default"
                                  : "destructive"
                              }
                              className={cn(
                                "font-semibold",
                                detailedStatistics.merchant.accuracy >= 80
                                  ? "bg-green-600 hover:bg-green-700"
                                  : "",
                              )}
                            >
                              {detailedStatistics.merchant.accuracy}%
                            </Badge>
                          </TableCell>
                        </TableRow>

                        <TableRow className="hover:bg-blue-50 dark:hover:bg-blue-950/10">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                              Team
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-semibold">
                            {detailedStatistics.team.totalSessions}
                          </TableCell>
                          <TableCell className="text-center font-semibold">
                            {detailedStatistics.team.totalQueries}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-semibold text-red-600 dark:text-red-400">
                              {detailedStatistics.team.incorrectQueries}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={
                                detailedStatistics.team.accuracy >= 80
                                  ? "default"
                                  : "destructive"
                              }
                              className={cn(
                                "font-semibold",
                                detailedStatistics.team.accuracy >= 80
                                  ? "bg-green-600 hover:bg-green-700"
                                  : "",
                              )}
                            >
                              {detailedStatistics.team.accuracy}%
                            </Badge>
                          </TableCell>
                        </TableRow>

                        <TableRow className="hover:bg-purple-50 dark:hover:bg-purple-950/10">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-purple-500"></div>
                              Other
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-semibold">
                            {detailedStatistics.other.totalSessions}
                          </TableCell>
                          <TableCell className="text-center font-semibold">
                            {detailedStatistics.other.totalQueries}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-semibold text-red-600 dark:text-red-400">
                              {detailedStatistics.other.incorrectQueries}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={
                                detailedStatistics.other.accuracy >= 80
                                  ? "default"
                                  : "destructive"
                              }
                              className={cn(
                                "font-semibold",
                                detailedStatistics.other.accuracy >= 80
                                  ? "bg-green-600 hover:bg-green-700"
                                  : "",
                              )}
                            >
                              {detailedStatistics.other.accuracy}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </Card>

                  {/* Additional Insights */}
                  <Card className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 dark:from-gray-950/20 dark:to-gray-900/20">
                    <h4 className="mb-2 font-semibold">
                      Current Filters Applied:
                    </h4>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge variant="outline">
                        Date: {dateRange.from.toLocaleDateString()} -{" "}
                        {dateRange.to.toLocaleDateString()}
                      </Badge>
                      {selectedTag !== "all" && (
                        <Badge variant="outline">Agent: {selectedTag}</Badge>
                      )}
                      {showOnlyMerchant && (
                        <Badge variant="outline">Merchant Only</Badge>
                      )}
                      {showOnlyTeam && (
                        <Badge variant="outline">Team Only</Badge>
                      )}
                      {showOnlyJuspayOthers && (
                        <Badge variant="outline">Other Only</Badge>
                      )}
                      {filterCorrect && (
                        <Badge variant="outline">Correct Only</Badge>
                      )}
                      {filterIncorrect && (
                        <Badge variant="outline">Incorrect Only</Badge>
                      )}
                      {hideUnknownUser && (
                        <Badge variant="outline">Hide Unknown</Badge>
                      )}
                      {teamEmails.length > 0 && (
                        <Badge variant="outline">
                          Team Emails: {teamEmails.length}
                        </Badge>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Right Resizer Handle */}
        {isDesktop && !isMobile && (
          <div
            className="w-1 cursor-col-resize bg-border transition-colors hover:bg-primary"
            onMouseDown={handleMouseDown}
          >
            <div className="flex h-full items-center justify-center">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        )}

        {/* Mobile Right Panel Overlay */}
        {isMobile && isMobileRightPanelOpen && (
          <div
            className="absolute inset-0 z-50 bg-black/50"
            onClick={() => setIsMobileRightPanelOpen(false)}
          />
        )}

        {/* Right Sidebar - Tool Call Details */}
        {(!isMobile || isMobileRightPanelOpen) && (
          <div
            className={cn(
              "border-l bg-background",
              isMobile
                ? cn(
                    "absolute inset-y-0 right-0 z-50 w-80 transform transition-transform duration-300",
                    isMobileRightPanelOpen
                      ? "translate-x-0"
                      : "translate-x-full",
                  )
                : isTablet
                  ? "w-80"
                  : "w-[450px]",
            )}
            style={isDesktop ? { width: `${rightPanelWidth}px` } : undefined}
          >
            <div className="flex h-full flex-col">
              <div className="border-b p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">
                    {selectedToolCall
                      ? "Tool Call Details"
                      : "Response Details"}
                  </h3>
                  {isMobile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsMobileRightPanelOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <ScrollArea className="flex-1 p-4">
                {selectedToolCall ? (
                  <div className="space-y-4 pb-6">
                    {/* Show all tool calls/observations */}
                    {traceDetails.isLoading ? (
                      <div className="text-sm text-muted-foreground">
                        Loading tool calls...
                      </div>
                    ) : (
                      <>
                        {observations && observations.length > 0 ? (
                          observations.map((obs: any, index: number) => (
                            <Collapsible key={obs.id} defaultOpen={index === 0}>
                              <Card className="mb-4 overflow-hidden">
                                <CollapsibleTrigger className="w-full p-3 transition-all duration-200 hover:bg-accent">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs text-white transition-transform duration-200 group-data-[state=open]:rotate-90">
                                        {index + 1}
                                      </div>
                                      <span className="text-sm font-medium">
                                        Tool call {index + 1}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {obs.name || obs.type}
                                      </Badge>
                                    </div>
                                  </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2">
                                  <div className="space-y-3 border-t p-3">
                                    <ObservationDetails
                                      observationId={obs.id}
                                      traceId={
                                        selectedTraceForDetails?.traceId ?? ""
                                      }
                                      projectId={projectId}
                                      startTime={obs.startTime}
                                      name={obs.name || obs.type}
                                    />
                                  </div>
                                </CollapsibleContent>
                              </Card>
                            </Collapsible>
                          ))
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            No tool calls found for this trace
                          </div>
                        )}

                        {/* Final Response Section - Green Highlighted */}
                        {traceDetails.data && (
                          <FinalResponseSection
                            trace={traceDetails.data}
                            projectId={projectId}
                          />
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Click on a message to view details
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}

// Manual Ratings Content Component
function ManualRatingsContent({
  manualRatings,
  allTraces,
  allSessions,
  onUpdateRating,
  onNavigateToSession,
}: {
  manualRatings: Map<string, string>;
  allTraces: any[];
  allSessions: any[];
  onUpdateRating: (traceId: string, rating: string | null) => void;
  onNavigateToSession: (sessionId: string) => void;
}) {
  const [filterRating, setFilterRating] = useState<string>("all");

  // Get all rated traces with their details
  const ratedTraces = React.useMemo(() => {
    const traces = Array.from(manualRatings.entries())
      .map(([traceId, rating]) => {
        const trace = allTraces.find((t) => t.id === traceId);
        if (!trace) return null;

        const session = allSessions.find((s) => s.id === trace.sessionId);
        return {
          traceId,
          rating,
          trace,
          session,
          timestamp: trace.timestamp,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // Filter by rating type
    if (filterRating !== "all") {
      return traces.filter((item) => item.rating === filterRating);
    }

    // Sort by timestamp (newest first)
    return traces.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [manualRatings, allTraces, allSessions, filterRating]);

  // Statistics
  const stats = React.useMemo(() => {
    const total = manualRatings.size;
    const correct = Array.from(manualRatings.values()).filter(
      (r) => r === "correct",
    ).length;
    const needsWork = Array.from(manualRatings.values()).filter(
      (r) => r === "needs-work",
    ).length;
    const wrong = Array.from(manualRatings.values()).filter(
      (r) => r === "wrong",
    ).length;

    return { total, correct, needsWork, wrong };
  }, [manualRatings]);

  const getRatingIcon = (rating: string) => {
    switch (rating) {
      case "correct":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "needs-work":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "wrong":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case "correct":
        return "text-green-600 bg-green-50 border-green-200";
      case "needs-work":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "wrong":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  if (manualRatings.size === 0) {
    return (
      <div className="py-8 text-center">
        <Clock className="mx-auto mb-4 h-12 w-12 text-gray-400" />
        <h3 className="mb-2 text-lg font-medium text-gray-900">
          No Manual Ratings Yet
        </h3>
        <p className="text-gray-500">
          Start rating responses by clicking the &quot;Correct&quot;,
          &quot;Needs Work&quot;, or &quot;Wrong&quot; buttons on any assistant
          response.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-muted-foreground">Total Rated</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {stats.correct}
          </div>
          <div className="text-sm text-muted-foreground">Correct</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {stats.needsWork}
          </div>
          <div className="text-sm text-muted-foreground">Needs Work</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.wrong}</div>
          <div className="text-sm text-muted-foreground">Wrong</div>
        </Card>
      </div>

      {/* Filter Controls */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Filter by Rating:</label>
        <Select value={filterRating} onValueChange={setFilterRating}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ratings ({stats.total})</SelectItem>
            <SelectItem value="correct">Correct ({stats.correct})</SelectItem>
            <SelectItem value="needs-work">
              Needs Work ({stats.needsWork})
            </SelectItem>
            <SelectItem value="wrong">Wrong ({stats.wrong})</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (
              confirm(
                "Are you sure you want to clear all manual ratings? This action cannot be undone.",
              )
            ) {
              Array.from(manualRatings.keys()).forEach((traceId) => {
                onUpdateRating(traceId, null);
              });
              toast.success("All manual ratings cleared");
            }
          }}
        >
          Clear All Ratings
        </Button>
      </div>

      {/* Ratings Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rating</TableHead>
              <TableHead>Session</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ratedTraces.map((item) => (
              <TableRow key={item.traceId} className="hover:bg-muted/50">
                <TableCell>
                  <div
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium",
                      getRatingColor(item.rating),
                    )}
                  >
                    {getRatingIcon(item.rating)}
                    {item.rating === "needs-work"
                      ? "Needs Work"
                      : item.rating.charAt(0).toUpperCase() +
                        item.rating.slice(1)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-mono text-xs">
                    {item.session?.id.slice(0, 8)}...
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {item.session?.userIds?.[0] || "Unknown User"}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground">
                    {new Date(item.timestamp).toLocaleString()}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (item.session?.id) {
                          onNavigateToSession(item.session.id);
                          toast.success("Navigated to session");
                        }
                      }}
                    >
                      View Session
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onUpdateRating(item.traceId, null);
                        toast.success("Rating cleared");
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {ratedTraces.length === 0 && filterRating !== "all" && (
        <div className="py-8 text-center">
          <p className="text-gray-500">
            No ratings found for &quot;
            {filterRating === "needs-work" ? "Needs Work" : filterRating}&quot;
            filter.
          </p>
        </div>
      )}
    </div>
  );
}

// Observation Details Component - Fetches full observation with input/output
function ObservationDetails({
  observationId,
  traceId,
  projectId,
  startTime,
  name,
}: {
  observationId: string;
  traceId: string;
  projectId: string;
  startTime: Date;
  name: string;
}) {
  const observation = api.observations.byId.useQuery(
    {
      observationId,
      traceId,
      projectId,
      startTime,
    },
    {
      enabled: !!observationId && !!projectId,
    },
  );

  // Extract arguments from input - return as object for PrettyJsonView
  const inputArguments = (() => {
    if (!observation.data?.input) return null;

    try {
      const parsed =
        typeof observation.data.input === "string"
          ? JSON.parse(observation.data.input)
          : observation.data.input;

      // Extract only the arguments field
      if (parsed.arguments) {
        return parsed.arguments;
      }
      return parsed;
    } catch {
      return null;
    }
  })();

  // Extract only the nested result.result from output - return as object for rendering
  const outputResult = (() => {
    if (!observation.data?.output) return null;

    try {
      let parsed: any = observation.data.output;

      // If it's a string, parse it
      if (typeof parsed === "string") {
        parsed = JSON.parse(parsed);
      }

      // If result is a string, parse it again (double-stringified)
      if (parsed.result && typeof parsed.result === "string") {
        parsed.result = JSON.parse(parsed.result);
      }

      // Extract result.result (the nested result field)
      if (parsed.result && parsed.result.result) {
        return parsed.result.result;
      }

      // Fallback to just result if nested result doesn't exist
      if (parsed.result) {
        return parsed.result;
      }

      return parsed;
    } catch (e) {
      console.error("Error parsing output:", e);
      return null;
    }
  })();

  if (observation.isLoading) {
    return <div className="text-xs text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-3 border-t p-3">
      {/* Request/Input - Light Blue Border */}
      <div className="overflow-hidden rounded-md border-2 border-blue-400 bg-blue-50 p-3 dark:bg-blue-950/20">
        <div className="mb-2 text-xs font-medium text-blue-700 dark:text-blue-400">
          Req → {name}
        </div>
        <div className="[&_*]:overflow-wrap-anywhere overflow-x-auto [&_*]:break-all">
          <PrettyJsonView
            json={inputArguments}
            currentView="json"
            className="text-xs"
          />
        </div>
      </div>

      {/* Response/Output - Purple Border */}
      <div className="overflow-hidden rounded-md border-2 border-purple-400 bg-purple-50 p-3 dark:bg-purple-950/20">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-medium text-purple-700 dark:text-purple-400">
            Res
          </div>
          <Badge variant="secondary" className="text-xs">
            Response ({name})
          </Badge>
        </div>
        <div className="mb-2 text-xs font-medium text-purple-700 dark:text-purple-400">
          {name}_jaf
        </div>
        <div className="[&_*]:overflow-wrap-anywhere overflow-x-auto [&_*]:break-all">
          <PrettyJsonView
            json={outputResult}
            currentView="json"
            className="text-xs"
          />
        </div>
      </div>
    </div>
  );
}

// Final Response Section Component - Shows the final output with green highlight
function FinalResponseSection({
  trace,
  projectId,
}: {
  trace: any;
  projectId: string;
}) {
  // Fetch the trace data the same way TraceMessage does
  const traceData = api.traces.byId.useQuery(
    {
      traceId: trace.id,
      projectId,
      timestamp: trace.timestamp,
    },
    {
      enabled: !!trace.id && !!projectId,
      staleTime: 60 * 1000,
    },
  );

  // Use the EXACT same extraction logic as TraceMessage component
  const finalOutputText = (() => {
    if (!traceData.data?.output) return null;

    try {
      let parsed: any = traceData.data.output;

      // Parse if it's a string
      if (typeof parsed === "string") {
        parsed = JSON.parse(parsed);
      }

      let text = "";

      // Extract outcome.output.text
      if (parsed.outcome?.output?.text) {
        text = parsed.outcome.output.text;
      }
      // Fallback: try output.text
      else if (parsed.output?.text) {
        text = parsed.output.text;
      }
      // Fallback: try just output
      else if (parsed.output) {
        text =
          typeof parsed.output === "string"
            ? parsed.output
            : JSON.stringify(parsed.output);
      }
      // Last resort: stringify the whole thing
      else {
        text = typeof parsed === "string" ? parsed : JSON.stringify(parsed);
      }

      // Replace placeholders with actual values from replacements
      if (parsed.outcome?.output?.replacements) {
        const replacements = parsed.outcome.output.replacements;
        Object.entries(replacements).forEach(([key, value]) => {
          // Replace {key} with the actual value
          const placeholder = `{${key}}`;
          text = text.replace(
            new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
            String(value),
          );
        });
      }

      return text;
    } catch (e) {
      console.error("Error parsing final output:", e);
      return null;
    }
  })();

  if (traceData.isLoading) {
    return (
      <Card className="border-2 border-green-500 bg-green-50 dark:bg-green-950/20">
        <div className="p-4">
          <div className="text-sm text-muted-foreground">
            Loading final response...
          </div>
        </div>
      </Card>
    );
  }

  if (!finalOutputText) return null;

  return (
    <Card className="border-2 border-green-500 bg-green-50 dark:bg-green-950/20">
      <div className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Badge className="bg-green-600 text-white hover:bg-green-700">
            Final Response
          </Badge>
        </div>
        <div className="text-sm">
          <MarkdownJsonView
            content={finalOutputText}
            customCodeHeaderClassName="bg-secondary"
          />
        </div>
      </div>
    </Card>
  );
}

// Trace Message Component
function TraceMessage({
  trace,
  traceMetric,
  projectId,
  isSelected,
  onSelect,
  manualRating,
  onManualRatingChange,
}: {
  trace: any;
  traceMetric: any;
  projectId: string;
  isSelected: boolean;
  onSelect: (traceId: string, timestamp: Date) => void;
  manualRating?: string;
  onManualRatingChange: (traceId: string, rating: string | null) => void;
}) {
  // Use the manual rating from props instead of local state
  const selectedRating = manualRating || null;

  const traceData = api.traces.byId.useQuery(
    {
      traceId: trace.id,
      projectId,
      timestamp: trace.timestamp,
    },
    {
      enabled: !!trace.id && !!projectId,
      staleTime: 60 * 1000,
    },
  );

  // Fetch scores for this trace to get LLM eval feedback
  const traceWithScores = api.traces.byIdWithObservationsAndScores.useQuery(
    {
      traceId: trace.id,
      projectId,
      timestamp: trace.timestamp,
    },
    {
      enabled: !!trace.id && !!projectId,
      // Poll every 5 seconds if we don't have a genius-feedback score yet
      refetchInterval: (query) => {
        if (!query.state.data) return false;
        const hasGeniusFeedback = query.state.data.scores?.some(
          (score: any) => score.name === "genius-feedback",
        );
        return hasGeniusFeedback ? false : 5000;
      },
    },
  );

  // Extract genius-feedback score
  const geniusFeedbackScore = React.useMemo(() => {
    if (!traceWithScores.data?.scores) return null;
    return traceWithScores.data.scores.find(
      (score: any) => score.name === "genius-feedback",
    );
  }, [traceWithScores.data?.scores]);

  // Extract user_query from input, or return formatted JSON
  const inputContent = (() => {
    if (!traceData.data?.input)
      return { text: trace.name || "Query", isJson: false };

    if (typeof traceData.data.input === "string") {
      try {
        const parsed = JSON.parse(traceData.data.input);
        // If user_query exists, return it as text
        if (parsed.user_query) {
          return { text: parsed.user_query, isJson: false };
        }
        // Otherwise return the whole object as JSON
        return { json: parsed, isJson: true };
      } catch {
        return { text: traceData.data.input, isJson: false };
      }
    }

    // If it's already an object
    const input = traceData.data.input as any;
    if (input.user_query) {
      return { text: input.user_query, isJson: false };
    }
    return { json: input, isJson: true };
  })();

  // Extract output text or return formatted JSON
  const outputContent = (() => {
    if (!traceData.data?.output) return { text: "Response", isJson: false };

    try {
      let parsed: any = traceData.data.output;

      // Parse if it's a string
      if (typeof parsed === "string") {
        parsed = JSON.parse(parsed);
      }

      // Try 1: Extract outcome.output.text with replacements FIRST
      if (parsed.outcome?.output?.text) {
        let text = parsed.outcome.output.text;

        // Replace placeholders with actual values from replacements
        if (parsed.outcome?.output?.replacements) {
          const replacements = parsed.outcome.output.replacements;
          Object.entries(replacements).forEach(([key, value]) => {
            const placeholder = `{${key}}`;
            text = text.replace(
              new RegExp(
                placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                "g",
              ),
              String(value),
            );
          });
        }

        return { text, isJson: false };
      }
      // Try 2: Check if outcome.output exists (for cases without .text)
      else if (parsed.outcome?.output !== undefined) {
        // If outcome.output is a string, return it directly
        if (typeof parsed.outcome.output === "string") {
          return { text: parsed.outcome.output, isJson: false };
        }
        // If outcome.output is an object, return as JSON
        else {
          return { json: parsed.outcome.output, isJson: true };
        }
      }
      // Final fallback: show the whole parsed object as JSON
      else {
        return { json: parsed, isJson: true };
      }
    } catch (e) {
      console.error("Error parsing output:", e);
      return {
        text:
          typeof traceData.data.output === "string"
            ? traceData.data.output
            : JSON.stringify(traceData.data.output),
        isJson: false,
      };
    }
  })();

  return (
    <div className="space-y-2">
      {/* User Query */}
      <div className="flex justify-end">
        <Card className="max-w-[80%] border-0 bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
          <div className="flex items-start gap-2">
            <User className="mt-1 h-4 w-4" />
            <div className="flex-1">
              <div className="mb-1 text-xs opacity-90">
                User Q • {new Date(trace.timestamp).toLocaleTimeString()}
              </div>
              {inputContent.isJson ? (
                <div className="text-sm">
                  <PrettyJsonView
                    json={inputContent.json}
                    currentView="json"
                    className="text-xs"
                  />
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-sm">
                  {inputContent.text}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Assistant Response */}
      <div className="flex justify-start">
        <Card
          className={cn(
            "max-w-[80%] cursor-pointer p-4 transition-colors hover:bg-accent",
            isSelected && "border-primary bg-accent",
          )}
          onClick={() => onSelect(trace.id, trace.timestamp)}
        >
          <div className="flex items-start gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 text-xs text-white">
              AI
            </div>
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs font-medium">Assistant Ans</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(trace.timestamp).toLocaleTimeString()}
                </span>
                {traceMetric?.level === "ERROR" && (
                  <Badge variant="destructive" className="text-xs">
                    Error
                  </Badge>
                )}
              </div>
              {outputContent.isJson ? (
                <div className="text-sm">
                  <PrettyJsonView
                    json={outputContent.json}
                    currentView="json"
                    className="text-xs"
                  />
                </div>
              ) : (
                <div className="text-sm">
                  <MarkdownJsonView
                    content={outputContent.text}
                    customCodeHeaderClassName="bg-secondary"
                  />
                </div>
              )}

              {/* Rate Buttons */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium">Rate:</span>
                <Button
                  variant={selectedRating === "correct" ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-7 text-xs",
                    selectedRating === "correct" &&
                      "border-green-600 bg-green-600 text-white hover:bg-green-700 dark:border-green-500 dark:bg-green-500 dark:hover:bg-green-600",
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onManualRatingChange(
                      trace.id,
                      selectedRating === "correct" ? null : "correct",
                    );
                    toast.success("Response marked as correct");
                  }}
                >
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Correct
                </Button>
                <Button
                  variant={
                    selectedRating === "needs-work" ? "default" : "outline"
                  }
                  size="sm"
                  className={cn(
                    "h-7 text-xs",
                    selectedRating === "needs-work" &&
                      "border-orange-600 bg-orange-600 text-white hover:bg-orange-700 dark:border-orange-500 dark:bg-orange-600 dark:hover:bg-orange-600",
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onManualRatingChange(
                      trace.id,
                      selectedRating === "needs-work" ? null : "needs-work",
                    );
                    toast.success("Response marked as needs improvement");
                  }}
                >
                  <Clock className="mr-1 h-3 w-3" />
                  Needs Work
                </Button>
                <Button
                  variant={selectedRating === "wrong" ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-7 text-xs",
                    selectedRating === "wrong" &&
                      "border-red-600 bg-red-600 text-white hover:bg-red-700 dark:border-red-500 dark:bg-red-500 dark:hover:bg-red-600",
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onManualRatingChange(
                      trace.id,
                      selectedRating === "wrong" ? null : "wrong",
                    );
                    toast.success("Response marked as wrong");
                  }}
                >
                  <XCircle className="mr-1 h-3 w-3" />
                  Wrong
                </Button>
                {selectedRating && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onManualRatingChange(trace.id, null);
                      toast.info("Rating cleared");
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>

              {/* LLM Eval Section - Shows when genius-feedback score is available */}
              {geniusFeedbackScore && (
                <div className="mt-4 border-t pt-4">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500">
                      <span className="text-xs text-white">⚡</span>
                    </div>
                    <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                      LLM Eval
                    </span>
                  </div>

                  <div className="space-y-2">
                    {/* Judge Response */}
                    <div>
                      <div className="mb-1 text-xs font-medium text-muted-foreground">
                        Judge Response:
                      </div>
                      <div className="rounded-md border border-purple-200 bg-purple-50 p-2 dark:border-purple-800 dark:bg-purple-950/20">
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            geniusFeedbackScore.value === 1
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400",
                          )}
                        >
                          {geniusFeedbackScore.value === 1
                            ? "CORRECT"
                            : "INCORRECT"}
                        </span>
                      </div>
                    </div>

                    {/* Judgement Reason */}
                    {geniusFeedbackScore.comment && (
                      <div>
                        <div className="mb-1 text-xs font-medium text-muted-foreground">
                          Judgement Reason:
                        </div>
                        <div className="rounded-md border border-purple-200 bg-purple-50 p-3 dark:border-purple-800 dark:bg-purple-950/20">
                          <div className="text-sm leading-relaxed">
                            {geniusFeedbackScore.comment}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-2 text-xs text-muted-foreground">
                Click to view tool calls →
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
