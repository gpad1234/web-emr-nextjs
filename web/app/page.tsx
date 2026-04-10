"use client";

import { usePatients } from "@/lib/hooks/usePatients";
import type { CensusInsight } from "@/app/api/census-insights/route";
import {
    AreaChart,
    Badge,
    BadgeDelta,
    Bold,
    Card,
    Divider,
    Flex,
    Grid,
    List,
    ListItem,
    Metric,
    Text,
    Title,
} from "@tremor/react";
import Link from "next/link";
import { useState, useCallback } from "react";

const weeklyAdmissions = [
  { day: "Mon", Admissions: 6 },
  { day: "Tue", Admissions: 9 },
  { day: "Wed", Admissions: 7 },
  { day: "Thu", Admissions: 11 },
  { day: "Fri", Admissions: 8 },
  { day: "Sat", Admissions: 4 },
  { day: "Sun", Admissions: 3 },
];

const focusAreas = [
  { title: "Critical labs", detail: "3 results awaiting sign-off", tone: "red" as const },
  { title: "Upcoming rounds", detail: "5 patients to round on", tone: "orange" as const },
  { title: "Family check-ins", detail: "2 priority conversations", tone: "yellow" as const },
];

const timeline = [
  { time: "09:30", title: "Telehealth: Patient Visit", owner: "Dr. Reyes", upcoming: true },
  { time: "10:15", title: "In-clinic: Follow-up", owner: "Dr. Cho", upcoming: false },
  { time: "11:00", title: "Care-coord sync", owner: "Team Huddle", upcoming: true },
  { time: "13:00", title: "Medication review", owner: "Dr. Patel", upcoming: true },
];

