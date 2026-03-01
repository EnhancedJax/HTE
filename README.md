# ConceptBranch KTE

Deployment: https://hte-omega.vercel.app/

HackTheEast 2026 Team LockedIn

## Problem

We built ConceptBranch because modern learners are drowning in information. In today's world, everything from AI to finance, politics to sports, “what’s current” changes weekly. Most tools either give shallow overview or overwhelm users with poorly structured walls of text. We asked ourselves: **can keeping up with research feel as fun as scrolling RedNote?**

## Solution

ConceptBranch does just that! It delivers RedNote-style, bite-sized visual paper intros and recommends them based on each learner’s past clicks which makes discovery more engaging and personal. We wanted to create a living map of knowledge that evolves with the learner and the world, delivering information in a far more engaging and interactive manner.

Unlike one-directional feeds that cluster similar content, ConceptBranch offers a **tree-shaped exploration map**: learners can branch into any concept direction, jump across related ideas, and keep expanding along multiple threads as their knowledge evolves.

## What it does

ConceptBranch transforms a user query into a dynamic, explorable learning graph:

- Generates a structured concept tree from a broad topic.
- Lets users dive deeper into any topic for progressive, targeted expansion.
- Runs context-aware AI chat grounded in the exact branches the learner selected.
- Surfaces key terms and subtopics to guide focused exploration.
- Supports both “Research” mode (breadth-first discovery) and “Explore” mode (education-first depth).

## How we built it

- **Frontend:** Next.js + React + animated graph interface for intuitive knowledge navigation.
- **Knowledge engine:** tree generation + subtree expansion APIs with strict JSON schemas for stable graph output.
- **Adaptive learning flow:** progressive node expansion, context propagation, and keyword-aware branching.
- **AI assistant:** MiniMax-powered contextual chat (`MiniMax-M2.5`) grounded by selected nodes and full tree context.
- **Streaming UX:** incremental response handling and resilient JSON recovery for partial outputs, reducing perceived latency.
- **Data model:** normalized nodes/edges with deterministic IDs to keep expansions reliable and merge-safe.

## Member Roles

Jax - Viber and Frontend Developer
Jasper - Viber and Data Pipeline
Mig - Viber and Education-text generation
Henry - Viber and Data Processing and Node Generation
George - Viber and Webscraping and Data Processing
