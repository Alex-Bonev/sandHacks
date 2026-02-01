<script lang="ts">
  import { GitCommit, Calendar, User, FileDiff, ArrowRight, ArrowLeft, Clock } from 'lucide-svelte';
  import type { BranchComparison } from '../lib/github';

  let { comparison, baseBranch, headBranch } = $props<{ 
    comparison: BranchComparison | null,
    baseBranch: string,
    headBranch: string
  }>();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
</script>

<div class="h-full bg-white flex flex-col overflow-hidden">
  {#if !comparison}
    <div class="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
      <div class="p-4 bg-gray-50 rounded-full mb-4">
        <GitCommit class="w-8 h-8 opacity-50" />
      </div>
      <p>Select two branches to view comparison data.</p>
    </div>
  {:else}
    <!-- Summary Header -->
    <div class="p-6 border-b border-gray-200 bg-gray-50 shrink-0">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <div class="px-3 py-1.5 bg-gray-200 rounded text-sm font-mono font-medium text-gray-700">
            {baseBranch}
          </div>
          <ArrowRight class="w-4 h-4 text-gray-400" />
          <div class="px-3 py-1.5 bg-blue-100 text-blue-800 rounded text-sm font-mono font-medium">
            {headBranch}
          </div>
        </div>
        <div class="text-xs text-gray-500 font-medium px-3 py-1 bg-white border rounded-full shadow-sm">
           {comparison.status}
        </div>
      </div>

      <div class="grid grid-cols-3 gap-4">
        <!-- Ahead Stats -->
        <div class="bg-white p-4 rounded-lg border border-green-100 shadow-sm">
          <div class="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Ahead By</div>
          <div class="flex items-baseline gap-2">
            <span class="text-2xl font-bold text-green-600">{comparison.ahead_by}</span>
            <span class="text-xs text-gray-400">commits</span>
          </div>
        </div>
        
        <!-- Behind Stats -->
        <div class="bg-white p-4 rounded-lg border border-red-100 shadow-sm">
           <div class="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Behind By</div>
           <div class="flex items-baseline gap-2">
             <span class="text-2xl font-bold text-red-600">{comparison.behind_by}</span>
             <span class="text-xs text-gray-400">commits</span>
           </div>
        </div>
        
        <!-- File Stats -->
        <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
           <div class="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Changes</div>
           <div class="flex items-baseline gap-2">
             <span class="text-2xl font-bold text-gray-800">{comparison.files.length}</span>
             <span class="text-xs text-gray-400">files changed</span>
           </div>
        </div>
      </div>
    </div>

    <!-- Scrollable Content -->
    <div class="flex-1 overflow-y-auto">
      
      <!-- Recent Commits Table -->
      <div class="p-6">
        <h3 class="text-sm font-bold text-gray-800 flex items-center gap-2 mb-4">
          <Clock class="w-4 h-4 text-blue-600" />
          Recent Commits (Ahead)
        </h3>
        
        <div class="border border-gray-200 rounded-lg overflow-hidden shadow-sm bg-white">
          <table class="w-full text-sm text-left">
            <thead class="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
              <tr>
                <th class="px-4 py-3 w-2/3">Message</th>
                <th class="px-4 py-3">Author</th>
                <th class="px-4 py-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              {#if comparison.commits.length === 0}
                <tr>
                  <td colspan="3" class="px-4 py-8 text-center text-gray-400 italic">
                    No new commits in this range.
                  </td>
                </tr>
              {:else}
                {#each comparison.commits as commit}
                  <tr class="hover:bg-blue-50/50 transition-colors group">
                    <td class="px-4 py-3 align-top">
                      <div class="font-medium text-gray-800 line-clamp-1 group-hover:text-blue-700">
                        {commit.commit.message.split('\n')[0]}
                      </div>
                      <div class="text-xs text-gray-400 font-mono mt-0.5">
                        {commit.sha.substring(0, 7)}
                      </div>
                    </td>
                    <td class="px-4 py-3 align-top">
                      <div class="flex items-center gap-2">
                        {#if commit.author?.avatar_url}
                          <img src={commit.author.avatar_url} alt="" class="w-5 h-5 rounded-full" />
                        {:else}
                          <div class="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                             <User class="w-3 h-3 text-gray-500" />
                          </div>
                        {/if}
                        <span class="text-gray-700 text-xs">{commit.commit.author.name}</span>
                      </div>
                    </td>
                    <td class="px-4 py-3 align-top text-right text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(commit.commit.author.date)}
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Changed Files Summary -->
      <div class="px-6 pb-6">
        <h3 class="text-sm font-bold text-gray-800 flex items-center gap-2 mb-4">
          <FileDiff class="w-4 h-4 text-purple-600" />
          Files Changed
        </h3>
        
        <div class="border border-gray-200 rounded-lg overflow-hidden shadow-sm bg-white">
           {#each comparison.files.slice(0, 10) as file}
             <div class="px-4 py-2 border-b border-gray-100 last:border-0 flex items-center justify-between hover:bg-gray-50">
                <span class="text-xs font-mono text-gray-700 truncate max-w-[70%]">
                  {file.filename}
                </span>
                <div class="text-[10px] font-mono flex items-center gap-2">
                   <span class="text-green-600">+{file.additions}</span>
                   <span class="text-red-500">-{file.deletions}</span>
                </div>
             </div>
           {/each}
           {#if comparison.files.length > 10}
              <div class="px-4 py-2 bg-gray-50 text-xs text-gray-500 text-center border-t border-gray-200">
                 + {comparison.files.length - 10} more files...
              </div>
           {/if}
        </div>
      </div>

    </div>
  {/if}
</div>