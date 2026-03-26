import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const PointsBadge = () => {
  const { user } = useAuth();
  const [points, setPoints] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("get_user_total_points", { _user_id: user.id }).then(({ data }) => {
      setPoints((data as number) || 0);
    });
  }, [user]);

  if (!user || points === null) return null;

  return (
    <Link
      to="/achievements"
      className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary transition-colors hover:bg-primary/20"
      title="نقاطي"
    >
      <Star className="h-3.5 w-3.5 fill-primary" />
      {points.toLocaleString("ar-YE")}
    </Link>
  );
};

export default PointsBadge;
