import type { GraphNode, GraphEdge, SuggestedEdge, Verb } from "./types";
import { TYPE_META, VERB_KIND } from "./helpers";

const N = (
  id: string,
  type: GraphNode["type"],
  label: string,
  x: number,
  y: number,
  subtitle: string,
  description: string,
): GraphNode => ({
  id,
  type,
  label,
  subtitle,
  description,
  color: TYPE_META[type].color,
  mark: TYPE_META[type].glyph,
  x,
  y,
});

const E = (id: string, source: string, target: string, verb: Verb): GraphEdge => ({
  id,
  source,
  target,
  verb,
  kind: VERB_KIND[verb],
});

export const NODES: GraphNode[] = [
  N("p-nikolas", "person", "Nikolas Katsaris", 1410, 400, "1898–1978 · miller", "Nikolas Katsaris ran the village mill for half a century. He ground wheat for every household in the hollow — nobody was turned away, even in the hungry years.\n\n“He ground wheat for every household in the hollow — nobody was turned away, even in the hungry years.” — Village oral archive"),
  N("p-maria", "person", "Maria Katsari", 1260, 500, "1905–1992", "Household head of Kalyvia. Married to Nikolas Katsaris."),
  N("p-yiannis", "person", "Yiannis Katsaris", 1550, 570, "1932–2010 · miller", "Second-generation miller. Interviewed in 1989."),
  N("p-eleni", "person", "Eleni Vasiliou", 1410, 690, "b. 1935", "Village editor. Living source, interviewed 2019."),
  N("p-alexandros", "person", "Alexandros Vasiliou", 1860, 900, "1928–1996 · farmer", "Farmed the Kalyvia fields."),
  N("f-katsaris", "family", "Katsaris Lineage", 1390, 530, "Kalyvia · 18th c.", "One of the founding lineages of Kalyvia."),
  N("f-vasiliou", "family", "Vasiliou Lineage", 1980, 960, "Potidaneia", "A Potidaneia lineage."),
  N("l-church", "landmark", "Agios Ioannis", 430, 560, "built 1742", "The village church. Registries 1742–today."),
  N("l-mill", "landmark", "The Old Mill", 560, 700, "built 1901", "The water mill on the stream below Kalyvia."),
  N("l-bridge", "landmark", "Kamares Bridge", 330, 790, "c. 1840", "Stone bridge over the ravine."),
  N("l-plane", "landmark", "Grand Plane Tree", 640, 480, "c. 1700", "The village gathering spot."),
  N("t-petra", "toponym", "Petra", 700, 890, "the rock", "Rock formation above the village."),
  N("t-kalyvia", "toponym", "Kalyvia", 760, 1290, "the outlying hamlet", "The outlying hamlet."),
  N("t-lakka", "toponym", "Lakka", 980, 700, "the hollow", "The valley hollow."),
  N("e-charter", "event", "Founding charter", 800, 380, "1731", "Village founding charter."),
  N("e-school", "event", "School opens", 240, 950, "1912", "First schoolhouse."),
  N("e-feast", "event", "Harvest feast", 950, 1100, "Aug 1947", "The 1947 harvest feast."),
  N("e-emigrate", "event", "Emigration wave", 1800, 1240, "1960s", "The 1960s emigration wave."),
  N("d-drakia", "path", "Drakia mule track", 880, 1060, "stone · 4 km", "The old stone mule track."),
];

export const EDGES: GraphEdge[] = [
  E("e-nik-maria", "p-nikolas", "p-maria", "married_to"),
  E("e-nik-yiannis", "p-nikolas", "p-yiannis", "child_of"),
  E("e-nik-eleni", "p-nikolas", "p-eleni", "child_of"),
  E("e-nik-kats", "p-nikolas", "f-katsaris", "belongs_to_clan"),
  E("e-yiannis-kats", "p-yiannis", "f-katsaris", "belongs_to_clan"),
  E("e-eleni-kats", "p-eleni", "f-katsaris", "belongs_to_clan"),
  E("e-eleni-alex", "p-eleni", "p-alexandros", "married_to"),
  E("e-alex-vas", "p-alexandros", "f-vasiliou", "belongs_to_clan"),
  E("e-nik-petra", "p-nikolas", "t-petra", "lived_at"),
  E("e-nik-lakka", "p-nikolas", "t-lakka", "farmed_at"),
  E("e-yiannis-kalyvia", "p-yiannis", "t-kalyvia", "owns_land_at"),
  E("e-alex-kalyvia", "p-alexandros", "t-kalyvia", "owns_land_at"),
  E("e-mill-nikolas", "l-mill", "p-nikolas", "ran_by"),
  E("e-yiannis-church", "p-yiannis", "l-church", "baptized_at"),
  E("e-maria-church", "p-maria", "l-church", "buried_at"),
  E("e-nik-feast", "p-nikolas", "e-feast", "participated_in"),
  E("e-yiannis-school", "p-yiannis", "e-school", "participated_in"),
  E("e-kats-plane", "f-katsaris", "l-plane", "gathered_at"),
];

export const SUGGESTED_EDGES: SuggestedEdge[] = [
  { id: "s1", source: "p-yiannis", target: "p-eleni", verb: "sibling_of", kind: "social", suggested: true, confidence: 82 },
  { id: "s2", source: "p-alexandros", target: "t-lakka", verb: "owns_land_at", kind: "geo", suggested: true, confidence: 67 },
];
