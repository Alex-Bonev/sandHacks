<script lang="ts">
    import { fly, fade, slide } from 'svelte/transition';
    import {
        FolderInput,
        ShieldCheck,
        AlertTriangle,
        AlertOctagon,
        Info,
        Play,
        Loader2,
        CheckCircle,
        ChevronDown,
        ChevronRight,
        FileCode,
        Trash2
    } from 'lucide-svelte';
    import { streamChat, type ChatMessage } from '../lib/ollama';
    import { onMount } from 'svelte';
    import toast from 'svelte-french-toast';
    import { cn } from '../utils/cn';

    let { selectedModel } = $props<{ selectedModel: string }>();

    type Severity = 'critical' | 'high' | 'medium' | 'low';

    type Vulnerability = {
        id: string;
        file: string;
        line: number;
        severity: Severity;
        description: string;
        recommendation: string;
        codeSnippet?: string;
    };

    type ScanFile = {
        path: string;
        content: string;
        status: 'pending' | 'scanning' | 'done' | 'error';
    };

    let files = $state<ScanFile[]>([]);
    let vulnerabilities = $state<Vulnerability[]>([]);
    let isScanning = $state(false);
    let progress = $state({ current: 0, total: 0 });
    let abortController = $state<AbortController | null>(null);
    let ollamaUrl = $state('http://localhost:11434');
    let mounted = $state(false);

    let expandedVulns = $state<Set<string>>(new Set());
    let filterSeverity = $state<Severity | 'all'>('all');

    let filteredVulns = $derived(
        filterSeverity === 'all'
            ? vulnerabilities
            : vulnerabilities.filter((v) => v.severity === filterSeverity)
    );

    let counts = $derived({
        critical: vulnerabilities.filter((v) => v.severity === 'critical').length,
        high: vulnerabilities.filter((v) => v.severity === 'high').length,
        medium: vulnerabilities.filter((v) => v.severity === 'medium').length,
        low: vulnerabilities.filter((v) => v.severity === 'low').length
    });

    onMount(() => {
        setTimeout(() => mounted = true, 50);
    });

    const toggleExpand = (id: string) => {
        const newSet = new Set(expandedVulns);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        expandedVulns = newSet;
    };

    const scanFile = async (file: ScanFile, signal: AbortSignal) => {
        if (!selectedModel) throw new Error('No model');
        file.status = 'scanning';
        files = [...files];

        try {
            const systemPrompt = `You are a Cyber Security Expert Auditor.
       Analyze the provided code for security vulnerabilities (Hardcoded Secrets, XSS, SQL Injection, RCE, Insecure Configs).
       
       Output strict JSON format ONLY. No markdown. No conversational text.
       Format:
       [
         {
           "severity": "critical" | "high" | "medium" | "low",
           "line": <line_number>,
           "description": "<short description>",
           "recommendation": "<fix>"
         }
       ]
       If no issues, output [].`;

            const messages: ChatMessage[] = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `File: ${file.path}\nCode:\n${file.content}` }
            ];

            let fullResponse = '';
            await streamChat(
                ollamaUrl,
                selectedModel,
                messages,
                (chunk) => {
                    fullResponse += chunk;
                },
                signal
            );

            if (signal.aborted) return;

            let jsonStr = fullResponse.trim();
            jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '');

            try {
                const findings = JSON.parse(jsonStr);
                if (Array.isArray(findings)) {
                    const newVulns = findings.map((f: any) => ({
                        id: Math.random().toString(36).substr(2, 9),
                        file: file.path,
                        line: f.line || 0,
                        severity: (f.severity || 'low').toLowerCase(),
                        description: f.description || 'Unknown Issue',
                        recommendation: f.recommendation || 'Check code manually',
                        codeSnippet: getLineContext(file.content, f.line || 0)
                    }));
                    vulnerabilities = [...vulnerabilities, ...newVulns];
                }
            } catch (e) {
                console.warn(`Failed to parse security report for ${file.path}`, e);
            }

            file.status = 'done';
        } catch (e) {
            file.status = 'error';
        } finally {
            files = [...files];
        }
    };

    const getLineContext = (content: string, line: number) => {
        if (!line) return '';
        const lines = content.split('\n');
        const idx = line - 1;
        const start = Math.max(0, idx - 2);
        const end = Math.min(lines.length, idx + 3);
        return lines.slice(start, end).join('\n');
    };

    const runScan = async () => {
        if (files.length === 0) return toast.error('No files');
        if (!selectedModel) return toast.error('Select a model');

        isScanning = true;
        vulnerabilities = [];
        progress = { current: 0, total: files.length };

        files.forEach((f) => (f.status = 'pending'));
        files = [...files];

        abortController = new AbortController();

        for (const file of files) {
            if (abortController.signal.aborted) break;
            await scanFile(file, abortController.signal);
            progress.current++;
        }

        isScanning = false;
        abortController = null;
        toast.success('Security Scan Complete');
    };

    const stopScan = () => {
        if (abortController) {
            abortController.abort();
            abortController = null;
            isScanning = false;
            toast('Scan stopped');
        }
    };

    const handleFolderSelect = async (e: Event) => {
        const input = e.target as HTMLInputElement;
        if (!input.files?.length) return;

        const newFiles: ScanFile[] = [];
        const ignorePatterns = ['node_modules', '.git', 'dist', 'build', '.lock', '.png', '.jpg'];
        const validExts = /\.(ts|tsx|js|jsx|py|go|rs|java|c|cpp|php|rb|html|env|json|yaml|xml)$/;

        for (let i = 0; i < input.files.length; i++) {
            const file = input.files[i];
            const path = file.webkitRelativePath || file.name;

            if (files.some((f) => f.path === path)) continue;
            if (ignorePatterns.some((p) => path.includes(p))) continue;
            if (!validExts.test(path)) continue;

            const text = await file.text();
            newFiles.push({ path, content: text, status: 'pending' });
        }

        files = [...files, ...newFiles];
        toast.success(`Added ${newFiles.length} files`);
        input.value = '';
    };

    const clearFiles = () => {
        files = [];
        vulnerabilities = [];
        toast.success('Cleared file list');
    };
