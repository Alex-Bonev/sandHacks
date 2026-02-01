<script lang="ts">
  import { Settings as SettingsIcon, Save } from 'lucide-svelte';
  import { getSetting, saveSetting } from '../lib/storage';
  import { checkConnection } from '../lib/ollama';
  import { onMount } from 'svelte';

  let { onConfigChange } = $props<{ onConfigChange: () => void }>();

  let ollamaUrl = $state('http://localhost:11434');
  let githubToken = $state('');
  let isOpen = $state(false);
  let status = $state<'idle' | 'checking' | 'connected' | 'error'>('idle');

  onMount(async () => {
    const storedUrl = await getSetting('ollama_url');
    if (storedUrl) ollamaUrl = storedUrl;
    
    const storedToken = await getSetting('github_token');
    if (storedToken) githubToken = storedToken;
  });

  const handleSave = async () => {
    status = 'checking';
    await saveSetting('ollama_url', ollamaUrl);
    await saveSetting('github_token', githubToken);
    
    const isConnected = await checkConnection(ollamaUrl);
    status = isConnected ? 'connected' : 'error';
    if (isConnected) {
      onConfigChange();
      setTimeout(() => isOpen = false, 1000);
    }
  };
</script>

<div class="z-50">
  <button
    onclick={() => isOpen = !isOpen}
    class="p-2 rounded-md hover:bg-gray-100 transition-colors"
  >
    <SettingsIcon class="w-6 h-6 text-gray-700" />
  </button>

  {#if isOpen}
    <div class="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4">
      <h3 class="text-lg font-semibold mb-4 text-gray-800">Settings</h3>
      
      <div class="space-y-4">
        <div>
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class="block text-sm font-medium text-gray-700 mb-1">Ollama URL</label>
          <input
            type="text"
            bind:value={ollamaUrl}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="http://localhost:11434"
          />
          <p class="text-xs text-gray-500 mt-1">Ensure OLLAMA_ORIGINS="*" is set.</p>
        </div>

        <div>
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class="block text-sm font-medium text-gray-700 mb-1">GitHub Token (Optional)</label>
          <input
            type="password"
            bind:value={githubToken}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="ghp_..."
          />
        </div>

        <button
          onclick={handleSave}
          class="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          <Save class="w-4 h-4" />
          Save & Connect
        </button>

        {#if status === 'connected'}
          <p class="text-sm text-green-600 font-medium text-center">Connected to Ollama!</p>
        {:else if status === 'error'}
          <p class="text-sm text-red-600 font-medium text-center">Could not connect to Ollama.</p>
        {/if}
      </div>
    </div>
  {/if}
</div>