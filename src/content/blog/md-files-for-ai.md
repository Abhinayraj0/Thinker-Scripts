---
title: "MD files for AI"
description: "Explained what are Skills.md, Design.md, Agents.md and some more to get the best out of AI chatbots."
publishedAt: 2026-06-07
type: "Deep-Dive"
categories: ["Technology"]
tags: []
readingMinutes: 7
---

Shift from viewing documentation as "notes for yourself" to viewing it as **"Infrastructure for AI Orchestration."**

Here is your study roadmap. It moves from foundational concepts to advanced implementation.

### Phase 1: Understand "Machine-Readable" Design

The most critical mistake is writing documentation that _only_ humans can understand. AI agents need **explicit, structured, and modular** information.

- **What to Study:**
    
    - **The "Chunking" Concept:** Learn why AI models process text in small, discrete blocks. (Search: _“LLM RAG Retrieval Chunking Best Practices”_)
        
    - **Context Management:** Learn how "long-term memory" (files) interacts with "short-term memory" (the current chat). (Search: _“Managing LLM Context Windows Effectively”_)
        
- **Key Source:** [Addy Osmani’s Guide to Writing Specs for AI Agents](https://addyosmani.com/blog/good-spec/) — This is the gold standard for "Vibe Coding" architecture.
    

### Phase 2: Mastering the "Big Three" Artifacts

Don't just read about them; study how they are implemented in open-source projects.

- **`AGENTS.md` (Instructions):**
    
    - **Study:** Look at how open-source agent projects define their system instructions.
        
    - **Action:** Go to GitHub and search for repositories that contain a `CLAUDE.md` or `INSTRUCTIONS.md` file (these are identical to `AGENTS.md`).
        
- **`design.md` (Architecture):**
    
    - **Study:** Learn "Vertical Slice Architecture." It’s the best way to organize code for agents because it keeps related logic together, making it easier for an AI to find the right file.
        
- **`skill.md` (Patterns/Wisdom):**
    
    - **Study:** Look into "Pattern Languages" in software engineering. `skill.md` is essentially a personal library of patterns you have proven work for your agents.
        

### Phase 3: Advanced Architectures (The "Deep" Stuff)

Once you master the basics, move to these professional workflows:

- **Architectural Decision Records (ADRs):**
    
    - **The Concept:** An ADR is a formal document that records a decision and, crucially, the **trade-offs** you accepted.
        
    - **Study Resource:** [GitHub’s ADR Organization](https://adr.github.io/) and the [AWS Prescriptive Guidance on ADRs](https://aws.amazon.com/blogs/architecture/master-architecture-decision-records-adrs-best-practices-for-effective-decision-making/).
        
- **Machine-Readable Specs:**
    
    - **The Concept:** Moving beyond text. Using formats like OpenAPI for APIs or Mermaid diagrams for data flow.
        
    - **Study:** Search for _"Using Mermaid.js for AI Agent Context"_ to learn how to help an agent "visualize" your system state.
        

### Phase 4: Your Daily Study Routine

To actually become an expert, apply this to your chess project immediately:

1. **The "Audit" Habit:** Every time your agent writes a block of code, ask yourself: _"If I were an AI with no memory of our conversation, would this code make sense based on my `design.md`?"_ If the answer is no, update `design.md`.
    
2. **The "Failure" Entry:** When your chess tool fails, spend 5 minutes documenting the **specific root cause** in `skill.md`. This is the single fastest way to "level up" your agent's capability.
    
3. **Active Discovery:** Use GitHub search to find projects that use `AGENTS.md`. Open their `AGENTS.md` file and read it. **Why did they include those specific instructions?** Steal the ones that make sense to you.


###  Phase 6: Difference

**`skill.md`** and **`design.md`** are completely different in purpose, structure, and usage.
Think of it this way: **`design.md` is about how your project _looks_ and feels**, while **`skill.md` is about how your project _thinks_ and executes tasks.**

### 1. `design.md`: The "Visual Spec"

- **Purpose:** It defines the **User Interface (UI) and Design System**.
    
- **What it does:** It tells the AI exactly what colors, fonts, spacing, and component styles to use. Instead of letting the AI guess what "modern" or "professional" looks like, `design.md` gives it a rigid set of rules and "design tokens" (hex codes, spacing values, etc.).
    
- **Why it’s unique:** It focuses on **visual consistency**. It ensures every button, card, and layout the AI builds looks like it belongs in the same app.
    
- **Key takeaway:** If you want your app to have a specific "vibe" or branding, you put those instructions in `design.md`.
    

### 2. `skill.md`: The "Expert Procedure"

- **Purpose:** It defines **reusable workflows and domain-specific expertise**.
    
- **What it does:** It acts as a "recipe book" for the AI. If you have a task that you repeat often (e.g., "Refactor a Python function," "Deploy to production," or "Debug a chess FEN string"), you package those steps into a `skill.md`.
    
- **Why it’s unique:** It focuses on **procedural execution**. It tells the AI: "When you are doing _this specific task_, follow these exact steps to ensure it’s done correctly every time."
    
- **Key takeaway:** If you want your AI to act like a senior engineer who knows your "best practices," you put those methods in `skill.md`.
    
### How they work together (The "Vibe" Advantage)

When you combine them, you gain total control over your AI agents:

1. When the agent builds a UI, it reads **`design.md`** to ensure it matches your aesthetic.
    
2. When the agent writes logic (like your chess evaluation function), it reads **`skill.md`** to ensure it follows the "best practice" way you’ve defined for that specific task.
    

**One file ensures your project doesn't look like "AI slop," and the other ensures it doesn't  act like "AI slop."**

--------------------------------------------------------------------------
### Phase 6: Some more md files

Beyond the foundational trio of `AGENTS.md`, `design.md`, and `skill.md`, the ecosystem of AI-orchestrated development relies on files that govern **consistency, rationale, and state**.
### 1. `decisions.md` (Architectural Decision Records - ADRs)

- **Purpose:** Documents the "Why."
    
- **What it does:** It records major technical choices (e.g., "Why we chose Stockfish over another engine" or "Why we structured the board state this way").
    
- **Why use it:** AI agents often "drift" or propose changes that contradict your original goals. If the agent proposes a change that violates a documented decision, you can point it to this file to correct it immediately.
    
- **Structure:** Title, Status (Proposed/Accepted/Deprecated), Context (the problem), Decision (the choice), and Consequences (the trade-offs).
    

### 2. `conventions.md` (The Style Guide)

- **Purpose:** Ensures consistent coding quality.
    
- **What it does:** It sets strict rules for the codebase, such as naming conventions (`snake_case` vs. `camelCase`), how to handle errors, how to structure docstrings, and which libraries are permitted.
    
- **Why use it:** It prevents the AI from being "creative" in ways that make your code messy or hard to maintain. It enforces professional-grade uniformity across your entire project.
    

### 3. `plan.md` (The Living Roadmap)

- **Purpose:** Tracks "What is left to do."
    
- **What it does:** It acts as a backlog. It breaks down your high-level project vision into small, bite-sized tasks.
    
- **Why use it:** AI agents perform best when they have a clear, focused mission. Instead of saying "Build the chess app," you say "Look at `plan.md` and complete the next task in the 'To-Do' list."
    

### 4. `context.md` (The "Save Game" File)

- **Purpose:** Maintains continuity across sessions.
    
- **What it does:** At the end of every coding session, you (or the agent) write a brief summary of the project’s status: _“We successfully implemented FEN parsing, but the evaluation function is still returning 0 for end-games. Next focus: Debugging the evaluation loop.”_
    
- **Why use it:** It prevents the agent from losing track of current blocking issues, especially if you take a break for a day or two.
    

### 5. `error_log.md` (The "Lessons Learned")

- **Purpose:** Prevents repeated failures.
    
- **What it does:** A simple list of bugs you've encountered and exactly how they were fixed.
    
- **Why use it:** AI agents tend to "hallucinate" fixes they've already tried and failed at. This file forces the agent to look at what _didn't_ work so it can move on to new solutions.
    

### 6. `llms.txt` (The AI Navigator)

- **Purpose:** Standardized interface for AI ingestion.
    
- **What it does:** This is a modern convention. It is essentially a "sitemap for AI." It tells an AI agent which files are the most important to read first and where to find your core documentation.
    
- **Why use it:** It makes your project "AI-native." By placing this file in the root of your `docs/` folder, you ensure that any agent you use in the future can instantly understand the structure and priorities of your codebase.
    

### Study Strategy: The "Audit" Method

To learn these effectively, don't just read about them—**build them iteratively.**

1. **Start with `conventions.md`:** Write down three rules you always want your code to follow (e.g., "Always use type hinting," "All errors must be logged"). See how the AI's output changes when you include this file in its context.
    
2. **Create `plan.md`:** Take your current chess project, break it into 5 distinct steps, and list them in this file. Next time you open your terminal, tell the AI to "Read `plan.md` and tell me what the next step is."
    
3. **Reflect with `decisions.md`:** Every time you make a big change to how your chess engine works, force yourself to write one paragraph in `decisions.md` explaining why.
