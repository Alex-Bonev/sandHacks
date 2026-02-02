<script lang="ts">
    import { Toaster } from 'svelte-french-toast';
    import './layout.css';
    import favicon from '$lib/assets/favicon.svg';

    let { children } = $props();
</script>

<Toaster 
    position="top-center" 
    toastOptions={{ style: 'background: #333; color: #fff;' }}
    containerStyle="background: transparent; pointer-events: none;"
/>

<svelte:head>
    <link rel="icon" href={favicon} />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link
    href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600;8..60,700&display=swap"
    rel="stylesheet"
    />
</svelte:head>

{@render children()}

<style>
    :global(*) {
        font-family: 'Source Serif 4', Georgia, 'Times New Roman', serif;
    }

    :global(code),
    :global(pre),
    :global(pre code),
    :global(.font-mono),
    :global([class*="font-mono"]),
    :global(.command-text),
    :global(.hljs) {
        font-family: 'SF Mono', 'Fira Code', 'Monaco', 'Consolas', 'Courier New', monospace !important;
    }

    /* Fix for svelte-french-toast empty container showing as white rectangle */
    :global(.svelte-french-toast-wrapper),
    :global([role="status"]) {
        background: transparent !important;
        box-shadow: none !important;
    }

    :global(.svelte-french-toast-wrapper:empty),
    :global(div[style*="position: fixed"][style*="z-index"]:empty) {
        display: none !important;
        pointer-events: none !important;
    }

    /* Target the toast container specifically */
    :global(div[style*="position: fixed"][style*="pointer-events: none"]) {
        background: transparent !important;
    }
</style>