</script>

<div class="flex h-full flex-col bg-gradient-to-b from-blue-50/30 to-white">
    <!-- Header -->
    {#if mounted}
        <div class="border-b border-blue-100 bg-white p-6 shadow-sm" transition:fly={{ y: -20, duration: 400 }}>
            <div class="mx-auto flex max-w-6xl flex-col gap-6">
                <div class="flex items-start justify-between">
                    <div>
                        <h1 class="flex items-center gap-3 font-serif text-2xl font-bold text-gray-800">
                            <div class="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-2.5 text-white shadow-lg">
                                <ShieldCheck class="h-6 w-6" />
                            </div>
                            Security Scan
                        </h1>
                        <p class="mt-2 font-serif text-sm text-gray-500">
                            Offline static analysis. Detect secrets and vulnerabilities without uploading code.
                        </p>
                    </div>

                    <div class="flex gap-3">
                        {#if counts.critical > 0}
                            <div
                                class="flex items-center gap-1.5 rounded-full bg-red-50 px-4 py-2 text-xs font-bold text-red-700 shadow-sm ring-1 ring-red-100"
                                transition:fly={{ x: 20, duration: 300 }}
                            >
                                <AlertOctagon class="h-3.5 w-3.5" />
                                {counts.critical} Critical
                            </div>
                        {/if}
                        {#if counts.high > 0}
                            <div
                                class="flex items-center gap-1.5 rounded-full bg-orange-50 px-4 py-2 text-xs font-bold text-orange-700 shadow-sm ring-1 ring-orange-100"
                                transition:fly={{ x: 20, duration: 300, delay: 100 }}
                            >
                                <AlertTriangle class="h-3.5 w-3.5" />
                                {counts.high} High
                            </div>
                        {/if}
                    </div>
                </div>

                <div class="flex items-end gap-4">
                    <div class="flex-1">
                        <label class="mb-2 flex justify-between font-serif text-sm font-medium text-gray-700">
                            <span>Target Folder</span>
                            {#if files.length > 0}
                                <button
                                    onclick={clearFiles}
                                    class="flex items-center gap-1 text-xs text-red-500 transition-colors duration-200 hover:text-red-700"
                                >
                                    <Trash2 class="h-3 w-3" /> Clear
                                </button>
                            {/if}
                        </label>
                        <div class="group relative">
                            <div
                                class="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 bg-white p-4 transition-all duration-300 hover:border-blue-300 hover:bg-blue-50/30 hover:shadow-sm"
                            >
                                <FolderInput class="h-5 w-5 text-blue-400" />
                                <span class="font-serif text-sm text-gray-500">
                                    {files.length > 0
                                        ? `${files.length} files queued for scan`
                                        : 'Click to select folder...'}
                                </span>
                                <input
                                    type="file"
                                    webkitdirectory
                                    multiple
                                    class="absolute inset-0 cursor-pointer opacity-0"
                                    onchange={handleFolderSelect}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        onclick={isScanning ? stopScan : runScan}
                        disabled={!isScanning && (files.length === 0 || !selectedModel)}
                        class={cn(
                            'flex min-w-[160px] items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold shadow-sm transition-all duration-300',
                            isScanning
                                ? 'bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100'
                                : 'bg-gradient-to-b from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600 hover:shadow-md disabled:opacity-50'
                        )}
                    >
                        {#if isScanning}
                            <Loader2 class="h-4 w-4 animate-spin" /> Stop
                        {:else}
                            <Play class="h-4 w-4" /> Start Scan
                        {/if}
                    </button>
                </div>

                {#if isScanning || progress.total > 0}
                    <div transition:slide={{ duration: 200 }}>
                        <div class="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                            <div
                                class="h-2 bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out"
                                style="width: {(progress.current / Math.max(progress.total, 1)) * 100}%"
                            ></div>
                        </div>
                        <div class="mt-2 flex justify-between font-serif text-xs text-gray-400">
                            <span>Scanned {progress.current} of {progress.total} files</span>
                            <span>{Math.round((progress.current / Math.max(progress.total, 1)) * 100)}%</span>
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    {/if}

    <!-- Content -->
    <div class="mx-auto flex w-full max-w-6xl flex-1 gap-6 overflow-hidden p-6">
        <!-- Filters / Sidebar -->
        {#if mounted}
            <div class="w-64 shrink-0 space-y-2" transition:fly={{ x: -30, duration: 400, delay: 100 }}>
                <div class="mb-3 font-serif text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Filter Severity
                </div>

                {#each ['all', 'critical', 'high', 'medium', 'low'] as sev, i}
                    <button
                        onclick={() => (filterSeverity = sev as any)}
                        class={cn(
                            'flex w-full justify-between rounded-xl px-4 py-3 text-left font-serif text-sm font-medium capitalize transition-all duration-200',
                            filterSeverity === sev
                                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-blue-100'
                                : 'text-gray-600 hover:bg-white/50'
                        )}
                        transition:fly={{ x: -20, duration: 200, delay: i * 50 }}
                    >
                        {sev}
                        {#if sev !== 'all'}
                            <span
                                class={cn(
                                    'rounded-full px-2 py-0.5 text-xs font-bold',
                                    sev === 'critical'
                                        ? 'bg-red-50 text-red-700'
                                        : sev === 'high'
                                            ? 'bg-orange-50 text-orange-700'
                                            : sev === 'medium'
                                                ? 'bg-yellow-50 text-yellow-700'
                                                : 'bg-blue-50 text-blue-700'
                                )}
                            >
                                {counts[sev as keyof typeof counts]}
                            </span>
                        {:else}
                            <span class="text-xs text-gray-400">{vulnerabilities.length}</span>
                        {/if}
                    </button>
                {/each}
            </div>
        {/if}

        <!-- Vulnerability List -->
        {#if mounted}
            <div
                class="flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                transition:fly={{ y: 30, duration: 400, delay: 200 }}
            >
                <div
                    class="flex items-center justify-between border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white p-4 font-serif font-semibold text-gray-700"
                >
                    <span>Findings ({filteredVulns.length})</span>
                    {#if isScanning}
                        <div class="flex items-center gap-2 text-xs text-blue-600" transition:fade={{ duration: 200 }}>
                            <Loader2 class="h-3 w-3 animate-spin" /> Scanning...
                        </div>
                    {/if}
                </div>

                <div class="flex-1 space-y-2 overflow-y-auto p-3">
                    {#each filteredVulns as vuln, i (vuln.id)}
                        <div
                            class={cn(
                                'overflow-hidden rounded-xl border transition-all duration-300',
                                expandedVulns.has(vuln.id)
                                    ? 'border-blue-200 bg-blue-50/30 shadow-sm'
                                    : 'border-gray-100 bg-white hover:border-blue-200 hover:shadow-sm'
                            )}
                            transition:fly={{ y: 20, duration: 300, delay: i * 30 }}
                        >
                            <button
                                onclick={() => toggleExpand(vuln.id)}
                                class="flex w-full items-center gap-3 p-4 text-left"
                            >
                                <div
                                    class={cn(
                                        'shrink-0 rounded-full p-2 transition-colors duration-200',
                                        vuln.severity === 'critical'
                                            ? 'bg-red-100 text-red-600'
                                            : vuln.severity === 'high'
                                                ? 'bg-orange-100 text-orange-600'
                                                : vuln.severity === 'medium'
                                                    ? 'bg-yellow-100 text-yellow-600'
                                                    : 'bg-blue-100 text-blue-600'
                                    )}
                                >
                                    {#if vuln.severity === 'critical'}<AlertOctagon class="h-4 w-4" />
                                    {:else if vuln.severity === 'high'}<AlertTriangle class="h-4 w-4" />
                                    {:else}<Info class="h-4 w-4" />{/if}
                                </div>

                                <div class="min-w-0 flex-1">
                                    <div class="mb-1 flex items-center gap-2">
                                        <span class="font-serif text-sm font-bold text-gray-800">{vuln.description}</span>
                                        <span
                                            class={cn(
                                                'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                                                vuln.severity === 'critical'
                                                    ? 'bg-red-100 text-red-700'
                                                    : vuln.severity === 'high'
                                                        ? 'bg-orange-100 text-orange-700'
                                                        : vuln.severity === 'medium'
                                                            ? 'bg-yellow-100 text-yellow-700'
                                                            : 'bg-blue-100 text-blue-700'
                                            )}>{vuln.severity}</span
                                        >
                                    </div>
                                    <div class="flex items-center gap-2 truncate text-xs text-gray-500">
                                        <FileCode class="h-3 w-3" />
                                        <code class="font-mono">{vuln.file}:{vuln.line}</code>
                                    </div>
                                </div>

                                <span class="transition-transform duration-200" class:rotate-90={expandedVulns.has(vuln.id)}>
                                    <ChevronRight class="h-4 w-4 text-gray-400" />
                                </span>
                            </button>

                            {#if expandedVulns.has(vuln.id)}
                                <div class="px-4 pt-0 pb-4" transition:slide={{ duration: 200 }}>
                                    <div class="space-y-3 pl-12">
                                        <div class="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                                            <div class="mb-2 font-serif text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                Recommendation
                                            </div>
                                            <p class="font-serif text-sm text-gray-700">{vuln.recommendation}</p>
                                        </div>

                                        {#if vuln.codeSnippet}
                                            <div class="overflow-x-auto rounded-xl bg-gray-900 p-4 shadow-inner">
                                                <pre class="font-mono text-xs whitespace-pre text-gray-300">{vuln.codeSnippet}</pre>
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                            {/if}
                        </div>
                    {/each}

                    {#if filteredVulns.length === 0}
                        <div class="py-16 text-center" transition:fade={{ duration: 200 }}>
                            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-600">
                                <CheckCircle class="h-8 w-8" />
                            </div>
                            <h3 class="font-serif font-semibold text-gray-900">No Issues Found</h3>
                            <p class="mt-1 font-serif text-sm text-gray-500">No findings for this severity level.</p>
                        </div>
                    {/if}
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    /* No font import needed - handled by layout */
</style>
