import { useState } from "react";
import {
  Award, Star, Crown, Target, Flame, BookOpen, Trophy, Gem,
  Medal, Coins, Lock, ChevronLeft,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import SEOHead from "@/components/SEOHead";
import { useGamification, useLeaderboard, Badge } from "@/hooks/useGamification";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ICON_MAP: Record<string, any> = {
  Award, Star, Crown, Target, Flame, BookOpen, Trophy, Gem, Medal, Coins,
};

const AchievementsPage = () => {
  const { user } = useAuth();
  const { totalPoints, allBadges, earnedBadges, loading } = useGamification();
  const { leaderboard, loading: lbLoading } = useLeaderboard();
  const earnedIds = new Set(earnedBadges.map((b) => b.id));

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead title="إنجازاتي | تنوير" description="نقاطك وشاراتك ولوحة المتصدرين" />
      <Navbar />
      <div className="container mx-auto max-w-4xl px-4 py-8" dir="rtl">
        {/* Points Summary */}
        <div className="mb-8 rounded-2xl bg-hero-gradient p-6 text-primary-foreground shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">مجموع نقاطك</p>
              <p className="text-4xl font-black">{totalPoints.toLocaleString("ar-YE")}</p>
              <p className="mt-1 text-sm opacity-80">
                {earnedBadges.length} / {allBadges.length} شارة مكتسبة
              </p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
              <Trophy className="h-8 w-8" />
            </div>
          </div>
        </div>

        <Tabs defaultValue="badges" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="badges">🏆 الشارات</TabsTrigger>
            <TabsTrigger value="leaderboard">🥇 المتصدرين</TabsTrigger>
          </TabsList>

          {/* Badges Tab */}
          <TabsContent value="badges">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              {allBadges.map((badge) => {
                const earned = earnedIds.has(badge.id);
                const IconComp = ICON_MAP[badge.icon] || Award;
                const earnedData = earnedBadges.find((b) => b.id === badge.id);
                return (
                  <div
                    key={badge.id}
                    className={`relative rounded-2xl border p-4 transition-all ${
                      earned
                        ? "border-transparent bg-card shadow-lg"
                        : "border-border bg-muted/30 opacity-60"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: earned ? badge.color + "20" : undefined }}
                      >
                        {earned ? (
                          <IconComp className="h-7 w-7" style={{ color: badge.color }} />
                        ) : (
                          <Lock className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-foreground">{badge.name}</h3>
                        <p className="text-sm text-muted-foreground">{badge.description}</p>
                        {badge.points_reward > 0 && (
                          <p className="mt-1 text-xs text-primary font-semibold">
                            +{badge.points_reward} نقطة مكافأة
                          </p>
                        )}
                        {earned && earnedData && (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            مكتسبة في {new Date(earnedData.earned_at).toLocaleDateString("ar-YE")}
                          </p>
                        )}
                      </div>
                    </div>
                    {earned && (
                      <div className="absolute left-3 top-3">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success text-[10px] text-success-foreground">✓</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard">
            {lbLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : leaderboard.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">لا توجد بيانات بعد. ابدأ بإكمال الدروس لتظهر هنا!</p>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((entry, i) => {
                  const isMe = entry.user_id === user?.id;
                  const medals = ["🥇", "🥈", "🥉"];
                  return (
                    <div
                      key={entry.user_id}
                      className={`flex items-center gap-4 rounded-xl border px-4 py-3 transition-all ${
                        isMe ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card"
                      }`}
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold">
                        {i < 3 ? medals[i] : i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground truncate">
                          {entry.full_name} {isMe && <span className="text-xs text-primary">(أنت)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">{entry.badges_count} شارة</p>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-primary">{entry.total_points.toLocaleString("ar-YE")}</p>
                        <p className="text-[10px] text-muted-foreground">نقطة</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default AchievementsPage;
