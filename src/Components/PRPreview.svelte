<script lang="ts">
    import { onMount } from 'svelte';
    import { Loader2, FileDiff, GitCommit, User } from 'lucide-svelte';
    import {
        fetchPullRequestFiles,
        parseRepoUrl,
        type PullRequest,
        type PRFile
    } from '../lib/github';
    import { getSetting } from '../lib/storage';

    let { pr, repoUrl } = $props<{
        pr: PullRequest;
        repoUrl: string;
    }>();

    let loading = $state(false);
    let files = $state<PRFile[]>([]);
    let error = $state('');

    const loadFiles = async () => {
        loading = true;
        error = '';
        try {
            const repoInfo = parseRepoUrl(repoUrl);
            if (!repoInfo) throw new Error('Invalid URL');
            const token = await getSetting('github_token');
            files = await fetchPullRequestFiles(
                repoInfo.owner,
                repoInfo.repo,
                pr.number,
                token || undefined
            );
        } catch (e: any) {
            error = e.message;
        } finally {
            loading = false;
        }
    };

    $effect(() => {
        if (pr) loadFiles();
    });
</script>

<div class="flex h-full flex-col overflow-hidden bg-white" style="max-width: calc(100vw - 20rem);">
    <div class="border-b border-gray-200 bg-gray-50 p-4">
        <h2 class="flex items-center gap-2 text-lg font-bold text-gray-800">
            <GitCommit class="h-5 w-5 text-blue-600" />
            <span>PR #{pr.number}: {pr.title}</span>
        </h2>
        <div class="mt-1 flex items-center gap-2 text-xs text-gray-500">
            <User class="h-3 w-3" />
            {pr.user.login}
            <span>•</span>
            Created on {new Date(pr.created_at).toLocaleDateString()}
        </div>
    </div>

    <div class="flex-1 overflow-y-auto bg-gray-100 p-4">
        {#if loading}
            <div class="flex justify-center p-8">
                <Loader2 class="h-6 w-6 animate-spin text-gray-400" />
            </div>
        {:else if error}
            <div class="p-4 text-center text-red-500">{error}</div>
        {:else}
            <div class="space-y-4">
                {#each files as file}
                    <div class="overflow-hidden rounded-lg border border-stone-300 bg-stone-100 shadow-sm">
                        <div
                            class="flex items-center justify-between border-b border-stone-300 bg-stone-200 px-3 py-2"
                        >
                            <code class="flex items-center gap-2 font-mono text-xs font-bold text-gray-800">
                                <FileDiff class="h-3.5 w-3.5 text-gray-800" />
                                {file.filename}
                            </code>
                            <code class="font-mono text-[10px]">
                                <span class="text-green-600">+{file.additions}</span>
                                <span class="mx-1 text-gray-300">|</span>
                                <span class="text-red-500">-{file.deletions}</span>
                            </code>
                        </div>
                        {#if file.patch}
                            <div class="flex flex-col bg-stone-100">
                                {#each file.patch.split('\n') as line, i}
                                    <div
                                        class="flex justify-between overflow-x-auto bg-transparent font-mono text-[10px] leading-tight text-slate-200"
                                    >
                                        <code
                                            class={`z-999 w-full px-4 py-0.5 font-mono whitespace-pre-wrap ${
                                                line.startsWith('+')
                                                    ? 'block border-l border-l-[#3fb950] bg-green-600/15 text-green-800'
                                                    : line.startsWith('-')
                                                        ? 'block border-l border-[#f85149] bg-[rgba(248,81,73,0.15)] text-[#90312a]'
                                                        : 'bg-stone-100 pl-4.5 text-stone-800'
                                            }`}
                                        >
                                            {line}
                                        </code>
                                        <code
                                            class={`flex items-center pr-1 font-mono ${
                                                line.startsWith('+')
                                                    ? 'bg-green-600/15 text-green-800/60'
                                                    : line.startsWith('-')
                                                        ? 'bg-[rgba(248,81,73,0.15)] text-[#90312a]/60'
                                                        : 'text-stone-800/60 hover:text-stone-800/90'
                                            }`}
                                        >
                                            {i}
                                        </code>
                                    </div>
                                {/each}
                            </div>
                        {:else}
                            <div class="p-4 text-center text-xs text-gray-400 italic">
                                Binary file or too large to show diff.
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>
