<script lang="ts">
    import { fly, fade, slide } from 'svelte/transition';
    import { FileText, Upload, BookOpen, Terminal, Settings, Play, CheckCircle, File } from 'lucide-svelte';
    import { marked } from 'marked';
    import { cn } from '../utils/cn';
    import toast from 'svelte-french-toast';
    import { onMount } from 'svelte';

    let activeTab = $state<'instructions' | 'viewer'>('instructions');
    let reportContent = $state('');
    let fileName = $state('');
    let mounted = $state(false);

    onMount(() => {
        setTimeout(() => (mounted = true), 50);
    });

    const handleFileUpload = async (e: Event) => {
        const input = e.target as HTMLInputElement;
        if (!input.files?.length) return;

        const file = input.files[0];
        if (!file.name.endsWith('.md')) {
            toast.error('Please upload a Markdown (.md) file');
            return;
        }

        fileName = file.name;
        reportContent = await file.text();
        toast.success('Report loaded');
    };
</script>

<div class="flex h-full flex-col bg-gradient-to-b from-blue-50/30 to-white">
    <!-- Header -->
    {#if mounted}
        <div class="border-b border-blue-100 bg-white p-6 shadow-sm" transition:fly={{ y: -20, duration: 400 }}>
            <div class="mx-auto flex max-w-6xl items-start justify-between">
                <div>
                    <h1 class="flex items-center gap-3 font-serif text-2xl font-bold text-gray-800">
                        <div class="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-2.5 text-white shadow-lg">
                            <FileText class="h-6 w-6" />
                        </div>
                        Local Logger
                    </h1>
                    <p class="mt-2 font-serif text-sm text-gray-500">
                        Track your work sessions locally. Generate summaries without sending data to the cloud.
                    </p>
                </div>

                <!-- Tab Switcher -->
                <div class="flex gap-1 rounded-xl bg-gray-100 p-1">
                    <button
                        onclick={() => (activeTab = 'instructions')}
                        class={cn(
                            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
                            activeTab === 'instructions'
                                ? 'bg-white text-blue-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        )}
                    >
                        <BookOpen class="h-4 w-4" /> Setup Guide
                    </button>
                    <button
                        onclick={() => (activeTab = 'viewer')}
                        class={cn(
                            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
                            activeTab === 'viewer' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        )}
                    >
                        <Upload class="h-4 w-4" /> Report Viewer
                    </button>
                </div>
            </div>
        </div>
    {/if}

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-6">
        <div class="mx-auto max-w-4xl">
            {#if activeTab === 'instructions'}
                {#if mounted}
                    <div class="space-y-8" transition:fly={{ x: -30, duration: 400 }}>
                        <!-- Intro -->
                        <div class="rounded-2xl border border-blue-100 bg-blue-50/50 p-6">
                            <h2 class="mb-2 font-serif text-lg font-bold text-blue-900">What is Local Logger?</h2>
                            <p class="font-serif text-sm leading-relaxed text-blue-800">
                                It's a VSCode extension that periodically takes snapshots of your active editor. At the
                                end of a session, it uses your local Ollama model to summarize exactly what you worked
                                on, creating a detailed Markdown report. Perfect for stand-ups and tracking progress.
                            </p>
                        </div>

                        <div class="grid gap-4">
                            {#each [1, 2, 3] as step, i}
                                <div
                                    class="flex gap-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md"
                                    transition:fly={{ y: 20, duration: 300, delay: i * 100 }}
                                >
                                    <div
                                        class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 font-serif text-lg font-bold text-white shadow-lg"
                                    >
                                        {step}
                                    </div>
                                    <div>
                                        {#if step === 1}
                                            <h3 class="mb-2 font-serif font-bold text-gray-800">Install the Extension</h3>
                                            <p class="mb-3 font-serif text-sm text-gray-600">
                                                Search for <span class="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs"
                                                    >local-launchpad-logger</span
                                                > in the VSCode Marketplace and install it.
                                            </p>
                                            <a
                                                href="#"
                                                class="flex items-center gap-1 font-serif text-sm font-medium text-blue-600 transition-colors duration-200 hover:text-blue-700 hover:underline"
                                            >
                                                View in Marketplace <Settings class="h-3 w-3" />
                                            </a>
                                        {:else if step === 2}
                                            <h3 class="mb-2 font-serif font-bold text-gray-800">Configure Model</h3>
                                            <p class="mb-3 font-serif text-sm text-gray-600">
                                                Open VSCode Settings (<span
                                                    class="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs">Cmd + ,</span
                                                >) and search for "Local Logger". Ensure the <strong>Model Name</strong> matches
                                                the model you have running in Ollama.
                                            </p>
                                            <div class="rounded-xl bg-gray-900 p-4 font-mono text-xs text-gray-300">
                                                "localLogger.model": "llama3"
                                            </div>
                                        {:else}
                                            <h3 class="mb-2 font-serif font-bold text-gray-800">Run It</h3>
                                            <p class="mb-3 font-serif text-sm text-gray-600">
                                                Open the Command Palette (<span
                                                    class="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs">Cmd + Shift + P</span
                                                >) and run:
                                            </p>
                                            <div
                                                class="flex items-center gap-2 rounded-xl bg-gray-100 p-3 font-mono text-sm text-gray-700"
                                            >
                                                <Terminal class="h-4 w-4 text-blue-600" />
                                                Local Logger: Start Session
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
            {:else}
                {#if mounted}
                    <div class="flex h-full flex-col gap-6" transition:fly={{ x: 30, duration: 400 }}>
                        <!-- Upload Area -->
                        <div
                            class="group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white p-10 text-center transition-all duration-300 hover:border-blue-300 hover:bg-blue-50/30"
                        >
                            <div
                                class="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-500 transition-transform duration-200 group-hover:scale-110"
                            >
                                <FileText class="h-10 w-10" />
                            </div>
                            <h3 class="font-serif text-lg font-bold text-gray-800">Upload Session Report</h3>
                            <p class="mt-2 max-w-sm font-serif text-sm text-gray-500">
                                Drag and drop your <span class="font-mono text-gray-700">.md</span> file here, or click
                                to browse.
                            </p>
                            <input
                                type="file"
                                accept=".md"
                                class="absolute inset-0 cursor-pointer opacity-0"
                                onchange={handleFileUpload}
                            />
                        </div>

                        <!-- Report View -->
                        {#if reportContent}
                            <div
                                class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                                transition:fly={{ y: 20, duration: 300 }}
                            >
                                <div
                                    class="flex items-center gap-3 border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white p-4"
                                >
                                    <div class="rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
                                        <File class="h-4 w-4 text-blue-600" />
                                    </div>
                                    <span class="font-serif font-medium text-gray-700">{fileName}</span>
                                    <span
                                        class="ml-auto flex items-center gap-1 rounded-full border border-green-100 bg-green-50 px-3 py-1 text-xs text-green-600"
                                    >
                                        <CheckCircle class="h-3 w-3" /> Valid Markdown
                                    </span>
                                </div>
                                <div class="prose prose-blue max-w-none p-8">
                                    {@html marked.parse(reportContent)}
                                </div>
                            </div>
                        {/if}
                    </div>
                {/if}
            {/if}
        </div>
    </div>
</div>

<style>
</style>