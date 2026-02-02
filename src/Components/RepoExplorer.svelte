<script lang="ts">
    import toast from 'svelte-french-toast';
    import { fly, fade, slide } from 'svelte/transition';

    import {
        Search,
        Github,
        CheckSquare,
        Square,
        Loader2,
        ChevronRight,
        ChevronDown,
        Folder,
        FolderOpen,
        FileCode,
        GitPullRequest,
        FileText,
        GitBranch,
        GitMerge,
        ArrowRightLeft,
        ExternalLink,
        Database
    } from 'lucide-svelte';
    import {
        parseRepoUrl,
        fetchRepoTree,
        fetchPullRequests,
        fetchBranches,
        compareBranches,
        type GitHubBranch,
        type BranchComparison,
        type GitHubFile,
        type PullRequest
    } from '../lib/github';
    import { onMount } from 'svelte';
    import { getSetting, saveSetting } from '../lib/storage';
    import { cn } from '../utils/cn';

    import { store as vectorStore } from '../lib/rag';
    import { fetchFileContent } from '../lib/github';

    type TreeNode = {
        name: string;
        path: string;
        type: 'blob' | 'tree';
        children?: TreeNode[];
        size?: number;
        originalFile?: GitHubFile;
    };

    type Tab = 'files' | 'prs';

    let {
        onSelectionChange,
        onUrlChange,
        onFileClick,
        onBranchCompare,
        selectedFiles,
        onPRSelect,
        selectedPR,
        activeTab,
        onTabChange
    } = $props<{
        onSelectionChange: (files: GitHubFile[]) => void;
        onUrlChange: (url: string) => void;
        onFileClick: (file: GitHubFile) => void;
        onBranchCompare: (data: BranchComparison | null, branches?: string[]) => void;
        onPRSelect: (pr: PullRequest | null) => void;
        selectedPR: PullRequest | null;
        selectedFiles: Set<string>;
        activeTab: 'files' | 'prs' | 'branches';
        onTabChange: (tab: 'files' | 'prs' | 'branches') => void;
    }>();

    let url = $state('');
    let loading = $state(false);
    let error = $state('');
    let mounted = $state(false);

    onMount(async () => {
        if (!url) {
            const stored = await getSetting('last_repo_url');
            if (stored) url = stored;
        }
        setTimeout(() => mounted = true, 50);
    });

    let files = $state<GitHubFile[]>([]);
    let filter = $state('');
    let expandedFolders = $state(new Set<string>());

    let pullRequests = $state<PullRequest[]>([]);

    let branches = $state<GitHubBranch[]>([]);
    let selectedBranchNames = $state<string[]>([]);
    let comparisonData = $state<BranchComparison | null>(null);

    const MAX_SELECTED_FILES = 4;

    const buildFileTree = (fileList: GitHubFile[]): TreeNode[] => {
        const root: TreeNode[] = [];

        fileList.forEach((file) => {
            const parts = file.path.split('/');
            let currentLevel = root;
            let currentPath = '';

            parts.forEach((part, index) => {
                currentPath = currentPath ? `${currentPath}/${part}` : part;
                const isFile = index === parts.length - 1;

                let node = currentLevel.find((n) => n.name === part);

                if (!node) {
                    node = {
                        name: part,
                        path: currentPath,
                        type: isFile ? 'blob' : 'tree',
                        children: isFile ? undefined : [],
                        size: isFile ? file.size : undefined,
                        originalFile: isFile ? file : undefined
                    };
                    currentLevel.push(node);
                }

                if (!isFile && node.children) {
                    currentLevel = node.children;
                }
            });
        });

        const sortNodes = (nodes: TreeNode[]) => {
            nodes.sort((a, b) => {
                if (a.type === b.type) return a.name.localeCompare(b.name);
                return a.type === 'tree' ? -1 : 1;
            });
            nodes.forEach((n) => {
                if (n.children) sortNodes(n.children);
            });
        };

        sortNodes(root);
        return root;
    };

    const loadRepoData = async () => {
        const repoInfo = parseRepoUrl(url);
        if (!repoInfo) {
            error = 'Invalid GitHub URL';
            return;
        }

        onUrlChange(url);
        loading = true;
        error = '';
        files = [];
        pullRequests = [];
        expandedFolders = new Set();

        try {
            const token = await getSetting('github_token');

            const [tree, prs] = await Promise.all([
                fetchRepoTree(repoInfo.owner, repoInfo.repo, token || undefined),
                fetchPullRequests(repoInfo.owner, repoInfo.repo, token || undefined)
            ]);

            files = tree;
            pullRequests = prs;
            saveSetting('last_repo_url', url);
        } catch (err: any) {
            error = err.message || 'Failed to fetch repo data';
        } finally {
            loading = false;
        }
    };

    const toggleFile = (file: GitHubFile) => {
        if (onFileClick) onFileClick(file);

        const newSelected = new Set(selectedFiles);

        if (newSelected.has(file.path)) {
            newSelected.delete(file.path);
        } else {
            if (newSelected.size >= MAX_SELECTED_FILES) {
                toast.error(`You can only select up to ${MAX_SELECTED_FILES} files.`);
                return;
            }
            newSelected.add(file.path);
        }

        const selectedFileObjects = files.filter((f) => newSelected.has(f.path));
        onSelectionChange(selectedFileObjects);
    };

    const toggleFolderSelection = (folderNode: TreeNode) => {
        const newSelected = new Set(selectedFiles);
        let addedCount = 0;

        const collectFiles = (node: TreeNode) => {
            if (newSelected.size >= MAX_SELECTED_FILES) return;

            if (node.type === 'blob' && node.originalFile) {
                if (!newSelected.has(node.path)) {
                    newSelected.add(node.path);
                    addedCount++;
                }
            } else if (node.children) {
                for (const child of node.children) {
                    collectFiles(child);
                    if (newSelected.size >= MAX_SELECTED_FILES) return;
                }
            }
        };

        collectFiles(folderNode);

        if (addedCount > 0) {
            const selectedFileObjects = files.filter((f) => newSelected.has(f.path));
            onSelectionChange(selectedFileObjects);
            if (newSelected.size === MAX_SELECTED_FILES) {
                toast('Selection limit reached (4 files)');
            }
        } else {
            if (newSelected.size >= MAX_SELECTED_FILES) {
                toast.error(`You can only select up to ${MAX_SELECTED_FILES} files.`);
            }
        }
    };

    const toggleFolder = (path: string) => {
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(path)) {
            newExpanded.delete(path);
        } else {
            newExpanded.add(path);
        }
        expandedFolders = newExpanded;
    };

    const loadBranches = async () => {
        const repoInfo = parseRepoUrl(url);
        if (!repoInfo) return;
        const token = await getSetting('github_token');
        branches = await fetchBranches(repoInfo.owner, repoInfo.repo, token || undefined);
    };

    const toggleBranch = async (branchName: string) => {
        const current = new Set(selectedBranchNames);

        if (current.has(branchName)) {
            current.delete(branchName);
            selectedBranchNames = [...current];
            comparisonData = null;
            onBranchCompare(null, []);
        } else {
            if (current.size >= 2) {
                toast.error('You can only compare 2 branches');
                return;
            }
            current.add(branchName);
            const newSelection = [...current];
            selectedBranchNames = newSelection;

            if (newSelection.length === 2) {
                await runComparison(newSelection[0], newSelection[1]);
            }
        }
    };

    const runComparison = async (base: string, head: string) => {
        const toastId = toast.loading(`Comparing ${base}...${head}`);
        try {
            const repoInfo = parseRepoUrl(url);
            if (!repoInfo) return;
            const token = await getSetting('github_token');

            const data = await compareBranches(
                repoInfo.owner,
                repoInfo.repo,
                base,
                head,
                token || undefined
            );
            comparisonData = data;
            onBranchCompare(data, [base, head]);

            toast.success(`Ahead by ${data.ahead_by}, Behind by ${data.behind_by}`, {
                id: toastId,
                duration: 4000
            });
        } catch (e: any) {
            toast.error(e.message, { id: toastId });
        }
    };

    $effect(() => {
        if (activeTab === 'branches' && branches.length === 0 && url) {
            loadBranches();
        }
    });

    let fileTree = $derived(buildFileTree(files));
    let filteredFiles = $derived(
        files.filter((f) => f.path.toLowerCase().includes(filter.toLowerCase()))
    );

    let isIndexing = $state(false);
    let indexProgress = $state('');

    const handleIndex = async () => {
        if (files.length === 0) return;

        const token = await getSetting('github_token');
        if (!token) {
            toast.error('Please set a GitHub Token in settings first to avoid rate limits.');
            return;
        }

        const ollamaUrl = (await getSetting('ollama_url')) || 'http://localhost:11434';

        try {
            const modelRes = await fetch(`${ollamaUrl}/api/tags`);
            const modelData = await modelRes.json();
            const modelName = modelData.models?.[0]?.name;

            if (!modelName) throw new Error('No Ollama models found.');
            vectorStore.configure(ollamaUrl, modelName);
        } catch (e) {
            toast.error('Could not connect to Ollama.');
            return;
        }

        isIndexing = true;
        toast.success('Started indexing codebase...');

        try {
            const repoInfo = parseRepoUrl(url);
            if (!repoInfo) throw new Error('Invalid Repo');

            const codeFiles = files.filter(
                (f) =>
                    /\.(ts|tsx|js|jsx|svelte|py|rs|go|java|c|cpp|h|css|html|md)$/.test(f.path) &&
                    !f.path.includes('node_modules') &&
                    !f.path.includes('dist/')
            );

            const targetFiles = codeFiles.slice(0, 30);
            let count = 0;

            for (const file of targetFiles) {
                indexProgress = `Indexing ${count + 1}/${targetFiles.length}`;
                try {
                    const content = await fetchFileContent(repoInfo.owner, repoInfo.repo, file.path, token);
                    await vectorStore.addDocument(file.path, content);
                    count++;
                } catch (e) {
                    console.warn(`Failed to index ${file.path}`);
                }
            }

            toast.success(`Indexed ${count} files for Smart Search!`);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            isIndexing = false;
            indexProgress = '';
        }
    };
