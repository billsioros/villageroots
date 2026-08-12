"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ManualEntryForm() {
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [deceased, setDeceased] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const res = await fetch("/api/nodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, subtitle, description, deceased }),
    });
    if (!res.ok) {
      setMessage("Failed to submit");
      return;
    }
    setLabel("");
    setSubtitle("");
    setDescription("");
    setDeceased(false);
    qc.invalidateQueries({ queryKey: ["me-submissions"] });
    setMessage("Submitted for review");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add a person</CardTitle>
        <CardDescription>
          Manually enter a person to be reviewed by an admin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="label">Name (required)</Label>
            <Input
              id="label"
              value={label}
              required
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subtitle">Subtitle</Label>
            <Input
              id="subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              className="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="deceased"
              checked={deceased}
              onCheckedChange={(v) => setDeceased(v === true)}
            />
            <Label htmlFor="deceased">Deceased</Label>
          </div>
          {!deceased && (
            <p className="text-sm text-muted-foreground">
              Living persons are private until an admin publishes them.
            </p>
          )}
          <Button type="submit">Submit for review</Button>
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
