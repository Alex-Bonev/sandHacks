<script lang="ts">
    import { fly, fade, slide } from 'svelte/transition';
    import {
        FolderInput,
        Play,
        Download,
        Loader2,
        FileCode,
        CheckCircle,
        Circle,
        AlertCircle,
        Trash2,
        Square
    } from 'lucide-svelte';
    import { streamChat, type ChatMessage } from '../lib/ollama';
    import { getSetting } from '../lib/storage';
    import { onMount } from 'svelte';
    import JSZip from 'jszip';
    import * as Diff from 'diff';
    import toast from 'svelte-french-toast';
    import { cn } from '../utils/cn';

    let { selectedModel } = $props<{ selectedModel: string }>();

    type BatchFile = {
        path: string;
        original: string;
        modified: string | null;
        status: 'pending' | 'processing' | 'done' | 'error' | 'aborted';
        error?: string;
    };

    let files = $state<BatchFile[]>([]);
    let prompt = $state('');
    let isProcessing = $state(false);
    let progress = $state({ current: 0, total: 0 });
    let selectedFileId = $state<string | null>(null);
    let ollamaUrl = $state('http://localhost:11434');
    let abortController = $state<AbortController | null>(null);
    let mounted = $state(false);

    let selectedFile = $derived(files.find((f) => f.path === selectedFileId));

    onMount(async () => {
        const url = await getSetting('ollama_url');
        if (url) ollamaUrl = url;
        setTimeout(() => mounted = true, 50);
    });

    const handleFolderSelect = async (e: Event) => {
        const input = e.target as HTMLInputElement;
        if (!input.files?.length) return;

        const newFiles: BatchFile[] = [];
        const ignorePatterns = ['node_modules', '.git', 'dist', 'build', '.DS_Store'];
        const textExtensions =
            /\.(ts|tsx|js|jsx|svelte|html|css|scss|json|md|py|rs|go|java|c|cpp|h|txt)$/;

        for (let i = 0; i < input.files.length; i++) {
            const file = input.files[i];
            const path = file.webkitRelativePath || file.name;

            if (files.some((f) => f.path === path)) continue;
            if (ignorePatterns.some((p) => path.includes(p))) continue;
            if (!textExtensions.test(path)) continue;

            const text = await file.text();
            newFiles.push({
                path,
                original: text,
                modified: null,
                status: 'pending'
            });
        }

        files = [...files, ...newFiles];
        toast.success(`Added ${newFiles.length} files`);
        input.value = '';
    };

    const removeFile = (pathToRemove: string) => {
        files = files.filter((f) => f.path !== pathToRemove);
        if (selectedFileId === pathToRemove) selectedFileId = null;
    };

    const processFile = async (file: BatchFile, signal: AbortSignal) => {
        if (!selectedModel) throw new Error('No model selected');
        if (signal.aborted) return;

        file.status = 'processing';
        files = [...files];

        try {
            const messages: ChatMessage[] = [
                {
                    role: 'system',
                    content: `You are a code refactoring engine. 
          Your task is to transform the code exactly as requested.
          Output ONLY the modified code. Do not wrap in markdown blocks if possible, or I will strip them.
          Do not include conversational text.`
                },
                {
                    role: 'user',
                    content: `Task: ${prompt}\n\nOriginal Code:\n${file.original}`
                }
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

            if (signal.aborted) throw new Error('Aborted');

            if (!fullResponse.trim()) throw new Error('Model returned empty response.');

            let cleanCode = fullResponse.trim();
            if (cleanCode.startsWith('```')) {
                const lines = cleanCode.split('\n');
                if (lines.length > 0) lines.shift();
                if (lines.length > 0 && lines[lines.length - 1].trim() === '```') lines.pop();
                cleanCode = lines.join('\n');
            }

            file.modified = cleanCode;
            file.status = 'done';
        } catch (e: any) {
            if (e.message === 'Aborted' || e.name === 'AbortError') {
                file.status = 'aborted';
                file.modified = null;
            } else {
                console.error(`Error processing ${file.path}:`, e);
                file.status = 'error';
                file.error = e.message;
            }
        } finally {
            files = [...files];
        }
    };

    const runBatch = async () => {
        if (!prompt.trim()) return toast.error('Please enter a prompt');
        if (files.length === 0) return toast.error('No files loaded');
        if (!selectedModel) return toast.error('Please select a model in the header');

        isProcessing = true;
        progress = { current: 0, total: files.length };

        files.forEach((f) => {
            if (f.status !== 'done') {
                f.status = 'pending';
                f.modified = null;
                f.error = undefined;
            }
        });
        files = [...files];

        abortController = new AbortController();

        for (const file of files) {
            if (abortController.signal.aborted) break;
            if (file.status === 'pending') {
                await processFile(file, abortController.signal);
                progress.current++;
            }
        }

        isProcessing = false;
        abortController = null;
        toast.success('Batch processing finished!');
    };

    const stopBatch = () => {
        if (abortController) {
            abortController.abort();
            abortController = null;
            isProcessing = false;
            toast('Batch processing stopped');
        }
    };

    const downloadResults = async () => {
        const zip = new JSZip();
        let count = 0;

        files.forEach((f) => {
            if (f.status === 'done' && f.modified) {
                zip.file(f.path, f.modified);
                count++;
            }
        });

        if (count === 0) return toast.error('No modified files to download');

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'refactored_files.zip';
        a.click();
        URL.revokeObjectURL(url);
    };
</script>

<div class="flex h-full flex-col bg-gradient-to-b from-blue-50/30 to-white">
    <!-- Header / Config -->
    {#if mounted}
        <div class="border-b border-blue-100 bg-white p-6 shadow-sm" transition:fly={{ y: -20, duration: 400 }}>
            <div class="mx-auto flex max-w-6xl flex-col gap-6">
                <div class="flex items-start justify-between">
                    <div>
                        <h1 class="flex items-center gap-3 font-serif text-2xl font-bold text-gray-800">
                            <div class="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-2.5 text-white shadow-lg">
                                <FileCode class="h-6 w-6" />
                            </div>
                            Infinite Refactor
                        </h1>
                        <p class="mt-2 font-serif text-sm text-gray-500">
                            Process entire folders locally. Zero data leakage. Infinite free tokens.
                        </p>
                    </div>
                </div>

                <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <!-- Step 1: Input -->
                    <div class="col-span-1 space-y-3" transition:fly={{ x: -20, duration: 300, delay: 100 }}>
                        <label class="font-serif text-sm font-medium text-gray-700">1. Load Files / Folders</label>
                        <div class="group relative">
                            <div
                                class="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white p-6 text-gray-400 transition-all duration-300 group-hover:border-blue-300 group-hover:bg-blue-50/30"
                            >
                                <FolderInput class="mb-2 h-8 w-8 transition-transform duration-200 group-hover:scale-110" />
                                <span class="text-center font-serif text-sm">Click to add files or folders</span>
                                <input
                                    type="file"
                                    webkitdirectory
                                    multiple
                                    class="absolute inset-0 cursor-pointer opacity-0"
                                    onchange={handleFolderSelect}
                                />
                            </div>
                        </div>
                        {#if files.length > 0}
                            <div class="text-center font-serif text-xs font-medium text-green-600" transition:fade={{ duration: 200 }}>
                                {files.length} files queued
                            </div>
                        {/if}
                    </div>

                    <!-- Step 2: Prompt -->
                    <div class="col-span-2 flex flex-col space-y-3" transition:fly={{ x: 20, duration: 300, delay: 150 }}>
                        <label class="font-serif text-sm font-medium text-gray-700">2. Define Transformation</label>
                        <textarea
                            bind:value={prompt}
                            placeholder="e.g., 'Add JSDoc comments to all functions' or 'Convert CSS to Tailwind'"
                            class="w-full flex-1 resize-none rounded-xl border border-gray-200 p-4 font-serif text-sm shadow-sm outline-none transition-all duration-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        ></textarea>
                        <div class="flex justify-end gap-3">
                            {#if progress.total > 0}
                                <div class="mr-auto flex items-center gap-2 font-serif text-xs font-medium text-gray-500" transition:fade={{ duration: 200 }}>
                                    {#if isProcessing}
                                        <Loader2 class="h-4 w-4 animate-spin text-blue-600" />
                                        Processing {progress.current}/{progress.total}
                                    {:else if progress.current === progress.total}
                                        <CheckCircle class="h-4 w-4 text-green-600" />
                                        Complete
                                    {/if}
                                </div>
                            {/if}

                            <button
                                onclick={isProcessing ? stopBatch : runBatch}
                                disabled={!isProcessing && (files.length === 0 || !prompt.trim() || !selectedModel)}
                                class={cn(
                                    'flex items-center gap-2 rounded-xl px-5 py-2.5 font-serif text-sm font-medium shadow-sm transition-all duration-300',
                                    isProcessing
                                        ? 'bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100'
                                        : 'bg-gradient-to-b from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600 hover:shadow-md disabled:opacity-50'
                                )}
                            >
                                {#if isProcessing}
                                    <Square class="h-4 w-4 fill-current" /> Stop
                                {:else}
                                    <Play class="h-4 w-4" /> Run Batch
                                {/if}
                            </button>

                            <button
                                onclick={downloadResults}
                                disabled={isProcessing || !files.some((f) => f.status === 'done')}
                                class="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 font-serif text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 disabled:opacity-50"
                            >
                                <Download class="h-4 w-4" /> Download All
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    {/if}

    <!-- Main Content: File List & Diff -->
    <div class="mx-auto flex w-full max-w-7xl flex-1 gap-6 overflow-hidden p-6">
        <!-- Left: File List -->
        {#if mounted}
            <div
                class="flex w-1/3 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                transition:fly={{ x: -30, duration: 400, delay: 200 }}
            >
                <div
                    class="flex items-center justify-between border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white p-4 font-serif text-sm font-semibold text-gray-700"
                >
                    <span>Files ({files.length})</span>
                    {#if files.length > 0}
                        <button onclick={() => (files = [])} class="text-xs text-red-500 transition-colors duration-200 hover:text-red-700"
                            >Clear All</button
                        >
                    {/if}
                </div>
                <div class="flex-1 space-y-1 overflow-y-auto p-2">
                    {#each files as file, i}
                        <div class="group flex items-center gap-1" transition:fly={{ x: -20, duration: 200, delay: i * 20 }}>
                            <button
                                onclick={() => (selectedFileId = file.path)}
                                class={cn(
                                    'flex flex-1 items-center gap-2 overflow-hidden rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-200',
                                    selectedFileId === file.path
                                        ? 'bg-blue-50 text-blue-700 shadow-sm'
                                        : 'text-gray-600 hover:bg-gray-50'
                                )}
                            >
                                <span class="transition-transform duration-200" class:scale-110={file.status === 'done'}>
                                    {#if file.status === 'pending'}
                                        <Circle class="h-3.5 w-3.5 shrink-0 text-gray-300" />
                                    {:else if file.status === 'processing'}
                                        <Loader2 class="h-3.5 w-3.5 shrink-0 animate-spin text-blue-500" />
                                    {:else if file.status === 'done'}
                                        <CheckCircle class="h-3.5 w-3.5 shrink-0 text-green-500" />
                                    {:else if file.status === 'aborted'}
                                        <Circle class="h-3.5 w-3.5 shrink-0 text-orange-400" />
                                    {:else}
                                        <AlertCircle class="h-3.5 w-3.5 shrink-0 text-red-500" />
                                    {/if}
                                </span>
                                <span class="dir-rtl truncate text-xs file-path" title={file.path}>{file.path}</span>
                            </button>

                            <button
                                onclick={() => removeFile(file.path)}
                                class="p-2 text-gray-400 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:text-red-500"
                            >
                                <Trash2 class="h-3.5 w-3.5" />
                            </button>
                        </div>
                    {/each}
                    {#if files.length === 0}
                        <div class="py-12 text-center" transition:fade={{ duration: 200 }}>
                            <FolderInput class="mx-auto mb-3 h-10 w-10 text-gray-300" />
                            <p class="font-serif text-xs text-gray-400">Load a folder to begin</p>
                        </div>
                    {/if}
                </div>
            </div>
        {/if}

        <!-- Right: Diff View -->
        {#if mounted}
            <div
                class="flex w-2/3 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                transition:fly={{ x: 30, duration: 400, delay: 250 }}
            >
                {#if selectedFile}
                    <div
                        class="flex justify-between border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white p-4 text-sm font-semibold text-gray-700"
                    >
                        <span class="truncate file-path">{selectedFile.path}</span>
                        <span
                            class={cn(
                                'rounded-full px-3 py-1 text-xs font-bold',
                                selectedFile.status === 'done'
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-gray-100 text-gray-600'
                            )}
                        >
                            {selectedFile.status.toUpperCase()}
                        </span>
                    </div>

                    <div class="relative flex flex-1 flex-col overflow-hidden">
                        {#if selectedFile.status === 'done' && selectedFile.modified}
                            {@const diffs = Diff.diffLines(selectedFile.original, selectedFile.modified)}

                            <div class="flex flex-1 overflow-hidden" transition:fade={{ duration: 200 }}>
                                <!-- LEFT: Original -->
                                <div class="flex-1 overflow-auto border-r border-gray-100 bg-gray-50/50">
                                    <div
                                        class="sticky top-0 z-10 border-b border-gray-100 bg-gray-100 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500"
                                    >
                                        Original
                                    </div>
                                    <pre class="code-block text-wrap wrap-break-words p-4 text-xs whitespace-pre text-gray-600">{#each diffs as part}{#if part.removed}<span class="del-line -mx-4 block w-full bg-red-100/50 px-4 text-wrap opacity-70 select-none">{part.value}</span>{:else if !part.added}<span class="text-wrap">{part.value}</span>{/if}{/each}</pre>
                                </div>

                                <!-- RIGHT: Modified -->
                                <div class="flex-1 overflow-auto bg-white">
                                    <div
                                        class="sticky top-0 z-10 border-b border-blue-100 bg-blue-50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-blue-600"
                                    >
                                        Modified
                                    </div>
                                    <pre class="code-block text-wrap wrap-break-words p-4 text-xs whitespace-pre text-gray-800">{#each diffs as part}{#if part.added}<span class="add-line -mx-4 block w-full bg-green-100/50 px-4 text-wrap text-green-900">{part.value}</span>{:else if !part.removed}<span class="text-wrap">{part.value}</span>{/if}{/each}</pre>
                                </div>
                            </div>
                        {:else if selectedFile.status === 'error'}
                            <div class="p-12 text-center text-red-500" transition:fade={{ duration: 200 }}>
                                <AlertCircle class="mx-auto mb-3 h-10 w-10 opacity-50" />
                                <p class="font-serif">Error: {selectedFile.error}</p>
                            </div>
                        {:else}
                            <div class="flex-1 overflow-auto bg-gray-50/30">
                                <pre class="code-block text-wrap wrap-break-words p-4 text-xs text-gray-600">{selectedFile.original}</pre>
                            </div>
                        {/if}
                    </div>
                {:else}
                    <div class="flex flex-1 flex-col items-center justify-center text-gray-300" transition:fade={{ duration: 200 }}>
                        <FileCode class="mb-4 h-16 w-16 opacity-30" />
                        <p class="font-serif">Select a file to view content</p>
                    </div>
                {/if}
            </div>
        {/if}
    </div>
</div>

<style>
    .code-block,
    .code-block * {
        font-family: 'SF Mono', 'Fira Code', 'Monaco', 'Consolas', 'Courier New', monospace !important;
    }

    .file-path {
        font-family: 'SF Mono', 'Fira Code', 'Monaco', 'Consolas', 'Courier New', monospace !important;
    }
</style>
