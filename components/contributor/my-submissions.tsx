"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Submission = {
  id: string;
  slug: string;
  label: string;
  status: string;
  privacy: string;
  createdAt: string;
  reason: string | null;
};

const fetchSubmissions = async (): Promise<Submission[]> => {
  const res = await fetch("/api/me/submissions");
  if (!res.ok) throw new Error("Failed to fetch submissions");
  return res.json();
};

export function MySubmissions() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["me-submissions"],
    queryFn: fetchSubmissions,
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>My submissions</CardTitle>
          <CardDescription>Your pending and rejected entries.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {isError && <p className="text-sm text-destructive">Failed to load</p>}
        {data && data.length === 0 && (
          <p className="text-sm text-muted-foreground">No submissions yet.</p>
        )}
        {data && data.length > 0 && (
          <ul className="space-y-3">
            {data.map((s) => (
              <li key={s.id} className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{s.label}</p>
                  {s.reason && (
                    <p className="text-sm text-muted-foreground">
                      Reason: {s.reason}
                    </p>
                  )}
                </div>
                <Badge variant="secondary">{s.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
