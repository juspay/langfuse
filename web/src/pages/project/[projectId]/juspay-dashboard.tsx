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

export default function JuspayDashboard() {
  const router = useRouter();
  const projectId = router.query.projectId as string;

  // Initialize states from URL parameters
  const sessionIdFromUrl = router.query.sessionId as string | undefined;
  const dateFromUrl = router.query.dateFrom as string | undefined;
  const dateToUrl = router.query.dateTo as string | undefined;
  const merchantFilterUrl = router.query.merchantOnly as string | undefined;
  const tagFilterUrl = router.query.tag as string | undefined;
  const correctFilterUrl = router.query.correct as string | undefined;
  const incorrectFilterUrl = router.query.incorrect as string | undefined;
  const hideUnknownUrl = router.query.hideUnknown as string | undefined;

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    sessionIdFromUrl || null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedToolCall, setSelectedToolCall] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [showOnlyMerchant, setShowOnlyMerchant] = useState(
    merchantFilterUrl === "true",
  );
  const [selectedTag, setSelectedTag] = useState<string>(tagFilterUrl || "all");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => {
    // Initialize from URL or default to today
    const from = dateFromUrl
      ? new Date(dateFromUrl)
      : new Date(new Date().setHours(0, 0, 0, 0));
    const to = dateToUrl
      ? new Date(dateToUrl)
      : new Date(new Date().setHours(23, 59, 59, 999));
    return { from, to };
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [filterCorrect, setFilterCorrect] = useState(
    correctFilterUrl === "true",
  );
  const [filterIncorrect, setFilterIncorrect] = useState(
    incorrectFilterUrl === "true",
  );
  const [hideUnknownUser, setHideUnknownUser] = useState(
    hideUnknownUrl !== "false", // Default to true if not specified
  );
  const [sessionPage, setSessionPage] = useState(0);

  // Sync all filters with URL
  const updateUrlWithFilters = React.useCallback(
    (updates: Record<string, any>) => {
      const newQuery = { ...router.query, ...updates };

      // Remove undefined/null values
      Object.keys(newQuery).forEach((key) => {
        if (
          newQuery[key] === undefined ||
          newQuery[key] === null ||
          newQuery[key] === ""
        ) {
          delete newQuery[key];
        }
      });

      router.push(
        {
          pathname: router.pathname,
          query: newQuery,
        },
        undefined,
        { shallow: true },
      );
    },
    [router],
  );

  // Sync selectedSessionId with URL on mount and when URL changes
  React.useEffect(() => {
    if (sessionIdFromUrl && sessionIdFromUrl !== selectedSessionId) {
      setSelectedSessionId(sessionIdFromUrl);
    }
  }, [sessionIdFromUrl]);

  // Sync date range with URL
  React.useEffect(() => {
    updateUrlWithFilters({
      dateFrom: dateRange.from.toISOString(),
      dateTo: dateRange.to.toISOString(),
    });
  }, [dateRange.from, dateRange.to]);

  // Sync other filters with URL
  React.useEffect(() => {
    updateUrlWithFilters({
      merchantOnly: showOnlyMerchant ? "true" : undefined,
      tag: selectedTag !== "all" ? selectedTag : undefined,
      correct: filterCorrect ? "true" : undefined,
      incorrect: filterIncorrect ? "true" : undefined,
      hideUnknown: hideUnknownUser ? undefined : "false", // Only add if false
    });
  }, [
    showOnlyMerchant,
    selectedTag,
    filterCorrect,
    filterIncorrect,
    hideUnknownUser,
  ]);

  // Clear selected tool call when session changes
  React.useEffect(() => {
    setSelectedToolCall(null);
    setSelectedTraceForDetails(null);
  }, [selectedSessionId]);

  // Update URL when session is selected
  const handleSessionSelect = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    updateUrlWithFilters({ sessionId });
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
      enabled: !!projectId && hasMoreSessions,
    },
  );

  // Accumulate sessions from pagination
  React.useEffect(() => {
    if (sessions.data?.sessions) {
      const newSessions = sessions.data.sessions;

      if (sessionPage === 0) {
        setAllSessions(newSessions);
      } else {
        setAllSessions((prev) => [...prev, ...newSessions]);
      }

      if (newSessions.length < 50) {
        setHasMoreSessions(false);
      } else {
        setSessionPage((prev) => prev + 1);
      }
    }
  }, [sessions.data?.sessions, sessionPage]);

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

  // Fetch traces for all sessions within date range
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
      limit: 100, // API maximum limit
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
        // First page - replace all traces
        setAllTraces(newTraces);
      } else {
        // Subsequent pages - append traces
        setAllTraces((prev) => [...prev, ...newTraces]);
      }

      // Check if there are more traces to fetch
      if (newTraces.length < 100) {
        setHasMoreTraces(false);
      } else {
        // Fetch next page
        setCurrentPage((prev) => prev + 1);
      }
    }
  }, [allSessionsTraces.data?.traces, currentPage]);

  // Reset pagination when date range changes
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

  // Fetch scores using pagination (same pattern as traces)
  const [allScores, setAllScores] = React.useState<any[]>([]);
  const [currentScorePage, setCurrentScorePage] = React.useState(0);
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
      page: currentScorePage,
      limit: 100, // API maximum limit
      orderBy: { column: "timestamp", order: "DESC" },
    },
    {
      enabled: !!projectId && allTraces.length > 0 && hasMoreScores,
    },
  );

  // Accumulate scores from pagination
  React.useEffect(() => {
    if (scoresQuery.data?.scores) {
      const newScores = scoresQuery.data.scores;

      if (currentScorePage === 0) {
        setAllScores(newScores);
      } else {
        setAllScores((prev) => [...prev, ...newScores]);
      }

      if (newScores.length < 100) {
        setHasMoreScores(false);
      } else {
        setCurrentScorePage((prev) => prev + 1);
      }
    }
  }, [scoresQuery.data?.scores, currentScorePage]);

  // Reset score pagination when traces change
  React.useEffect(() => {
    setAllScores([]);
    setCurrentScorePage(0);
    setHasMoreScores(true);
  }, [allTraces.length]);

  // Create wrapper for scores
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

      // Show only merchant data filter
      // Hide sessions where user_id contains "@juspay" (internal users)
      // Show only actual merchant/customer sessions
      if (showOnlyMerchant) {
        const hasJuspayUser = session.userIds?.some((uid: string) =>
          uid.toLowerCase().includes("@juspay"),
        );
        if (hasJuspayUser) return false;
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
    selectedTag,
    filterCorrect,
    filterIncorrect,
    hideUnknownUser,
    sessionToTagsMap,
    sessionEvaluationMap,
  ]);

  // Calculate statistics based on queries (traces) not sessions
  const statistics = React.useMemo(() => {
    if (!allSessionsTracesData.traces.length) {
      return {
        totalQueries: 0,
        correctQueries: 0,
        incorrectQueries: 0,
        correctPercentage: 0,
        totalSessions: 0,
      };
    }

    // Filter traces based on current filters (tag filter)
    const filteredTraces = allSessionsTracesData.traces.filter((trace) => {
      // Apply tag filter if selected
      if (selectedTag !== "all") {
        if (!trace.tags || !trace.tags.includes(selectedTag)) return false;
      }
      return true;
    });

    // Total queries = filtered traces
    const totalQueries = filteredTraces.length;

    // Count correct/incorrect queries from genius-feedback scores (only for filtered traces)
    let correctQueries = 0;
    let incorrectQueries = 0;

    if (allScoresData.scores.length > 0) {
      allScoresData.scores.forEach((score: any) => {
        // Check if this score belongs to a filtered trace
        const trace = filteredTraces.find((t) => t.id === score.traceId);
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
      correctQueries,
      incorrectQueries,
      correctPercentage,
      totalSessions,
    };
  }, [
    allScoresData.scores,
    allSessionsTracesData.traces,
    filteredSessions,
    selectedTag,
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

  return (
    <Page
      headerProps={{
        title: "Session Analytics v2",
        help: {
          description:
            "Session-based conversation view with detailed trace analysis.",
        },
      }}
    >
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left Sidebar - Sessions List */}
        <div className="w-84 border-r bg-background">
          <div className="flex h-full flex-col">
            {/* Date Range Filter */}
            <div className="border-b p-4">
              <Collapsible
                open={showDatePicker}
                onOpenChange={setShowDatePicker}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    <div className="flex flex-col items-start text-left">
                      <span className="text-xs text-muted-foreground">
                        Select date range
                      </span>
                      <span className="text-xs font-medium">
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
                            setDateRange({
                              from: new Date(today.setHours(0, 0, 0, 0)),
                              to: new Date(today.setHours(23, 59, 59, 999)),
                            });
                          }}
                        >
                          Today
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-xs"
                          onClick={() => {
                            const yesterday = new Date();
                            yesterday.setDate(yesterday.getDate() - 1);
                            setDateRange({
                              from: new Date(yesterday.setHours(0, 0, 0, 0)),
                              to: new Date(yesterday.setHours(23, 59, 59, 999)),
                            });
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
                            const last7Days = new Date();
                            last7Days.setDate(today.getDate() - 7);
                            setDateRange({
                              from: new Date(last7Days.setHours(0, 0, 0, 0)),
                              to: new Date(today.setHours(23, 59, 59, 999)),
                            });
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
                            const last30Days = new Date();
                            last30Days.setDate(today.getDate() - 30);
                            setDateRange({
                              from: new Date(last30Days.setHours(0, 0, 0, 0)),
                              to: new Date(today.setHours(23, 59, 59, 999)),
                            });
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
                            const last90Days = new Date();
                            last90Days.setDate(today.getDate() - 90);
                            setDateRange({
                              from: new Date(last90Days.setHours(0, 0, 0, 0)),
                              to: new Date(today.setHours(23, 59, 59, 999)),
                            });
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
                                  setDateRange({
                                    from: new Date(
                                      range.from.setHours(0, 0, 0, 0),
                                    ),
                                    to: range.to
                                      ? new Date(
                                          range.to.setHours(23, 59, 59, 999),
                                        )
                                      : new Date(
                                          range.from.setHours(23, 59, 59, 999),
                                        ),
                                  });
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

            {/* Statistics Section */}
            <div className="border-b p-4">
              {sessions.isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="rounded-lg border bg-gradient-to-r from-blue-50 to-purple-50 p-3 dark:from-blue-950/20 dark:to-purple-950/20">
                  <div className="mb-2 flex items-center gap-2">
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
              )}
            </div>

            {/* Search and Filters */}
            <div className="space-y-3 border-b p-4">
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
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={showOnlyMerchant}
                        onChange={(e) => setShowOnlyMerchant(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">Show only merchant data</span>
                    </label>

                    {/* Tag Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Filter by Agent Name
                      </label>
                      <Select
                        value={selectedTag}
                        onValueChange={setSelectedTag}
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
                            onChange={(e) => setFilterCorrect(e.target.checked)}
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
                              setFilterIncorrect(e.target.checked)
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
                              setHideUnknownUser(e.target.checked)
                            }
                            className="rounded"
                          />
                          <User className="h-3 w-3 text-gray-600" />
                          <span className="text-sm">Hide unknown user</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

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
        <div className="flex flex-1 flex-col">
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
                    {sessionTraces.data?.traces.map((trace, index) => {
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

        {/* Right Sidebar - Tool Call Details */}
        <div className="w-[450px] border-l bg-background">
          <div className="flex h-full flex-col">
            <div className="border-b p-4">
              <h3 className="font-semibold">
                {selectedToolCall ? "Tool Call Details" : "Response Details"}
              </h3>
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
