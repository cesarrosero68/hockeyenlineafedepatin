import { useState, useMemo, useCallback, DragEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toBogotaDate, bogotaInputToUTC } from "@/lib/timezone";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

interface Props {
  matches: any[];
}

export default function AdminScheduleCalendar({ matches }: Props) {
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dragMatchId, setDragMatchId] = useState<string | null>(null);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    const days: Date[] = [];
    let day = start;
    while (day <= end) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const matchesByDay = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const m of matches) {
      if (!m.match_date) continue;
      const d = toBogotaDate(m.match_date);
      if (!d) continue;
      const key = format(d, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return map;
  }, [matches]);

  const updateDateMutation = useMutation({
    mutationFn: async ({ matchId, newDate }: { matchId: string; newDate: string }) => {
      // Find original match to preserve time
      const match = matches.find((m) => m.id === matchId);
      const origBogota = match?.match_date ? toBogotaDate(match.match_date) : null;
      const hours = origBogota ? format(origBogota, "HH") : "08";
      const minutes = origBogota ? format(origBogota, "mm") : "00";
      const newDatetime = `${newDate}T${hours}:${minutes}`;
      const utc = bogotaInputToUTC(newDatetime);

      const { error } = await supabase.from("matches").update({ match_date: utc }).eq("id", matchId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
      toast({ title: "Partido reprogramado" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleDragStart = useCallback((e: DragEvent, matchId: string) => {
    e.dataTransfer.setData("matchId", matchId);
    setDragMatchId(matchId);
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: DragEvent, dayDate: Date) => {
    e.preventDefault();
    const matchId = e.dataTransfer.getData("matchId");
    if (!matchId) return;
    setDragMatchId(null);
    const newDate = format(dayDate, "yyyy-MM-dd");
    updateDateMutation.mutate({ matchId, newDate });
  }, [updateDateMutation]);

  const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <div className="space-y-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-semibold capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: es })}
        </h3>
        <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded overflow-hidden">
        {weekDays.map((d) => (
          <div key={d} className="bg-muted p-1 text-center text-xs font-medium">{d}</div>
        ))}
        {calendarDays.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayMatches = matchesByDay.get(key) ?? [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={key}
              className={`bg-background min-h-[80px] p-1 text-xs ${!isCurrentMonth ? "opacity-40" : ""} ${isToday ? "ring-1 ring-primary ring-inset" : ""}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, day)}
            >
              <div className="font-medium mb-0.5">{format(day, "d")}</div>
              <div className="space-y-0.5 overflow-y-auto max-h-[60px]">
                {dayMatches.map((m: any) => {
                  const home = m.match_teams?.find((mt: any) => mt.side === "home");
                  const away = m.match_teams?.find((mt: any) => mt.side === "away");
                  const isLocked = m.status === "locked";
                  const bogotaD = toBogotaDate(m.match_date);
                  const timeStr = bogotaD ? format(bogotaD, "HH:mm") : "";

                  return (
                    <div
                      key={m.id}
                      draggable={!isLocked}
                      onDragStart={(e) => handleDragStart(e, m.id)}
                      className={`rounded px-1 py-0.5 truncate cursor-grab active:cursor-grabbing text-[10px] leading-tight ${
                        m.status === "in_progress" ? "bg-primary/20 text-primary" :
                        m.status === "closed" || m.status === "locked" ? "bg-muted text-muted-foreground" :
                        "bg-secondary text-secondary-foreground"
                      } ${dragMatchId === m.id ? "opacity-50" : ""} ${isLocked ? "cursor-not-allowed" : ""}`}
                      title={`${home?.teams?.name ?? "TBD"} vs ${away?.teams?.name ?? "TBD"}`}
                    >
                      {timeStr && <span className="font-medium">{timeStr} </span>}
                      {home?.teams?.name?.substring(0, 8) ?? "?"} vs {away?.teams?.name?.substring(0, 8) ?? "?"}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
