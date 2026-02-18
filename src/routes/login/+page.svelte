<script lang="ts">
  import { enhance } from '$app/forms';

  let { form } = $props();
  let networkError = $state<string | null>(null);

  function handleEnhance() {
    networkError = null;
    return ({ result, update }: { result: unknown; update: (opts?: { reset?: boolean; invalidateAll?: boolean }) => Promise<void> }) => {
      try {
        update();
      } catch {
        networkError = 'Erreur de connexion. Réessayez.';
      }
    };
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-slate-100 p-4">
  <div class="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm">
    <h1 class="text-2xl font-bold text-slate-800 mb-2">Badgeuse</h1>
    <p class="text-slate-600 text-sm mb-6">Entrez votre code pour vous connecter</p>

    <form
      method="POST"
      use:enhance={handleEnhance}
      class="space-y-4"
    >
      <input
        type="text"
        name="code"
        autocomplete="off"
        placeholder="Code secret"
        class="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        autofocus
      />
      {#if networkError}
        <p class="text-red-600 text-sm">{networkError}</p>
      {:else if form?.error}
        <p class="text-red-600 text-sm">{form.error}</p>
      {/if}
      <button
        type="submit"
        class="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
      >
        Connexion
      </button>
    </form>
  </div>
</div>
