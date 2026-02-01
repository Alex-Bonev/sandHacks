<script lang="ts">
  import { GitBranch, GitCommit, ArrowRight, ArrowLeft } from 'lucide-svelte';
  import type { BranchComparison } from '../lib/github';

  let { comparison, baseBranch, headBranch } = $props<{ 
    comparison: BranchComparison | null,
    baseBranch: string,
    headBranch: string
  }>();
</script>

<div class="h-full bg-slate-900 text-white p-6 flex flex-col items-center justify-center relative overflow-hidden">
  <!-- Background Pattern -->
  <div class="absolute inset-0 opacity-5 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>

  {#if !comparison}
    <div class="text-slate-400 text-sm flex flex-col items-center gap-3 z-10">
      <div class="p-3 bg-slate-800 rounded-full">
         <GitBranch class="w-6 h-6" />
      </div>
      <p>Select two branches to visualize their relationship.</p>
    </div>
  {:else}
    <div class="w-full max-w-lg z-10 flex flex-col gap-8">
      
      <!-- Graph Visualization -->
      <div class="relative h-40 w-full">
         <svg class="w-full h-full" viewBox="0 0 400 160">
            <!-- Main Line -->
            <path d="M 20 80 L 380 80" stroke="#334155" stroke-width="4" stroke-linecap="round" />
            
            <!-- Base Branch Curve (Bottom) -->
            {#if comparison.behind_by > 0}
              <path d="M 60 80 C 60 80, 100 140, 200 140 L 340 140" stroke="#ef4444" stroke-width="3" fill="none" stroke-dasharray="6 4" />
              <circle cx="200" cy="140" r="4" fill="#ef4444" />
            {/if}

            <!-- Head Branch Curve (Top) -->
            {#if comparison.ahead_by > 0}
              <path d="M 60 80 C 60 80, 100 20, 200 20 L 340 20" stroke="#22c55e" stroke-width="3" fill="none" />
              <circle cx="200" cy="20" r="4" fill="#22c55e" />
            {/if}

            <!-- Common Ancestor -->
            <circle cx="60" cy="80" r="6" fill="#3b82f6" stroke="#1e293b" stroke-width="2" />
         </svg>
         
         <!-- Labels Overlay -->
         <div class="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between py-1">
            <!-- Ahead Label -->
            <div class="flex justify-center -mt-1">
               <span class="bg-green-900/80 text-green-200 text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm border border-green-700/50">
                  {headBranch} is ahead by {comparison.ahead_by}
               </span>
            </div>
            
            <!-- Behind Label -->
            <div class="flex justify-center -mb-1 mt-auto">
               <span class="bg-red-900/80 text-red-200 text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm border border-red-700/50">
                  {baseBranch} is behind by {comparison.behind_by}
               </span>
            </div>
         </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-2 gap-4">
         <div class="bg-slate-800/50 border border-slate-700 p-4 rounded-xl flex flex-col items-center">
            <span class="text-3xl font-bold text-green-400">+{comparison.ahead_by}</span>
            <span class="text-xs text-slate-400 uppercase tracking-wider mt-1 flex items-center gap-1">
              Commits Ahead <ArrowRight class="w-3 h-3" />
            </span>
         </div>
         
         <div class="bg-slate-800/50 border border-slate-700 p-4 rounded-xl flex flex-col items-center">
            <span class="text-3xl font-bold text-red-400">-{comparison.behind_by}</span>
            <span class="text-xs text-slate-400 uppercase tracking-wider mt-1 flex items-center gap-1">
              <ArrowLeft class="w-3 h-3" /> Commits Behind
            </span>
         </div>
      </div>

      <!-- File Stat -->
      <div class="text-center">
         <div class="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg text-sm text-slate-300 border border-slate-700">
            <GitCommit class="w-4 h-4 text-blue-400" />
            <span>{comparison.files.length} changed files in this range</span>
         </div>
      </div>

    </div>
  {/if}
</div>