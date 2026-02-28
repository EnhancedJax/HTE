// import type { TreeDataResponse } from "@/lib/schemas/tree";

// /**
//  * Server-side mock tree data for knowledge research.
//  * Single source of truth for structure; layout is computed on the client.
//  * Root = high-level topic (user query); levels 2–3 = subtopics with AI summaries and assets.
//  */
// export function getMockTreeData(query?: string): TreeDataResponse {
//   const topic = query?.trim() || "Climate Change";
//   return {
//     query: topic,
//     nodes: [
//       {
//         id: "root",
//         type: "treeNode",
//         data: {
//           label: topic,
//           level: 1,
//           summary:
//             `${topic} is a broad area of research spanning causes, impacts, and responses. This overview synthesizes key findings from recent literature and highlights the main subtopics you can explore below.`,
//           description: "High-level topic from your query.",
//           images: [
//             "https://images.unsplash.com/photo-1569163136542-21c4d2d8b35d?w=400&h=250&fit=crop",
//           ],
//           relatedLinks: [
//             { url: "https://en.wikipedia.org/wiki/Climate_change", title: "Wikipedia: Climate change" },
//             { url: "https://www.ipcc.ch/", title: "IPCC" },
//           ],
//           metadata: { type: "root" },
//         },
//       },
//       {
//         id: "l2-causes",
//         type: "treeNode",
//         data: {
//           label: "Causes & Drivers",
//           level: 2,
//           summary:
//             "Research on causes examines greenhouse gas emissions, land-use change, and feedback loops. Anthropogenic factors dominate post-industrial warming, with fossil fuels and deforestation as primary drivers.",
//           images: [
//             "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400&h=250&fit=crop",
//           ],
//           relatedLinks: [
//             { url: "https://www.epa.gov/ghgemissions", title: "EPA Greenhouse Gas Emissions" },
//           ],
//           metadata: { focus: "causation" },
//         },
//       },
//       {
//         id: "l2-impacts",
//         type: "treeNode",
//         data: {
//           label: "Impacts & Effects",
//           level: 2,
//           summary:
//             "Effects include rising sea levels, extreme weather, biodiversity loss, and impacts on human health and agriculture. Regional variation is significant; adaptation and vulnerability are active research areas.",
//           images: [
//             "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400&h=250&fit=crop",
//           ],
//           relatedLinks: [
//             { url: "https://www.who.int/news-room/fact-sheets/detail/climate-change-and-health", title: "WHO: Climate and health" },
//           ],
//           metadata: { focus: "impacts" },
//         },
//       },
//       {
//         id: "l2-mitigation",
//         type: "treeNode",
//         data: {
//           label: "Mitigation & Policy",
//           level: 2,
//           summary:
//             "Mitigation strategies range from decarbonization and renewables to carbon capture and policy instruments. International agreements and national pledges shape the pace of transition.",
//           images: [
//             "https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?w=400&h=250&fit=crop",
//           ],
//           relatedLinks: [
//             { url: "https://unfccc.int/", title: "UNFCCC" },
//           ],
//           metadata: { focus: "mitigation" },
//         },
//       },
//       {
//         id: "l3-emissions",
//         type: "treeNode",
//         data: {
//           label: "Emissions & Inventories",
//           level: 3,
//           summary:
//             "National and sectoral emission inventories track CO₂, CH₄, and other gases. Methodologies and reporting standards enable comparison and target-setting.",
//           relatedLinks: [
//             { url: "https://www.ipcc.ch/report/ar6/wg3/", title: "IPCC AR6 WG3" },
//           ],
//           metadata: { subfocus: "emissions" },
//         },
//       },
//       {
//         id: "l3-feedbacks",
//         type: "treeNode",
//         data: {
//           label: "Feedback Mechanisms",
//           level: 3,
//           summary:
//             "Climate feedbacks—such as ice-albedo, water vapor, and permafrost carbon release—can amplify or dampen warming. Quantifying them reduces uncertainty in projections.",
//           metadata: { subfocus: "feedbacks" },
//         },
//       },
//       {
//         id: "l3-extremes",
//         type: "treeNode",
//         data: {
//           label: "Extreme Events",
//           level: 3,
//           summary:
//             "Heat waves, floods, droughts, and storms are intensifying in many regions. Attribution science links specific events to anthropogenic climate change.",
//           images: [
//             "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=250&fit=crop",
//           ],
//           metadata: { subfocus: "extremes" },
//         },
//       },
//       {
//         id: "l3-ecosystems",
//         type: "treeNode",
//         data: {
//           label: "Ecosystems & Biodiversity",
//           level: 3,
//           summary:
//             "Shifts in species ranges, phenology, and ecosystem services are documented globally. Ocean acidification and warming threaten marine and terrestrial biodiversity.",
//           metadata: { subfocus: "biodiversity" },
//         },
//       },
//       {
//         id: "l3-renewables",
//         type: "treeNode",
//         data: {
//           label: "Renewables & Transition",
//           level: 3,
//           summary:
//             "Solar, wind, and storage costs have fallen sharply. Energy transition pathways depend on technology, policy, and behavioral change.",
//           images: [
//             "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=400&h=250&fit=crop",
//           ],
//           metadata: { subfocus: "renewables" },
//         },
//       },
//       {
//         id: "l3-policy",
//         type: "treeNode",
//         data: {
//           label: "Policy & Governance",
//           level: 3,
//           summary:
//             "Carbon pricing, regulations, and international cooperation shape mitigation and adaptation. Equity and just transition are central to policy design.",
//           metadata: { subfocus: "policy" },
//         },
//       },
//     ],
//     edges: [
//       { id: "e-root-causes", source: "root", target: "l2-causes" },
//       { id: "e-root-impacts", source: "root", target: "l2-impacts" },
//       { id: "e-root-mitigation", source: "root", target: "l2-mitigation" },
//       { id: "e-causes-emissions", source: "l2-causes", target: "l3-emissions" },
//       { id: "e-causes-feedbacks", source: "l2-causes", target: "l3-feedbacks" },
//       { id: "e-impacts-extremes", source: "l2-impacts", target: "l3-extremes" },
//       { id: "e-impacts-ecosystems", source: "l2-impacts", target: "l3-ecosystems" },
//       { id: "e-mitigation-renewables", source: "l2-mitigation", target: "l3-renewables" },
//       { id: "e-mitigation-policy", source: "l2-mitigation", target: "l3-policy" },
//     ],
//   };
// }
