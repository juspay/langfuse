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
  Calendar
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
  const sessionIdFromUrl = router.query.sessionId as string | undefined;
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(sessionIdFromUrl || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedToolCall, setSelectedToolCall] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [showOnlyMerchant, setShowOnlyMerchant] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setHours(0, 0, 0, 0)),
    to: new Date(new Date().setHours(23, 59, 59, 999)),
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [filterCorrect, setFilterCorrect] = useState(false);
  const [filterIncorrect, setFilterIncorrect] = useState(false);

  // Sync selectedSessionId with URL on mount and when URL changes
  React.useEffect(() => {
    if (sessionIdFromUrl && sessionIdFromUrl !== selectedSessionId) {
      setSelectedSessionId(sessionIdFromUrl);
    }
  }, [sessionIdFromUrl]);

  // Clear selected tool call when session changes
  React.useEffect(() => {
    setSelectedToolCall(null);
    setSelectedTraceForDetails(null);
  }, [selectedSessionId]);

  // Update URL when session is selected
  const handleSessionSelect = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    router.push(
      {
        pathname: router.pathname,
        query: { ...router.query, sessionId },
      },
      undefined,
      { shallow: true }
    );
  };

  // Fetch sessions
  const sessions = api.sessions.all.useQuery(
    {
      projectId,
      filter: [],
      page: 0,
      limit: 100,
      orderBy: { column: "createdAt", order: "DESC" },
    },
    {
      enabled: !!projectId,
    }
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
    }
  );

  // Fetch traces for all sessions to get scores (within date range)
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
      page: 0,
      limit: 100, // API maximum limit
      orderBy: { column: "timestamp", order: "DESC" },
    },
    {
      enabled: !!projectId && !!sessions.data?.sessions,
    }
  );

  // Fetch scores for all traces to calculate statistics (within date range)
  const allScores = api.scores.all.useQuery(
    {
      projectId,
      filter: [
        {
          column: "name",
          type: "string",
          operator: "=",
          value: "genius-feedback",
        },
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
      page: 0,
      limit: 100, // API maximum limit
      orderBy: { column: "timestamp", order: "DESC" },
    },
    {
      enabled: !!projectId && !!allSessionsTraces.data?.traces,
    }
  );

  // Create a map of session IDs to their evaluation status (correct/incorrect)
  const sessionEvaluationMap = React.useMemo(() => {
    if (!allScores.data?.scores || !allSessionsTraces.data?.traces) {
      return new Map<string, "correct" | "incorrect" | "mixed">();
    }

    const map = new Map<string, "correct" | "incorrect" | "mixed">();
    
    // Group scores by session
    const sessionScores = new Map<string, number[]>();
    allScores.data.scores.forEach((score: any) => {
      const trace = allSessionsTraces.data.traces.find((t) => t.id === score.traceId);
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
  }, [allScores.data?.scores, allSessionsTraces.data?.traces]);

  // Create a map of session IDs to their tags
  const sessionToTagsMap = React.useMemo(() => {
    if (!allSessionsTraces.data?.traces) return new Map<string, string[]>();
    
    const map = new Map<string, string[]>();
    allSessionsTraces.data.traces.forEach((trace) => {
      if (trace.sessionId && trace.tags && trace.tags.length > 0) {
        // Store all tags for each session
        if (!map.has(trace.sessionId)) {
          map.set(trace.sessionId, trace.tags);
        } else {
          // Merge tags if session already exists
          const existingTags = map.get(trace.sessionId) || [];
          map.set(trace.sessionId, [...new Set([...existingTags, ...trace.tags])]);
        }
      }
    });
    return map;
  }, [allSessionsTraces.data?.traces]);

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
    }
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
    }
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
      enabled: !!projectId && !!selectedSessionId && !!sessionTraces.data?.traces,
    }
  );

  const filteredSessions = React.useMemo(() => {
    return sessions.data?.sessions.filter((session) => {
    // Date range filter
    const sessionDate = new Date(session.createdAt);
    const matchesDateRange = sessionDate >= dateRange.from && sessionDate <= dateRange.to;
    
    if (!matchesDateRange) return false;
    
    // Search filter
    const matchesSearch = searchQuery
      ? session.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.userIds?.some((uid) =>
          uid.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : true;
    
    if (!matchesSearch) return false;
    
    // Show only merchant data filter
    // Hide sessions where user_id contains "@juspay" (internal users)
    // Show only actual merchant/customer sessions
    if (showOnlyMerchant) {
      const hasJuspayUser = session.userIds?.some((uid) =>
        uid.toLowerCase().includes("@juspay")
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
        if (evaluation !== "incorrect" && evaluation !== "mixed") return false;
      }
    }
    
    return true;
    });
  }, [sessions.data?.sessions, dateRange, searchQuery, showOnlyMerchant, selectedTag, filterCorrect, filterIncorrect, sessionToTagsMap, sessionEvaluationMap]);

  // Calculate statistics based on queries (traces) not sessions
  const statistics = React.useMemo(() => {
    if (!allSessionsTraces.data?.traces) {
      return { totalQueries: 0, correctQueries: 0, incorrectQueries: 0, correctPercentage: 0, totalSessions: 0 };
    }

    // Total queries = all traces in the date range
    const totalQueries = allSessionsTraces.data.traces.length;

    // Count correct/incorrect queries from genius-feedback scores
    let correctQueries = 0;
    let incorrectQueries = 0;

    if (allScores.data?.scores) {
      allScores.data.scores.forEach((score: any) => {
        if (score.value === 1) {
          correctQueries++;
        } else if (score.value === 0) {
          incorrectQueries++;
        }
      });
    }

    const correctPercentage = totalQueries > 0 ? Math.round((correctQueries / totalQueries) * 100) : 0;
    const totalSessions = filteredSessions?.length || 0;

    return { totalQueries, correctQueries, incorrectQueries, correctPercentage, totalSessions };
  }, [allScores.data?.scores, allSessionsTraces.data?.traces, filteredSessions]);

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
          description: "Session-based conversation view with detailed trace analysis.",
        },
      }}
    >
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left Sidebar - Sessions List */}
        <div className="w-80 border-r bg-background">
          <div className="flex flex-col h-full">
            {/* Date Range Filter */}
            <div className="p-4 border-b">
              <Collapsible open={showDatePicker} onOpenChange={setShowDatePicker}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Calendar className="mr-2 h-4 w-4" />
                    <div className="flex flex-col items-start text-left">
                      <span className="text-xs text-muted-foreground">Select date range</span>
                      <span className="text-xs font-medium">
                        {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}
                      </span>
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <Card className="p-3">
                    <div className="space-y-2">
                      <div className="text-xs font-medium mb-2">Quick select</div>
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
                                    from: new Date(range.from.setHours(0, 0, 0, 0)),
                                    to: range.to 
                                      ? new Date(range.to.setHours(23, 59, 59, 999))
                                      : new Date(range.from.setHours(23, 59, 59, 999)),
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
            <div className="p-4 border-b">
              {sessions.isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg p-3 border">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-600 dark:text-blue-400">📊</span>
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {filteredSessions?.length || 0}
                    </span>
                    <span className="text-xs text-muted-foreground">sessions</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-red-600 dark:text-red-400">
                        {statistics.incorrectQueries}
                      </span>
                      <span className="text-xs text-muted-foreground">incorrect</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">/</span>
                      <span className="font-bold text-gray-600 dark:text-gray-400">
                        {statistics.totalQueries}
                      </span>
                      <span className="text-xs text-muted-foreground">total</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-green-600 dark:text-green-400">
                        ({statistics.correctPercentage}%
                      </span>
                      <span className="text-xs text-muted-foreground">correct)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Search and Filters */}
            <div className="p-4 border-b space-y-3">
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
                <CollapsibleContent className="space-y-3 mt-2">
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showOnlyMerchant}
                        onChange={(e) => setShowOnlyMerchant(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">Show only merchant data</span>
                    </label>
                    
                    {/* Tag Filter - Using Shadcn Select for controlled dropdown direction */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Filter by Agent Name</label>
                      <Select value={selectedTag} onValueChange={setSelectedTag}>
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
                      <label className="text-sm font-medium">Filter by Evaluation</label>
                      <div className="space-y-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filterCorrect}
                            onChange={(e) => setFilterCorrect(e.target.checked)}
                            className="rounded"
                          />
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                          <span className="text-sm">Show only correct sessions</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filterIncorrect}
                            onChange={(e) => setFilterIncorrect(e.target.checked)}
                            className="rounded"
                          />
                          <XCircle className="h-3 w-3 text-red-600" />
                          <span className="text-sm">Show only incorrect sessions</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="text-xs text-muted-foreground">
                Showing: {filteredSessions?.length || 0} of {sessions.data?.sessions.length || 0} sessions
              </div>
            </div>

            {/* Sessions List */}
            <ScrollArea className="flex-1">
              {sessions.isLoading ? (
                <div className="p-4 space-y-3 pb-8">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : (
                <div className="p-2 pb-8">
                  {filteredSessions?.map((session) => {
                    // Get the most recent trace timestamp for this session
                    const sessionTraceTimestamp = allSessionsTraces.data?.traces
                      .filter((trace) => trace.sessionId === session.id)
                      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]?.timestamp;
                    
                    const displayTime = sessionTraceTimestamp || session.createdAt;
                    
                    return (
                      <Card
                        key={session.id}
                        className={cn(
                          "mb-2 p-3 cursor-pointer transition-colors hover:bg-accent",
                          selectedSessionId === session.id && "bg-accent border-primary"
                        )}
                        onClick={() => handleSessionSelect(session.id)}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-sm">
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
        <div className="flex-1 flex flex-col">
          {selectedSessionId ? (
            <>
              {/* Session Header */}
              <div className="p-4 border-b bg-muted/50">
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
                  <div className="space-y-4 max-w-4xl mx-auto pb-8">
                    {sessionTraces.data?.traces.map((trace, index) => {
                      const traceMetric = traceMetrics.data?.find((m) => m.id === trace.id);
                      return (
                        <TraceMessage
                          key={trace.id}
                          trace={trace}
                          traceMetric={traceMetric}
                          projectId={projectId}
                          isSelected={selectedToolCall?.id === trace.id}
                          onSelect={(traceId, timestamp) => {
                            setSelectedTraceForDetails({ traceId, timestamp });
                            setSelectedToolCall({ ...trace, metric: traceMetric });
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a session to view conversation</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Tool Call Details */}
        <div className="w-96 border-l bg-background">
          <div className="flex flex-col h-full">
            <div className="p-4 border-b">
              <h3 className="font-semibold">
                {selectedToolCall ? "Tool Call Details" : "Response Details"}
              </h3>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              {selectedToolCall ? (
                <div className="space-y-4 pb-6">
                  {/* Show all tool calls/observations */}
                  {traceDetails.isLoading ? (
                    <div className="text-sm text-muted-foreground">Loading tool calls...</div>
                  ) : (
                    <>
                      {observations && observations.length > 0 ? (
                        observations.map((obs: any, index: number) => (
                          <Collapsible key={obs.id} defaultOpen={index === 0}>
                            <Card className="mb-4 overflow-hidden">
                              <CollapsibleTrigger className="w-full p-3 hover:bg-accent transition-all duration-200">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs transition-transform duration-200 group-data-[state=open]:rotate-90">
                                      {index + 1}
                                    </div>
                                    <span className="text-sm font-medium">
                                      Tool call {index + 1}
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                      {obs.name || obs.type}
                                    </Badge>
                                  </div>
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2">
                                <div className="p-3 space-y-3 border-t">
                                  <ObservationDetails
                                    observationId={obs.id}
                                    traceId={selectedTraceForDetails?.traceId ?? ""}
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
                        <div className="text-sm text-muted-foreground">No tool calls found for this trace</div>
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
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
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
    }
  );

  // Extract arguments from input - return as object for PrettyJsonView
  const inputArguments = (() => {
    if (!observation.data?.input) return null;
    
    try {
      const parsed = typeof observation.data.input === "string" 
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
    <div className="p-3 space-y-3 border-t">
      {/* Request/Input - Light Blue Border */}
      <div className="border-2 border-blue-400 bg-blue-50 dark:bg-blue-950/20 rounded-md p-3">
        <div className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-2">
          Req → {name}
        </div>
        <PrettyJsonView
          json={inputArguments}
          currentView="json"
          className="text-xs"
        />
      </div>

      {/* Response/Output - Purple Border */}
      <div className="border-2 border-purple-400 bg-purple-50 dark:bg-purple-950/20 rounded-md p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium text-purple-700 dark:text-purple-400">
            Res
          </div>
          <Badge variant="secondary" className="text-xs">
            Response ({name})
          </Badge>
        </div>
        <div className="text-xs font-medium text-purple-700 dark:text-purple-400 mb-2">
          {name}_jaf
        </div>
        <PrettyJsonView
          json={outputResult}
          currentView="json"
          className="text-xs"
        />
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
    }
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
        text = typeof parsed.output === "string" ? parsed.output : JSON.stringify(parsed.output);
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
          text = text.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value));
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
          <div className="text-sm text-muted-foreground">Loading final response...</div>
        </div>
      </Card>
    );
  }

  if (!finalOutputText) return null;

  return (
    <Card className="border-2 border-green-500 bg-green-50 dark:bg-green-950/20">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Badge className="bg-green-600 hover:bg-green-700 text-white">
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
  const [selectedRating, setSelectedRating] = React.useState<string | null>(null);

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
    }
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
          (score: any) => score.name === "genius-feedback"
        );
        return hasGeniusFeedback ? false : 5000;
      },
    }
  );

  // Extract genius-feedback score
  const geniusFeedbackScore = React.useMemo(() => {
    if (!traceWithScores.data?.scores) return null;
    return traceWithScores.data.scores.find(
      (score: any) => score.name === "genius-feedback"
    );
  }, [traceWithScores.data?.scores]);

  // Extract user_query from input
  const inputText = (() => {
    if (!traceData.data?.input) return trace.name || "Query";
    
    if (typeof traceData.data.input === "string") {
      try {
        const parsed = JSON.parse(traceData.data.input);
        return parsed.user_query || traceData.data.input;
      } catch {
        return traceData.data.input;
      }
    }
    
    // If it's already an object
    return (traceData.data.input as any).user_query || JSON.stringify(traceData.data.input);
  })();

  // Extract only the text from outcome.output.text and replace placeholders
  const outputText = (() => {
    if (!traceData.data?.output) return "Response";
    
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
        text = typeof parsed.output === "string" ? parsed.output : JSON.stringify(parsed.output);
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
          text = text.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value));
        });
      }
      
      return text;
    } catch (e) {
      console.error("Error parsing output:", e);
      return typeof traceData.data.output === "string" 
        ? traceData.data.output 
        : JSON.stringify(traceData.data.output);
    }
  })();

  return (
    <div className="space-y-2">
      {/* User Query */}
      <div className="flex justify-end">
        <Card className="max-w-[80%] p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 mt-1" />
            <div className="flex-1">
              <div className="text-xs opacity-90 mb-1">
                User Q • {new Date(trace.timestamp).toLocaleTimeString()}
              </div>
              <div className="text-sm whitespace-pre-wrap">
                {inputText}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Assistant Response */}
      <div className="flex justify-start">
        <Card
          className={cn(
            "max-w-[80%] p-4 cursor-pointer transition-colors hover:bg-accent",
            isSelected && "bg-accent border-primary"
          )}
          onClick={() => onSelect(trace.id, trace.timestamp)}
        >
          <div className="flex items-start gap-2">
            <div className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs">
              AI
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
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
              <div className="text-sm">
                <MarkdownJsonView
                  content={outputText}
                  customCodeHeaderClassName="bg-secondary"
                />
              </div>

              {/* Rate Buttons */}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium">Rate:</span>
                <Button
                  variant={selectedRating === "correct" ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-7 text-xs",
                    selectedRating === "correct" && "bg-black hover:bg-black/90 text-white"
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
                  variant={selectedRating === "needs-work" ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-7 text-xs",
                    selectedRating === "needs-work" && "bg-black hover:bg-black/90 text-white"
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
                    selectedRating === "wrong" && "bg-black hover:bg-black/90 text-white"
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
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-5 w-5 rounded-full bg-purple-500 flex items-center justify-center">
                      <span className="text-white text-xs">⚡</span>
                    </div>
                    <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                      LLM Eval
                    </span>
                  </div>

                  <div className="space-y-2">
                    {/* Judge Response */}
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">
                        Judge Response:
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-950/20 rounded-md p-2 border border-purple-200 dark:border-purple-800">
                        <span className={cn(
                          "text-sm font-semibold",
                          geniusFeedbackScore.value === 1 
                            ? "text-green-600 dark:text-green-400" 
                            : "text-red-600 dark:text-red-400"
                        )}>
                          {geniusFeedbackScore.value === 1 ? "CORRECT" : "INCORRECT"}
                        </span>
                      </div>
                    </div>

                    {/* Judgement Reason */}
                    {geniusFeedbackScore.comment && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          Judgement Reason:
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-950/20 rounded-md p-3 border border-purple-200 dark:border-purple-800">
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