</script>

{#snippet fileNode(node: TreeNode, depth: number)}
    <div class="w-full" transition:slide={{ duration: 150 }}>
        {#if node.type === 'tree'}
            {@const isExpanded = expandedFolders.has(node.path)}
            <div class="flex w-full items-center pr-2 transition-colors duration-200 hover:bg-blue-50/50">
                <button
                    onclick={() => toggleFolder(node.path)}
                    class="flex flex-1 items-center gap-1.5 px-2 py-1.5 text-left text-sm text-gray-700 transition-all duration-200 select-none"
                    style="padding-left: {depth * 12 + 8}px"
                >
                    <span class="transition-transform duration-200" class:rotate-90={isExpanded}>
                        <ChevronRight class="h-3 w-3 shrink-0 text-gray-400" />
                    </span>
                    {#if isExpanded}
                        <FolderOpen class="h-4 w-4 shrink-0 text-blue-500 transition-colors duration-200" />
                    {:else}
                        <Folder class="h-4 w-4 shrink-0 text-blue-400 transition-colors duration-200" />
                    {/if}
                    <span class="truncate font-serif text-xs font-medium">{node.name}</span>
                </button>

                <button
                    onclick={(e) => {
                        e.stopPropagation();
                        toggleFolderSelection(node);
                    }}
                    class="p-1 text-gray-300 transition-colors duration-200 hover:text-blue-500"
                    title="Select files in folder"
                >
                    <CheckSquare class="h-3.5 w-3.5" />
                </button>
            </div>

            {#if isExpanded && node.children}
                <div transition:slide={{ duration: 200 }}>
                    {#each node.children as child}
                        {@render fileNode(child, depth + 1)}
                    {/each}
                </div>
            {/if}
        {:else}
            {@const isSelected = selectedFiles.has(node.path)}
            <button
                onclick={() => node.originalFile && toggleFile(node.originalFile)}
                class={cn(
                    'flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm transition-all duration-200',
                    isSelected ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                )}
                style="padding-left: {depth * 12 + 20}px"
            >
                <span class="transition-transform duration-200" class:scale-110={isSelected}>
                    {#if isSelected}
                        <CheckSquare class="h-3.5 w-3.5 shrink-0 text-blue-600" />
                    {:else}
                        <Square class="h-3.5 w-3.5 shrink-0 text-gray-300" />
                    {/if}
                </span>
                <FileCode
                    class={cn('h-3.5 w-3.5 shrink-0 transition-colors duration-200', isSelected ? 'text-blue-500' : 'text-gray-400')}
                />
                <span class="flex-1 truncate font-mono text-[11px]">{node.name}</span>
                <span class="shrink-0 text-[9px] text-gray-400">
                    {node.size ? (node.size / 1024).toFixed(1) + 'kb' : ''}
                </span>
            </button>
        {/if}
    </div>
{/snippet}

<div class="flex h-full w-80 flex-col border-r border-gray-200 bg-white shadow-sm">
    <!-- Header / Search -->
    <div class="border-b border-blue-100 bg-gradient-to-b from-blue-50/50 to-white p-4">
        <div class="mb-3 flex gap-2">
            <input
                type="text"
                bind:value={url}
                placeholder="https://github.com/user/repo"
                class="flex-1 rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs shadow-sm outline-none transition-all duration-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                onkeydown={(e) => e.key === 'Enter' && loadRepoData()}
            />
            <button
                onclick={loadRepoData}
                disabled={loading}
                class="rounded-lg bg-gradient-to-b from-blue-600 to-blue-700 px-4 py-2 text-xs font-medium text-white shadow-sm transition-all duration-200 hover:from-blue-500 hover:to-blue-600 hover:shadow-md disabled:opacity-50"
            >
                {#if loading}
                    <Loader2 class="h-4 w-4 animate-spin" />
                {:else}
                    Load
                {/if}
            </button>
        </div>

        {#if error}
            <p class="mb-2 text-xs text-red-500" transition:fade={{ duration: 200 }}>{error}</p>
        {/if}

        <!-- Tabs -->
        <div class="mb-3 flex gap-1 rounded-lg bg-gray-100 p-1">
            {#each ['files', 'prs', 'branches'] as tab}
                <button
                    onclick={() => onTabChange(tab as 'files' | 'prs' | 'branches')}
                    class={cn(
                        'relative flex-1 rounded-md py-2 text-xs font-medium transition-all duration-200',
                        activeTab === tab 
                            ? 'bg-white text-blue-600 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700'
                    )}
                >
                    <div class="flex items-center justify-center gap-1.5">
                        {#if tab === 'files'}
                            <FileText class="h-3.5 w-3.5" />
							<span class="capitalize">{tab}</span>
							{:else if tab === 'prs'}
                            <GitPullRequest class="h-3.5 w-3.5" />
							<span class="">PRs</span>
                        {:else}
                            <GitBranch class="h-3.5 w-3.5" />
							<span class="capitalize">{tab}</span>
                        {/if}
                    </div>
                </button>
            {/each}
        </div>

        {#if activeTab === 'files' && files.length > 0}
            <div class="flex gap-2" transition:slide={{ duration: 200 }}>
                <div class="relative flex-1">
                    <Search class="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        bind:value={filter}
                        placeholder="Filter files..."
                        class="w-full rounded-lg border border-transparent bg-gray-100 py-2 pr-3 pl-9 text-sm transition-all duration-200 outline-none focus:border-blue-200 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    />
                </div>
                {#if selectedFiles.size > 0}
                    <button
                        onclick={() => onSelectionChange([])}
                        class="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 transition-all duration-200 hover:bg-red-100"
                        transition:fade={{ duration: 150 }}
                    >
                        Clear
                    </button>
                {/if}
            </div>
        {/if}
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-2">
        {#if files.length === 0 && !loading && pullRequests.length === 0}
            <div class="mt-10 px-4 text-center" transition:fade={{ duration: 300 }}>
                <Github class="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p class="font-serif text-sm text-gray-400">Enter a GitHub URL above to start.</p>
            </div>
        {:else if activeTab === 'files'}
            <div class="space-y-0.5">
                {#if filter}
                    {#each filteredFiles as file (file.path)}
                        {@const isSelected = selectedFiles.has(file.path)}
                        <button
                            onclick={() => toggleFile(file)}
                            class={cn(
                                'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-all duration-200',
                                isSelected ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-600 hover:bg-blue-50/50'
                            )}
                            transition:fly={{ y: 10, duration: 200 }}
                        >
                            {#if isSelected}
                                <CheckSquare class="h-4 w-4 shrink-0 text-blue-600" />
                            {:else}
                                <Square class="h-4 w-4 shrink-0 text-gray-300" />
                            {/if}
                            <span class="flex-1 truncate font-mono text-xs">{file.path}</span>
                        </button>
                    {/each}
                {:else}
                    {#each fileTree as node}
                        {@render fileNode(node, 0)}
                    {/each}
                {/if}
            </div>
        {:else if activeTab == 'prs'}
            <div class="space-y-2">
                {#if pullRequests.length === 0}
                    <div class="py-8 text-center" transition:fade={{ duration: 200 }}>
                        <GitPullRequest class="mx-auto mb-2 h-8 w-8 text-gray-300" />
                        <p class="font-serif text-sm text-gray-400">No open pull requests found.</p>
                    </div>
                {/if}

                {#each pullRequests as pr, i}
                    {@const isSelected = selectedPR?.id === pr.id}
                    <div
                        class={cn(
                            'group relative overflow-hidden rounded-xl border transition-all duration-300',
                            isSelected
                                ? 'border-blue-200 bg-gradient-to-r from-blue-50 to-white shadow-md'
                                : 'border-gray-100 hover:border-blue-200 hover:shadow-sm'
                        )}
                        transition:fly={{ y: 20, duration: 300, delay: i * 50 }}
                    >
                        <button
                            onclick={() => onPRSelect(isSelected ? null : pr)}
                            class="w-full p-4 pr-10 text-left"
                        >
                            <div class="mb-1.5 flex items-start gap-2">
                                <GitPullRequest
                                    class={cn(
                                        'mt-0.5 h-4 w-4 shrink-0 transition-colors duration-200',
                                        isSelected ? 'text-blue-600' : 'text-green-600'
                                    )}
                                />
                                <h3
                                    class={cn(
                                        'font-serif text-sm leading-tight font-semibold transition-colors duration-200',
                                        isSelected ? 'text-blue-800' : 'text-gray-800'
                                    )}
                                >
                                    {pr.title}
                                </h3>
                            </div>
                            <div class="flex items-center gap-2 pl-6 text-xs text-gray-500">
                                <span class="font-mono">#{pr.number}</span>
                                <span>•</span>
                                <span>{pr.user.login}</span>
                            </div>
                        </button>

                        <a
                            href={pr.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="absolute right-3 bottom-3 z-10 rounded-lg p-2 text-gray-400 transition-all duration-200 hover:bg-white hover:text-blue-600 hover:shadow-sm"
                            title="Open in GitHub"
                            onclick={(e) => e.stopPropagation()}
                        >
                            <ExternalLink class="h-3.5 w-3.5" />
                        </a>
                    </div>
                {/each}
            </div>
        {:else if activeTab === 'branches'}
            <div class="space-y-2">
                <div class="px-2 pb-2 font-serif text-xs text-gray-500">Select 2 branches to compare diffs.</div>

                {#each branches as branch, i}
                    {@const isSelected = selectedBranchNames.includes(branch.name)}
                    <button
                        onclick={() => toggleBranch(branch.name)}
                        class={cn(
                            'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-all duration-200',
                            isSelected
                                ? 'border-blue-200 bg-gradient-to-r from-blue-50 to-white text-blue-700 shadow-sm'
                                : 'border-gray-100 bg-white text-gray-700 hover:border-blue-100 hover:bg-blue-50/30'
                        )}
                        transition:fly={{ x: -20, duration: 200, delay: i * 30 }}
                    >
                        <span class="font-mono text-xs">{branch.name}</span>
                        <span class="transition-transform duration-200" class:scale-110={isSelected}>
                            {#if isSelected}
                                <CheckSquare class="h-4 w-4 text-blue-600" />
                            {:else}
                                <Square class="h-4 w-4 text-gray-300" />
                            {/if}
                        </span>
                    </button>
                {/each}

                {#if comparisonData}
                    <div class="mt-4 overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-b from-blue-50/50 to-white p-4 shadow-sm" transition:slide={{ duration: 300 }}>
                        <div class="mb-3 flex items-center gap-2 font-serif text-sm font-semibold text-gray-700">
                            <ArrowRightLeft class="h-4 w-4 text-blue-600" />
                            Comparison Result
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div class="rounded-lg border border-green-100 bg-white p-3 text-center shadow-sm">
                                <div class="text-xl font-bold text-green-600">+{comparisonData.ahead_by}</div>
                                <div class="font-serif text-xs text-gray-500">Ahead</div>
                            </div>
                            <div class="rounded-lg border border-red-100 bg-white p-3 text-center shadow-sm">
                                <div class="text-xl font-bold text-red-500">-{comparisonData.behind_by}</div>
                                <div class="font-serif text-xs text-gray-500">Behind</div>
                            </div>
                        </div>
                        <div class="mt-3 text-center font-serif text-xs text-gray-500">
                            {comparisonData.files.length} changed files
                        </div>
                    </div>
                {/if}
            </div>
        {/if}
    </div>

    <div class="flex justify-between border-t border-gray-100 bg-gradient-to-b from-white to-gray-50 p-3 font-serif text-xs text-gray-500">
        <span>
            {#if activeTab === 'files'}
                {selectedFiles.size} files selected
            {:else}
                {pullRequests.length} open PRs
            {/if}
        </span>
    </div>
</div>

<style>
    :global(.font-serif) {
        font-family: 'Source Serif 4', Georgia, serif;
    }
</style>
