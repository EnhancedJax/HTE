import type { TreeExpandResponse } from "@/lib/schemas/tree";
import { generateExpandSubtreeWithLangChain } from "@/lib/ai/tree-generator";
import { NextRequest, NextResponse } from "next/server";

/** Mock subtopics for "Dive deep" expansion. Key by parent node id suffix for variety. */
const MOCK_SUBTREE_BY_FOCUS: Record<
  string,
  { label: string; summary: string }[]
> = {
  emissions: [
    {
      label: "Sectoral Inventories",
      summary:
        "Breakdown by energy, industry, agriculture, and land use. Sector-specific methodologies and reporting.",
    },
    {
      label: "National Reporting",
      summary:
        "UNFCCC submissions, NDCs, and transparency frameworks. Common reporting tables and biennial reports.",
    },
    {
      label: "Emission Factors",
      summary:
        "Default and country-specific factors for CO₂, CH₄, N₂O. IPCC guidelines and uncertainty.",
    },
  ],
  feedbacks: [
    {
      label: "Ice–Albedo Feedback",
      summary:
        "Retreat of ice and snow reduces reflectivity, amplifying warming. Arctic amplification and permafrost.",
    },
    {
      label: "Water Vapor Feedback",
      summary:
        "Warmer atmosphere holds more moisture; water vapor is a strong greenhouse gas. Coupled with circulation.",
    },
  ],
  extremes: [
    {
      label: "Attribution Studies",
      summary:
        "Event attribution links specific extremes to anthropogenic forcing. Probabilistic and storyline approaches.",
    },
    {
      label: "Compound Events",
      summary:
        "Concurrent or sequential extremes (e.g., heat and drought). Risk assessment and adaptation.",
    },
  ],
  biodiversity: [
    {
      label: "Range Shifts",
      summary:
        "Species moving poleward and to higher elevations. Community reassembly and invasion dynamics.",
    },
    {
      label: "Phenology",
      summary:
        "Shifts in timing of life-cycle events. Mismatches between species and trophic cascades.",
    },
  ],
  renewables: [
    {
      label: "Solar & Wind Costs",
      summary:
        "LCOE trends, learning curves, and grid integration. Storage and flexibility needs.",
    },
    {
      label: "Transition Pathways",
      summary:
        "IAMs and scenario analysis. Net-zero and 1.5°C compatible energy mixes.",
    },
  ],
  policy: [
    {
      label: "Carbon Pricing",
      summary:
        "ETS, carbon taxes, and border adjustments. Equity and just transition.",
    },
    {
      label: "Regulation & Standards",
      summary:
        "Sectoral regulations, standards, and finance. International cooperation.",
    },
  ],
  default: [
    {
      label: "Subtopic A",
      summary: "Deeper aspect of this topic. Research and applications.",
    },
    {
      label: "Subtopic B",
      summary: "Another angle. Evidence and policy relevance.",
    },
  ],
};

function pickSubtree(parentId: string): { label: string; summary: string }[] {
  const key =
    Object.keys(MOCK_SUBTREE_BY_FOCUS).find((k) =>
      parentId.toLowerCase().includes(k),
    ) ?? "default";
  return MOCK_SUBTREE_BY_FOCUS[key];
}

/**
 * POST /api/tree/expand
 * Body: { nodeId: string, query?: string }
 * Returns new nodes and edges for a subtree under the given node (for "Dive deep" on leaves).
 */
export async function POST(request: NextRequest) {
  let body: {
    nodeId?: string;
    nodeLabel?: string;
    query?: string;
    level?: 2 | 3;
    count?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const nodeId = body?.nodeId?.trim();
  if (!nodeId) {
    return NextResponse.json(
      { error: "Missing or empty nodeId" },
      { status: 400 },
    );
  }

  try {
    const response = await generateExpandSubtreeWithLangChain({
      nodeId,
      nodeLabel: body?.nodeLabel,
      query: body?.query,
      level: body?.level,
      count: body?.count,
    });
    return NextResponse.json(response);
  } catch {
    // Fallback: mock expansion so "Dive deep" still works without LLM config.
    const subtopics = pickSubtree(nodeId);
    const nodes = subtopics.map((s, i) => ({
      id: `${nodeId}-sub-${i + 1}`,
      type: "treeNode",
      data: {
        label: s.label,
        level: 3 as const,
        summary: s.summary,
        metadata: { parent: nodeId, expanded: "true" },
      },
    }));

    const edges = subtopics.map((_, i) => ({
      id: `e-${nodeId}-sub-${i + 1}`,
      source: nodeId,
      target: `${nodeId}-sub-${i + 1}`,
    }));

    const response: TreeExpandResponse = { nodes, edges };
    return NextResponse.json(response);
  }
}
