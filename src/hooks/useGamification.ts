import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  condition_type: string;
  condition_value: number;
  points_reward: number;
}

export interface EarnedBadge extends Badge {
  earned_at: string;
}

export const useGamification = () => {
  const { user } = useAuth();
  const [totalPoints, setTotalPoints] = useState(0);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    const [pointsRes, badgesRes, earnedRes] = await Promise.all([
      supabase.rpc("get_user_total_points", { _user_id: user.id }),
      supabase.from("badges").select("*").order("sort_order"),
      supabase.from("student_badges").select("*, badges(*)").eq("user_id", user.id),
    ]);

    setTotalPoints((pointsRes.data as number) || 0);
    setAllBadges((badgesRes.data || []) as Badge[]);
    setEarnedBadges(
      (earnedRes.data || []).map((e: any) => ({ ...e.badges, earned_at: e.earned_at }))
    );
    setLoading(false);
  };

  return { totalPoints, allBadges, earnedBadges, loading, refresh: loadData };
};

export const useLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<{ user_id: string; full_name: string; total_points: number; badges_count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadLeaderboard(); }, []);

  const loadLeaderboard = async () => {
    // Get top students by points
    const { data: pointsData } = await supabase
      .from("student_points")
      .select("user_id, points");

    if (!pointsData?.length) { setLoading(false); return; }

    // Aggregate points per user
    const userPoints: Record<string, number> = {};
    pointsData.forEach((p: any) => {
      userPoints[p.user_id] = (userPoints[p.user_id] || 0) + p.points;
    });

    const topUserIds = Object.entries(userPoints)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([id]) => id);

    if (!topUserIds.length) { setLoading(false); return; }

    // Get profiles and badge counts
    const [profilesRes, badgesRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name").in("user_id", topUserIds),
      supabase.from("student_badges").select("user_id").in("user_id", topUserIds),
    ]);

    const nameMap = Object.fromEntries((profilesRes.data || []).map((p: any) => [p.user_id, p.full_name]));
    const badgeCounts: Record<string, number> = {};
    (badgesRes.data || []).forEach((b: any) => { badgeCounts[b.user_id] = (badgeCounts[b.user_id] || 0) + 1; });

    setLeaderboard(
      topUserIds.map((id) => ({
        user_id: id,
        full_name: nameMap[id] || "طالب",
        total_points: userPoints[id],
        badges_count: badgeCounts[id] || 0,
      }))
    );
    setLoading(false);
  };

  return { leaderboard, loading };
};
