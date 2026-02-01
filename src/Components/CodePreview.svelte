<script lang="ts">
  import { Loader2, FileCode } from 'lucide-svelte';
  import { fetchFileContent, parseRepoUrl, type GitHubFile } from '../lib/github';
  import { getSetting } from '../lib/storage';
  import hljs from 'highlight.js';
  import 'highlight.js/styles/github.css';

  let { file, repoUrl } = $props<{
    file: GitHubFile | null;
    repoUrl: string;
  }>();

  let content = $state('');
  let loading = $state(false);
  let error = $state('');
  let codeElement: HTMLElement | undefined = $state();

  const loadFile = async () => {
    if (!file || !repoUrl) return;

    loading = true;
    error = '';
    content = '';

    try {
      const repoInfo = parseRepoUrl(repoUrl);
      if (!repoInfo) throw new Error('Invalid Repo URL');

      const token = await getSetting('github_token');
      const text = await fetchFileContent(
        repoInfo.owner,
        repoInfo.repo,
        file.path,
        token || undefined
      );
      content = text;

      setTimeout(() => {
        if (codeElement) {
          codeElement.removeAttribute('data-highlighted');
          hljs.highlightElement(codeElement);
        }
      }, 0);
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  };

  $effect(() => {
    if (file && repoUrl) {
      loadFile();
    } else {
      content = '';
    }
  });
</script>

<div class="flex h-full flex-col overflow-scroll bg-gray-50">
  {#if !file}
    <div class="flex flex-1 flex-col items-center justify-center text-gray-400">
      <FileCode class="mb-2 h-12 w-12 opacity-20" />
      <p>No file selected</p>
    </div>
  {:else if loading}
    <div class="flex flex-1 items-center justify-center gap-2 text-gray-500">
      <Loader2 class="h-5 w-5 animate-spin" />
      <span>Loading <code class="font-mono">{file.path}</code>...</span>
    </div>
  {:else if error}
    <div class="flex flex-1 items-center justify-center p-4 text-center text-red-500">
      <p>{error}</p>
    </div>
  {:else}
    <div class="relative flex-1 overflow-auto bg-white p-4">
      <pre class="code-preview m-0 text-sm"><code
        bind:this={codeElement}
        class="code-preview language-typescript"
      >{content}</code></pre>
    </div>
  {/if}
</div>

<style>
  .code-preview,
  .code-preview *,
  :global(.hljs),
  :global(.hljs *) {
    font-family: 'SF Mono', 'Fira Code', 'Monaco', 'Consolas', 'Courier New', monospace !important;
  }
</style>