export default function DashboardPage() {
  const { data, isLoading } = usePatients();
  const [insights, setInsights] = useState<CensusInsight[]>([]);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  const patients = data?.items ?? [];
  const total = data?.total ?? 0;
  const critical = patients.filter((p) => p.status === "critical").length;
  const recovering = patients.filter((p) => p.status === "recovering").length;
  const stable = patients.filter((p) => p.status === "stable").length;

  const analyseCensus = useCallback(async () => {
    if (patients.length === 0) return;
    setIsAnalysing(true);
    setInsightError(null);
    try {
      const res = await fetch("/api/census-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patients }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setInsights(json.insights as CensusInsight[]);
    } catch (e: unknown) {
      setInsightError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setIsAnalysing(false);
    }
  }, [patients]);

  return (
    <div className="p-8 space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <Text className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-1">
            Care Runway
          </Text>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Start the day knowing what&apos;s essential.
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Sunday, April 5, 2026 · Unit 3B
          </p>
        </div>
        <Link
          href="/patients/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Patient
        </Link>
      </div>

      {/* Critical alert banner */}
      {critical > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
          <p className="text-red-700 text-sm font-medium">
            {critical} patient{critical > 1 ? "s" : ""} in critical condition — immediate review required.
          </p>
          <Link href="/patients?status=critical" className="ml-auto text-red-600 text-xs font-semibold hover:underline">
            View →
          </Link>
        </div>
      )}

      {/* KPI row */}
      <Grid numItemsMd={2} numItemsLg={4} className="gap-4">
        <Card decoration="top" decorationColor="blue">
          <Flex justifyContent="between" alignItems="start">
            <Text className="font-medium">Total Patients</Text>
            <BadgeDelta deltaType="moderateIncrease" size="xs">+4 this week</BadgeDelta>
          </Flex>
          <Metric className="mt-2 text-slate-900">
            {isLoading ? "—" : total}
          </Metric>
          <Text className="mt-1 text-slate-400 text-xs">on census today</Text>
        </Card>

        <Card decoration="top" decorationColor="red">
          <Flex justifyContent="between" alignItems="start">
            <Text className="font-medium">Critical</Text>
            <BadgeDelta deltaType="increase" size="xs">+1 today</BadgeDelta>
          </Flex>
          <Metric className="mt-2 text-red-600">
            {isLoading ? "—" : critical}
          </Metric>
          <Text className="mt-1 text-slate-400 text-xs">needs immediate attention</Text>
        </Card>

        <Card decoration="top" decorationColor="amber">
          <Flex justifyContent="between" alignItems="start">
            <Text className="font-medium">Recovering</Text>
            <BadgeDelta deltaType="moderateIncrease" size="xs">+2 vs Fri</BadgeDelta>
          </Flex>
          <Metric className="mt-2 text-amber-600">
            {isLoading ? "—" : recovering}
          </Metric>
          <Text className="mt-1 text-slate-400 text-xs">on monitored recovery</Text>
        </Card>

        <Card decoration="top" decorationColor="emerald">
          <Flex justifyContent="between" alignItems="start">
            <Text className="font-medium">Stable</Text>
            <BadgeDelta deltaType="unchanged" size="xs">steady</BadgeDelta>
          </Flex>
          <Metric className="mt-2 text-emerald-600">
            {isLoading ? "—" : stable}
          </Metric>
          <Text className="mt-1 text-slate-400 text-xs">ready for routine review</Text>
        </Card>
      </Grid>

      {/* Chart + Focus areas */}
      <Grid numItemsMd={2} className="gap-4">
        <Card>
          <Title>Weekly Admissions</Title>
          <Text className="text-slate-400 text-xs mb-3">7-day rolling total</Text>
          <AreaChart
            className="h-40 mt-2"
            data={weeklyAdmissions}
            index="day"
            categories={["Admissions"]}
            colors={["blue"]}
            showLegend={false}
            showYAxis={false}
            showGradient
            curveType="monotone"
          />
        </Card>

        <Card>
          <Title>Focus Areas</Title>
          <Divider />
          <List className="mt-1">
            {focusAreas.map(({ title, detail, tone }) => (
              <ListItem key={title} className="py-2.5">
                <Flex justifyContent="start" className="gap-3">
                  <Badge color={tone} size="xs">&nbsp;</Badge>
                  <span>
                    <Bold>{title}</Bold>
                    <Text className="text-slate-400 text-xs mt-0.5">{detail}</Text>
                  </span>
                </Flex>
              </ListItem>
            ))}
          </List>
        </Card>
      </Grid>

      {/* AI Census Insights */}
      <Card>
        <Flex justifyContent="between" alignItems="center">
          <div>
            <Title>AI Census Insights</Title>
            <Text className="text-slate-400 text-xs mt-0.5">Pattern analysis across all patients</Text>
          </div>
          <button
            type="button"
            onClick={analyseCensus}
            disabled={isAnalysing || isLoading || patients.length === 0}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isAnalysing ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Analysing…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.347A3.75 3.75 0 0112 15.75a3.75 3.75 0 01-2.797-1.253l-.347-.347z" />
                </svg>
                Analyse Census
              </>
            )}
          </button>
        </Flex>
        <Divider />

        {insightError && (
          <p className="text-xs text-red-600 mb-3">{insightError}</p>
        )}

        {!isAnalysing && insights.length === 0 && !insightError && (
          <p className="text-sm text-slate-400 text-center py-6">
            Click &ldquo;Analyse Census&rdquo; to surface patterns and risks across all {total} patients.
          </p>
        )}

        {insights.length > 0 && (
          <div className="space-y-3">
            {insights.map((insight, i) => {
              const styles = {
                critical: { bar: "bg-red-500", bg: "bg-red-50 border-red-200", text: "text-red-700", badge: "red" as const },
                warning:  { bar: "bg-amber-400", bg: "bg-amber-50 border-amber-200", text: "text-amber-700", badge: "amber" as const },
                info:     { bar: "bg-blue-400", bg: "bg-blue-50 border-blue-200", text: "text-blue-700", badge: "blue" as const },
              }[insight.severity];
              return (
                <div key={i} className={`flex gap-3 p-3 border rounded-md ${styles.bg}`}>
                  <div className={`w-1 flex-shrink-0 rounded-full ${styles.bar}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge color={styles.badge} size="xs">{insight.severity}</Badge>
                      <p className={`text-sm font-semibold ${styles.text}`}>{insight.headline}</p>
                    </div>
                    <p className="text-xs text-slate-600">{insight.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Today's timeline */}
      <Card>
        <Title>Today&apos;s Schedule</Title>
        <Divider />
        <div className="space-y-0 divide-y divide-slate-100">
          {timeline.map(({ time, title, owner, upcoming }) => (
            <div key={time} className="flex items-center gap-4 py-3">
              <span className="w-14 text-right text-slate-400 text-xs font-mono tabular-nums flex-shrink-0">
                {time}
              </span>
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  upcoming ? "bg-blue-400" : "bg-slate-300"
                }`}
              />
              <span className="flex-1">
                <p className={`text-sm font-medium ${upcoming ? "text-slate-800" : "text-slate-400 line-through"}`}>
                  {title}
                </p>
                <p className="text-slate-400 text-xs">{owner}</p>
              </span>
              {upcoming && (
                <Badge color="blue" size="xs">upcoming</Badge>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
