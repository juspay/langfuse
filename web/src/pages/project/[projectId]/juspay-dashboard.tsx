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

  // Auto-update URL with default date range on initial load
  React.useEffect(() => {
    if (router.isReady && timeRange && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      
      // Check if there's no existing dateRange parameter in URL
      if (!params.has('dateRange')) {
        // Convert timeRange to the format expected by the URL
        const absoluteRange = toAbsoluteTimeRange(timeRange);
        if (absoluteRange) {
          const fromTimestamp = absoluteRange.from.getTime();
          const toTimestamp = absoluteRange.to.getTime();
          const dateRangeParam = `${fromTimestamp}-${toTimestamp}`;
          
          params.set('dateRange', dateRangeParam);
          
          // Update URL without navigation
          const newUrl = `${window.location.pathname}?${params.toString()}`;
          window.history.replaceState({}, "", newUrl);
          console.log("🔗 Auto-updated URL with default date range:", newUrl);
        }
      }
    }
  }, [router.isReady, timeRange]);

  // Convert timeRange to absolute date range for compatibility
  const tableDateRange = React.useMemo(() => {
    return toAbsoluteTimeRange(timeRange) ?? undefined;
  }, [timeRange]);

  // Use tableDateRange as our dateRange - wrapped in useMemo for performance
  const dateRange = React.useMemo(() => {
    if (tableDateRange) {
      return tableDateRange;
    }
    // Create fallback date range without mutation
    const today = new Date();
    return {
      from: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0),
      to: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999),
    };
  }, [tableDateRange]);

  // Filter persistence using localStorage (same approach as before but simpler)
  const filterStorageKey = `juspay-dashboard-filters-${projectId}`;

  // Get other URL parameters (not date range - that's handled by useTableDateRange)
  const sessionIdFromUrl = router.query.sessionId as string | undefined;
  const merchantFilterUrl = router.query.merchantOnly as string | undefined;
  const teamFilterUrl = router.query.teamOnly as string | undefined;
  const juspayOthersFilterUrl = router.query.juspayOthersOnly as string | undefined;
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
      params.set("teamEmails", encodeURIComponent(JSON.stringify(filters.teamEmails)));
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
  const [showFilters, setShowFilters] = useState(true);
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

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sessionPage, setSessionPage] = useState(0);
  
  // Resizable panels state
  const [rightPanelWidth, setRightPanelWidth] = useState(450);
  const [isResizing, setIsResizing] = useState<'right' | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileRightPanelOpen, setIsMobileRightPanelOpen] = useState(false);

  const handleDateRangeChange = React.useCallback(
    (newDateRange: { from: Date; to: Date }) => {
      console.log("📅 Date range changed:", {
        from: newDateRange.from.toISOString(),
        to: newDateRange.to.toISOString(),
        previousFrom: dateRange.from.toISOString(),
        previousTo: dateRange.to.toISOString(),
      });
      // Use the same approach as traces page
      setTimeRange({ from: newDateRange.from, to: newDateRange.to });
    },
    [dateRange, setTimeRange],
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
      enabled: !!projectId,
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

  // Reset session pagination when date range changes
  React.useEffect(() => {
    setAllSessions([]);
    setSessionPage(0);
    setHasMoreSessions(true);
  }, [projectId, dateRange.from, dateRange.to]);

  // Create wrapper for sessions
  const allSessionsData = React.useMemo(
    () => ({
      sessions: allSessions,
    }),
    [allSessions],
  );

  // Reset when date range changes
  React.useEffect(() => {
    console.log("🔄 SESSIONS - Date range changed, will refetch:", {
      from: dateRange.from.toISOString(),
      to: dateRange.to.toISOString(),
    });
  }, [dateRange.from, dateRange.to]);

  // Fetch all tags for filtering (no limit issues!)
  const traceFilterOptions = api.traces.filterOptions.useQuery(
    {
      projectId,
      timestampFilter: {
        column: "timestamp",
        type: "datetime",
        operator: ">=",
        value: dateRange.from,
      },
    },
    {
      enabled: !!projectId,
    },
  );

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
      enabled: !!projectId && !!allSessions.length && hasMoreTraces,
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
    setAllTraces([]);
    setCurrentPage(0);
    setHasMoreTraces(true);
  }, [dateRange.from, dateRange.to]);

  // Create a wrapper object
  const allSessionsTracesData = React.useMemo(
    () => ({
      traces: allTraces,
    }),
    [allTraces],
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
    setAllScores([]);
    setScoresPage(0);
    setHasMoreScores(true);
  }, [dateRange.from, dateRange.to]);

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
        if (teamEmails.some(email => {
          const emailLower = email.toLowerCase().trim();
          const userIdLower = userId.toLowerCase().trim();
          
          // Try exact match first
          if (userIdLower === emailLower) return true;
          
          // Try contains match (user ID contains the email)
          if (userIdLower.includes(emailLower)) return true;
          
          // Try email contains user ID (for partial email matches)
          if (emailLower.includes(userIdLower)) return true;
          
          // Try domain matching if email has @ symbol
          if (emailLower.includes('@')) {
            const emailDomain = emailLower.split('@')[1];
            const emailUsername = emailLower.split('@')[0];
            
            // Check if user ID matches username part
            if (userIdLower === emailUsername) return true;
            
            // Check if user ID contains username
            if (userIdLower.includes(emailUsername)) return true;
          }
          
          return false;
        })) {
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
      if (teamEmails.some(email => {
        const emailLower = email.toLowerCase().trim();
        const userIdLower = userId.toLowerCase().trim();
        
        // Try exact match first
        if (userIdLower === emailLower) return true;
        
        // Try contains match (user ID contains the email)
        if (userIdLower.includes(emailLower)) return true;
        
        // Try email contains user ID (for partial email matches)
        if (emailLower.includes(userIdLower)) return true;
        
        // Try domain matching if email has @ symbol
        if (emailLower.includes('@')) {
          const emailDomain = emailLower.split('@')[1];
          const emailUsername = emailLower.split('@')[0];
          
          // Check if user ID matches username part
          if (userIdLower === emailUsername) return true;
          
          // Check if user ID contains username
          if (userIdLower.includes(emailUsername)) return true;
        }
        
        return false;
      })) {
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

      // Helper function to categorize user for statistics filtering
      const categorizeUserForStats = (userIds: string[] | undefined) => {
        if (!userIds || userIds.length === 0 || userIds[0] === "Unknown User") {
          return "unknown";
        }
        
        const userId = userIds[0];
        
        // Check if user is in team whitelist - more flexible matching
        if (teamEmails.some(email => {
          const emailLower = email.toLowerCase().trim();
          const userIdLower = userId.toLowerCase().trim();
          
          // Try exact match first
          if (userIdLower === emailLower) return true;
          
          // Try contains match (user ID contains the email)
          if (userIdLower.includes(emailLower)) return true;
          
          // Try email contains user ID (for partial email matches)
          if (emailLower.includes(userIdLower)) return true;
          
          // Try domain matching if email has @ symbol
          if (emailLower.includes('@')) {
            const emailDomain = emailLower.split('@')[1];
            const emailUsername = emailLower.split('@')[0];
            
            // Check if user ID matches username part
            if (userIdLower === emailUsername) return true;
            
            // Check if user ID contains username
            if (userIdLower.includes(emailUsername)) return true;
          }
          
          return false;
        })) {
          return "team";
        }
        
        // Check if user is juspay internal (contains @juspay)
        if (userId.toLowerCase().includes("@juspay")) {
          return "juspay-genius-merchant";
        }
        
        // Otherwise it's a merchant
        return "merchant";
      };

      const userCategory = categorizeUserForStats(session.userIds);

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
    const sessionIdsForStats = new Set(sessionsForStats.map(session => session.id));

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

    // Categorize queries by user type
    let merchantQueries = 0;
    let geniusTeamQueries = 0;
    let juspayGeniusMerchantQueries = 0;

    tracesForStats.forEach((trace) => {
      const session = allSessionsData.sessions.find(s => s.id === trace.sessionId);
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
      merchantQueries,
      geniusTeamQueries,
      juspayGeniusMerchantQueries,
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
    if (selectedSessionId && filteredSessions.length > 0 && !sessions.isLoading && !hasAutoScrolled && sessionIdFromUrl) {
      const timer = setTimeout(() => {
        const selectedElement = document.querySelector(`[data-session-id="${selectedSessionId}"]`);
        if (selectedElement) {
          // Check if element is already visible
          const rect = selectedElement.getBoundingClientRect();
          const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
          
          // Only scroll if not visible
          if (!isVisible) {
            selectedElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
          }
          setHasAutoScrolled(true);
        }
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [selectedSessionId, filteredSessions.length, sessions.isLoading, hasAutoScrolled, sessionIdFromUrl]);

  // Reset auto-scroll flag when session changes manually (not from URL)
  React.useEffect(() => {
    if (!sessionIdFromUrl) {
      setHasAutoScrolled(false);
    }
  }, [sessionIdFromUrl]);

  // Mouse event handlers for resizing (right panel only)
  const [dragStartX, setDragStartX] = React.useState(0);
  const [dragStartWidth, setDragStartWidth] = React.useState(0);

  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing('right');
    setDragStartX(e.clientX);
    setDragStartWidth(rightPanelWidth);
  }, [rightPanelWidth]);

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const deltaX = e.clientX - dragStartX;

    // For right panel, subtract the delta from the starting width
    const newWidth = Math.max(300, Math.min(800, dragStartWidth - deltaX));
    setRightPanelWidth(newWidth);
  }, [isResizing, dragStartX, dragStartWidth]);

  const handleMouseUp = React.useCallback(() => {
    setIsResizing(null);
  }, []);

  // Add mouse event listeners
  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Responsive breakpoints
  const [windowWidth, setWindowWidth] = React.useState(0);

  React.useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    if (typeof window !== 'undefined') {
      setWindowWidth(window.innerWidth);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const isDesktop = windowWidth >= 1024;

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
          <div className="absolute top-6 left-4 z-50 lg:hidden shadow-lg">
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
                  isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                )
              : isTablet 
                ? "w-72" 
                : "w-84"
          )}
          style={undefined}
        >
          <div className="flex h-full flex-col">
            {/* Mobile Close Button - Inside sidebar */}
            {isMobile && (
              <div className="flex items-center justify-between border-b p-3 flex-shrink-0">
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
            <div className={cn(
              "border-b flex-shrink-0",
              isMobile ? "pt-8 px-3 pb-4" : "p-4"
            )}>
              <Collapsible
                open={showDatePicker}
                onOpenChange={setShowDatePicker}
              >
                <CollapsibleTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-full justify-start h-auto py-3 px-3",
                        isMobile ? "min-h-[6rem]" : "min-h-[3rem]"
                      )}
                    >
                    <Calendar className="mr-2 h-4 w-4 flex-shrink-0" />
                    <div className="flex flex-col items-start text-left flex-1 min-w-0 gap-1">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        Select date range
                      </span>
                      <span className={cn(
                        "font-medium w-full leading-tight",
                        isMobile ? "text-xs break-words" : "text-xs break-words"
                      )}>
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
                              from: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0),
                              to: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999),
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
                            const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
                            const newRange = {
                              from: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0),
                              to: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999),
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
                            const last7Days = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
                            const newRange = {
                              from: new Date(last7Days.getFullYear(), last7Days.getMonth(), last7Days.getDate(), 0, 0, 0, 0),
                              to: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999),
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
                            const last30Days = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
                            const newRange = {
                              from: new Date(last30Days.getFullYear(), last30Days.getMonth(), last30Days.getDate(), 0, 0, 0, 0),
                              to: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999),
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
                            const last90Days = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 90);
                            const newRange = {
                              from: new Date(last90Days.getFullYear(), last90Days.getMonth(), last90Days.getDate(), 0, 0, 0, 0),
                              to: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999),
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
                                  const fromDate = new Date(range.from);
                                  const toDate = range.to ? new Date(range.to) : new Date(range.from);
                                  
                                  const newRange = {
                                    from: new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate(), 0, 0, 0, 0),
                                    to: new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate(), 23, 59, 59, 999),
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
            <div className={cn(
              "border-b flex-shrink-0",
              isMobile ? "px-3 py-4" : "p-4"
            )}>
              {sessions.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <div className="space-y-3">
                  {/* Main Stats Card */}
                  <div className="rounded-lg border bg-gradient-to-r from-blue-50 to-purple-50 p-4 dark:from-blue-950/20 dark:to-purple-950/20">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-blue-600 dark:text-blue-400">📊</span>
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
                        "rounded-lg border p-2 text-center cursor-pointer transition-all duration-200 hover:scale-105",
                        showOnlyMerchant 
                          ? "bg-green-100 border-green-500 ring-2 ring-green-200 dark:bg-green-900/40 dark:border-green-400" 
                          : "bg-green-50 border-green-200 hover:bg-green-100 dark:bg-green-950/20 dark:border-green-800 dark:hover:bg-green-900/30"
                      )}
                      onClick={() => handleShowOnlyMerchantChange(!showOnlyMerchant)}
                    >
                      <div className={cn(
                        "flex mx-auto items-center justify-center rounded-full font-bold text-white mb-1 relative",
                        statistics.merchantQueries.toString().length <= 2 ? "h-8 w-8 text-xs" :
                        statistics.merchantQueries.toString().length === 3 ? "h-9 w-9 text-xs" :
                        "h-10 w-10 text-xs",
                        showOnlyMerchant ? "bg-green-600" : "bg-green-500"
                      )}>
                        {statistics.merchantQueries > 9999 ? "9999+" : statistics.merchantQueries}
                        {showOnlyMerchant && (
                          <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </div>
                      <div className={cn(
                        "text-xs font-medium",
                        showOnlyMerchant ? "text-green-800 dark:text-green-300" : "text-green-700 dark:text-green-400"
                      )}>
                        Merchant
                      </div>
                    </div>

                    {/* Genius Team Queries - Clickable */}
                    <div 
                      className={cn(
                        "rounded-lg border p-2 text-center cursor-pointer transition-all duration-200 hover:scale-105",
                        showOnlyTeam 
                          ? "bg-blue-100 border-blue-500 ring-2 ring-blue-200 dark:bg-blue-900/40 dark:border-blue-400" 
                          : "bg-blue-50 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/20 dark:border-blue-800 dark:hover:bg-blue-900/30"
                      )}
                      onClick={() => handleShowOnlyTeamChange(!showOnlyTeam)}
                    >
                      <div className={cn(
                        "flex mx-auto items-center justify-center rounded-full font-bold text-white mb-1 relative",
                        statistics.geniusTeamQueries.toString().length <= 2 ? "h-8 w-8 text-xs" :
                        statistics.geniusTeamQueries.toString().length === 3 ? "h-9 w-9 text-xs" :
                        "h-10 w-10 text-xs",
                        showOnlyTeam ? "bg-blue-600" : "bg-blue-500"
                      )}>
                        {statistics.geniusTeamQueries > 9999 ? "9999+" : statistics.geniusTeamQueries}
                        {showOnlyTeam && (
                          <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </div>
                      <div className={cn(
                        "text-xs font-medium",
                        showOnlyTeam ? "text-blue-800 dark:text-blue-300" : "text-blue-700 dark:text-blue-400"
                      )}>
                        Team
                      </div>
                    </div>

                    {/* Juspay-Genius-Merchant Queries - Clickable */}
                    <div 
                      className={cn(
                        "rounded-lg border p-2 text-center cursor-pointer transition-all duration-200 hover:scale-105",
                        showOnlyJuspayOthers 
                          ? "bg-purple-100 border-purple-500 ring-2 ring-purple-200 dark:bg-purple-900/40 dark:border-purple-400" 
                          : "bg-purple-50 border-purple-200 hover:bg-purple-100 dark:bg-purple-950/20 dark:border-purple-800 dark:hover:bg-purple-900/30"
                      )}
                      onClick={() => handleShowOnlyJuspayOthersChange(!showOnlyJuspayOthers)}
                    >
                      <div className={cn(
                        "flex mx-auto items-center justify-center rounded-full font-bold text-white mb-1 relative",
                        statistics.juspayGeniusMerchantQueries.toString().length <= 2 ? "h-8 w-8 text-xs" :
                        statistics.juspayGeniusMerchantQueries.toString().length === 3 ? "h-9 w-9 text-xs" :
                        "h-10 w-10 text-xs",
                        showOnlyJuspayOthers ? "bg-purple-600" : "bg-purple-500"
                      )}>
                        {statistics.juspayGeniusMerchantQueries > 9999 ? "9999+" : statistics.juspayGeniusMerchantQueries}
                        {showOnlyJuspayOthers && (
                          <div className="absolute -top-1 -right-1 h-3 w-3 bg-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </div>
                      <div className={cn(
                        "text-xs font-medium",
                        showOnlyJuspayOthers ? "text-purple-800 dark:text-purple-300" : "text-purple-700 dark:text-purple-400"
                      )}>
                        Other
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Search and Filters */}
            <div className={cn(
              "space-y-3 border-b flex-shrink-0",
              isMobile ? "px-3 py-3" : "p-4"
            )}>
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
                        <h3 className="text-lg font-semibold">Advanced Filters</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAdvancedFilters(false)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="p-4 space-y-4">
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
                                      : "Select team emails..."
                                    }
                                  </span>
                                  <Search className="ml-2 h-3 w-3" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-72 p-3" align="start">
                                <div className="space-y-3">
                                  <div className="text-sm font-medium">Select Team Members</div>
                                  
                                  {/* Search Input */}
                                  <div className="relative">
                                    <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                      placeholder="Search emails..."
                                      value={newEmailInput}
                                      onChange={(e) => setNewEmailInput(e.target.value)}
                                      className="text-xs pl-7"
                                    />
                                  </div>

                                  {/* Available Emails List */}
                                  <ScrollArea className="h-32">
                                    <div className="space-y-1">
                                      {(() => {
                                        // Get unique user emails from current date range
                                        const uniqueEmails = new Set<string>();
                                        allSessionsData.sessions.forEach(session => {
                                          if (session.userIds && session.userIds.length > 0) {
                                            const userId = session.userIds[0];
                                            if (userId && 
                                                userId !== "Unknown User" && 
                                                (userId.includes("@") || userId.includes("."))) {
                                              uniqueEmails.add(userId);
                                            }
                                          }
                                        });

                                        // Filter emails based on search
                                        const filteredEmails = Array.from(uniqueEmails)
                                          .filter(email => 
                                            newEmailInput === "" || 
                                            email.toLowerCase().includes(newEmailInput.toLowerCase())
                                          )
                                          .sort();

                                        return filteredEmails.map((email) => (
                                          <label 
                                            key={email} 
                                            className="flex cursor-pointer items-center gap-2 rounded p-1 hover:bg-accent"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={teamEmails.includes(email)}
                                              onChange={(e) => {
                                                if (e.target.checked) {
                                                  setTeamEmails(prev => [...prev, email]);
                                                } else {
                                                  setTeamEmails(prev => prev.filter(e => e !== email));
                                                }
                                              }}
                                              className="rounded"
                                            />
                                            <span className="text-xs truncate flex-1">{email}</span>
                                          </label>
                                        ));
                                      })()}
                                    </div>
                                  </ScrollArea>


                                  {/* Quick Actions */}
                                  <div className="border-t pt-2 space-y-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="w-full justify-start text-xs"
                                      onClick={() => {
                                        // Select all emails from current date range
                                        const uniqueEmails = new Set<string>();
                                        allSessionsData.sessions.forEach(session => {
                                          if (session.userIds && session.userIds.length > 0) {
                                            const userId = session.userIds[0];
                                            if (userId && 
                                                userId !== "Unknown User" && 
                                                (userId.includes("@") || userId.includes("."))) {
                                              uniqueEmails.add(userId);
                                            }
                                          }
                                        });
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
                                    className="text-xs cursor-pointer"
                                    onClick={() => {
                                      setTeamEmails(prev => prev.filter((_, i) => i !== index));
                                    }}
                                  >
                                    {email} ×
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t p-4">
                        <Button 
                          className="w-full"
                          onClick={() => setShowAdvancedFilters(false)}
                        >
                          Apply Filters
                        </Button>
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
              {sessions.isLoading ? (
                <div className="space-y-3 p-4 pb-8">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
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
            "flex flex-1 flex-col",
            isMobile && isMobileMenuOpen && "opacity-50"
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
        </div>

        {/* Right Resizer Handle */}
        {isDesktop && !isMobile && (
          <div
            className="w-1 bg-border hover:bg-primary cursor-col-resize transition-colors"
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
                    isMobileRightPanelOpen ? "translate-x-0" : "translate-x-full"
                  )
                : isTablet 
                  ? "w-80" 
                  : "w-[450px]"
            )}
            style={isDesktop ? { width: `${rightPanelWidth}px` } : undefined}
          >
          <div className="flex h-full flex-col">
            <div className="border-b p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  {selectedToolCall ? "Tool Call Details" : "Response Details"}
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
      truncated: false,
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
      truncated: false,
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
}: {
  trace: any;
  traceMetric: any;
  projectId: string;
  isSelected: boolean;
  onSelect: (traceId: string, timestamp: Date) => void;
}) {
  const [selectedRating, setSelectedRating] = React.useState<string | null>(
    null,
  );

  const traceData = api.traces.byId.useQuery(
    {
      traceId: trace.id,
      projectId,
      timestamp: trace.timestamp,
      truncated: false, // Get full output, not truncated
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

      let text = "";

      // Extract outcome.output.text
      if (parsed.outcome?.output?.text) {
        text = parsed.outcome.output.text;

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
      // Fallback: try output.text
      else if (parsed.output?.text) {
        return { text: parsed.output.text, isJson: false };
      }
      // If no text field found, return the whole object as JSON
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
                      "bg-black text-white hover:bg-black/90",
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRating("correct");
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
                      "bg-black text-white hover:bg-black/90",
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRating("needs-work");
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
                      "bg-black text-white hover:bg-black/90",
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRating("wrong");
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
                      setSelectedRating(null);
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
