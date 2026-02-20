<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';

  let { data, form } = $props();

  const isDev = import.meta.env.DEV;
  let resetLoading = $state(false);

  async function resetDb() {
    if (!isDev || resetLoading) return;
    resetLoading = true;
    try {
      const r = await fetch('/api/dev/reset-db', { method: 'POST' });
      const j = await r.json();
      if (j?.ok) await invalidateAll();
      else console.error(j?.error ?? 'Erreur reset BDD');
    } finally {
      resetLoading = false;
    }
  }

  const role = $derived(data.role);
  const pointages = $derived(data.pointages);
  const absences = $derived(data.absences);
  const absencesAll = $derived(data.absencesAll ?? data.absences);
  const enCours = $derived(data.enCours);
  const mois = $derived(data.mois);

  /** Plages légales 8h30-12h et 13h30-17h, L-V — calcul côté client = timezone utilisateur. */
  function minutesDansPlagesLegales(arrivee: Date | number, depart: Date | number): number {
    const a = (arrivee instanceof Date ? arrivee : new Date(arrivee)).getTime();
    const d = (depart instanceof Date ? depart : new Date(depart)).getTime();
    if (Number.isNaN(a) || Number.isNaN(d) || d <= a) return 0;
    let total = 0;
    const cursor = new Date(a);
    cursor.setHours(0, 0, 0, 0);
    const endDay = new Date(d);
    endDay.setHours(23, 59, 59, 999);
    while (cursor <= endDay) {
      const jour = cursor.getDay();
      if (jour >= 1 && jour <= 5) {
        const y = cursor.getFullYear();
        const mo = cursor.getMonth();
        const day = cursor.getDate();
        const matinStart = new Date(y, mo, day, 8, 30, 0, 0).getTime();
        const matinEnd = new Date(y, mo, day, 12, 0, 0, 0).getTime();
        const apremStart = new Date(y, mo, day, 13, 30, 0, 0).getTime();
        const apremEnd = new Date(y, mo, day, 17, 0, 0, 0).getTime();
        const seg = (s: number, e: number) =>
          Math.max(0, Math.round((Math.min(e, d) - Math.max(s, a)) / 60000));
        total += seg(matinStart, matinEnd) + seg(apremStart, apremEnd);
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return total;
  }

  const [moisY, moisM] = $derived(mois.split('-').map(Number));
  const moisStart = $derived(new Date(moisY, moisM - 1, 1).getTime());
  const moisEnd = $derived(new Date(moisY, moisM, 0, 23, 59, 59).getTime());

  const heuresEffectueesMinutes = $derived.by(() => {
    const list = Array.isArray(pointages) ? pointages : [];
    let total = 0;
    for (const p of list) {
      if (!p.depart) continue;
      const arr = p.arrivee instanceof Date ? p.arrivee : new Date(p.arrivee as string | number);
      const dep = p.depart instanceof Date ? p.depart : new Date(p.depart as string | number);
      const at = arr.getTime();
      const dt = dep.getTime();
      if (Number.isNaN(at) || Number.isNaN(dt) || dt <= at) continue;
      if (dt < moisStart || at > moisEnd) continue;
      total += minutesDansPlagesLegales(Math.max(at, moisStart), Math.min(dt, moisEnd));
    }
    return total;
  });

  const heuresAbsenceMinutes = $derived.by(() => {
    const list = Array.isArray(absences) ? absences : [];
    let total = 0;
    for (const a of list) {
      const deb = (a.debut instanceof Date ? a.debut : new Date(a.debut as string | number)).getTime();
      const fin = (a.fin instanceof Date ? a.fin : new Date(a.fin as string | number)).getTime();
      if (Number.isNaN(deb) || Number.isNaN(fin)) continue;
      const overlapStart = Math.max(deb, moisStart);
      const overlapEnd = Math.min(fin, moisEnd);
      if (overlapEnd > overlapStart) total += Math.floor((overlapEnd - overlapStart) / 60000);
    }
    return total;
  });

  const totalBrutMinutes = $derived.by(() => {
    const list = Array.isArray(pointages) ? pointages : [];
    return list.reduce((acc, p) => acc + (p.dureeMinutes ?? 0), 0);
  });

  const moisLabelCourt = $derived(
    new Date(mois + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(' ', '-')
  );

  function fmtDuree(minutes: number) {
    return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`;
  }

  function fmtDate(d: Date | number) {
    const x = d instanceof Date ? d : new Date(d);
    return x.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  function fmtTime(d: Date | number) {
    const x = d instanceof Date ? d : new Date(d);
    return x.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  function sameDay(a: Date | number, b: Date | number) {
    const x = a instanceof Date ? a : new Date(a);
    const y = b instanceof Date ? b : new Date(b);
    return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
  }
  function fmtDateTime(d: Date | number) {
    return `${fmtDate(d)} ${fmtTime(d)}`;
  }

  function toMoisKey(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }
  const prevMois = $derived.by(() => {
    const [y, m] = mois.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    return toMoisKey(d);
  });
  const nextMois = $derived.by(() => {
    const [y, m] = mois.split('-').map(Number);
    const d = new Date(y, m, 1);
    return toMoisKey(d);
  });
  const moisLabel = $derived(
    new Date(mois + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  );
  const moisAujourdhui = $derived(toMoisKey(new Date()));

  let showAbsenceForm = $state(false);
</script>

<svelte:head>
  <title>Tableau de bord - Badgeuse</title>
</svelte:head>

<div class="min-h-screen bg-slate-50">
  <header class="bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center">
    <h1 class="text-lg font-semibold text-slate-800">Badgeuse</h1>
    <div class="flex items-center gap-4">
      {#if isDev}
        <button
          type="button"
          onclick={resetDb}
          disabled={resetLoading}
          class="text-sm px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
          title="Vider pointages et absences (dev uniquement)"
        >
          {resetLoading ? '…' : 'Reset BDD'}
        </button>
      {/if}
      <span class="text-slate-600 text-sm capitalize">{role}</span>
      <a href="/logout" class="text-slate-500 hover:text-slate-700 text-sm">Déconnexion</a>
    </div>
  </header>

  <main class="max-w-5xl mx-auto p-4 space-y-8">
    {#if role === 'employe'}
      <!-- Pointage -->
      <section class="bg-white rounded-xl shadow p-6">
        <h2 class="text-lg font-semibold text-slate-800 mb-4">Pointage</h2>
        {#if enCours}
          <p class="text-slate-600 mb-2">
            Pointé depuis {fmtDateTime(enCours.arrivee)}
          </p>
          <form
            method="POST"
            action="?/depointer"
            use:enhance
            onsubmit={(e) => {
              const form = e.currentTarget;
              const input = form.querySelector<HTMLInputElement>('input[name="departAt"]');
              if (input) input.value = new Date().toISOString();
            }}
          >
            <input type="hidden" name="departAt" value="" />
            <button
              type="submit"
              class="px-6 py-3 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600"
            >
              Se dépointer
            </button>
          </form>
        {:else}
          <form
            method="POST"
            action="?/pointer"
            use:enhance
            onsubmit={(e) => {
              const form = e.currentTarget;
              const input = form.querySelector<HTMLInputElement>('input[name="arriveeAt"]');
              if (input) input.value = new Date().toISOString();
            }}
          >
            <input type="hidden" name="arriveeAt" value="" />
            <button
              type="submit"
              class="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700"
            >
              Se pointer
            </button>
          </form>
        {/if}
      </section>
    {/if}

    <!-- Filtre mois (patron + lien employe) -->
    <section class="flex items-center gap-4 flex-wrap">
      <span class="text-slate-700 font-medium">{moisLabel}</span>
      <a
        href="?mois={moisAujourdhui}"
        class="px-3 py-1 rounded bg-slate-200 hover:bg-slate-300 text-sm"
      >
        Aujourd'hui
      </a>
      <a
        href="?mois={prevMois}"
        class="px-3 py-1 rounded bg-slate-200 hover:bg-slate-300 text-sm"
      >
        ← Mois précédent
      </a>
      <a
        href="?mois={nextMois}"
        class="px-3 py-1 rounded bg-slate-200 hover:bg-slate-300 text-sm"
      >
        Mois suivant →
      </a>
    </section>

    <!-- Pointages -->
    <section class="bg-white rounded-xl shadow p-6">
      <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 class="text-lg font-semibold text-slate-800">Pointages</h2>
        <div class="flex flex-wrap gap-3 text-sm text-slate-600">
          <span
            class="bg-slate-100 px-3 py-2 rounded-lg"
            title="8h30-12h00 et 13h30-17h00, Lundi à Vendredi"
          >
            <span class="font-medium text-slate-800">Heures effectuées ce mois-ci ({moisLabelCourt}) :</span>
            {fmtDuree(heuresEffectueesMinutes)}
            <span class="text-slate-500 text-xs ml-1">(plages légales)</span>
          </span>
          <span class="bg-slate-50 px-3 py-2 rounded-lg border border-slate-200" title="Somme des durées affichées">
            <span class="font-medium text-slate-800">Total brut :</span>
            {fmtDuree(totalBrutMinutes)}
          </span>
          <span class="bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
            <span class="font-medium text-slate-800">Heures d'absence ce mois-ci ({moisLabelCourt}) :</span>
            {fmtDuree(heuresAbsenceMinutes)}
          </span>
        </div>
      </div>
      {#if pointages.length === 0}
        <p class="text-slate-500">Aucun pointage sur cette période.</p>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-slate-200 text-left text-slate-600">
                <th class="pb-2 pr-4">Date</th>
                <th class="pb-2 pr-4">Arrivée</th>
                <th class="pb-2 pr-4">Départ</th>
                <th class="pb-2">Durée</th>
              </tr>
            </thead>
            <tbody>
              {#each pointages as p}
                <tr class="border-b border-slate-100">
                  <td class="py-2 pr-4">{fmtDate(p.arrivee)}</td>
                  <td class="py-2 pr-4">{fmtTime(p.arrivee)}</td>
                  <td class="py-2 pr-4">
                    {#if p.depart}
                      {sameDay(p.arrivee, p.depart) ? fmtTime(p.depart) : fmtDate(p.depart) + ' ' + fmtTime(p.depart)}
                    {:else}
                      —
                    {/if}
                  </td>
                  <td class="py-2">
                    {p.dureeMinutes != null ? `${Math.floor(p.dureeMinutes / 60)}h${String(p.dureeMinutes % 60).padStart(2, '0')}` : '—'}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </section>

    <!-- Absences -->
    <section class="bg-white rounded-xl shadow p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-semibold text-slate-800">Absences</h2>
        {#if role === 'employe'}
          <button
            type="button"
            onclick={() => (showAbsenceForm = !showAbsenceForm)}
            class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            {showAbsenceForm ? 'Annuler' : 'Nouvelle absence'}
          </button>
        {/if}
      </div>

      {#if role === 'employe' && showAbsenceForm}
        <form
          method="POST"
          action="?/absence"
          use:enhance={({ form }) => {
            const debutLocal = form.querySelector<HTMLInputElement>('#debut-local');
            const finLocal = form.querySelector<HTMLInputElement>('#fin-local');
            const debutHidden = form.querySelector<HTMLInputElement>('input[name="debut"]');
            const finHidden = form.querySelector<HTMLInputElement>('input[name="fin"]');
            if (debutLocal?.value && debutHidden) debutHidden.value = new Date(debutLocal.value).toISOString();
            if (finLocal?.value && finHidden) finHidden.value = new Date(finLocal.value).toISOString();
            showAbsenceForm = false;
            return {};
          }}
          class="mb-6 p-4 bg-slate-50 rounded-lg space-y-3"
        >
          <input type="hidden" name="debut" value="" />
          <input type="hidden" name="fin" value="" />
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-slate-600 mb-1">Début</label>
              <input
                id="debut-local"
                type="datetime-local"
                required
                class="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label class="block text-sm text-slate-600 mb-1">Fin</label>
              <input
                id="fin-local"
                type="datetime-local"
                required
                class="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
          </div>
          <div>
            <label class="block text-sm text-slate-600 mb-1">Titre</label>
            <input
              type="text"
              name="titre"
              required
              placeholder="ex. Congés"
              class="w-full px-3 py-2 border border-slate-300 rounded"
            />
          </div>
          <div>
            <label class="block text-sm text-slate-600 mb-1">Description</label>
            <textarea
              name="description"
              rows="2"
              class="w-full px-3 py-2 border border-slate-300 rounded"
            ></textarea>
          </div>
          <div>
            <label class="block text-sm text-slate-600 mb-1">Ma note</label>
            <input
              type="text"
              name="noteEmploye"
              placeholder="Optionnel"
              class="w-full px-3 py-2 border border-slate-300 rounded"
            />
          </div>
          <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Enregistrer l'absence
          </button>
        </form>
      {/if}

      {#if absences.length === 0}
        <p class="text-slate-500">Aucune absence sur cette période.</p>
      {:else}
        <div class="space-y-4">
          {#each absences as a}
            <div class="border border-slate-200 rounded-lg p-4">
              <div class="flex justify-between items-start gap-4">
                <div>
                  <h3 class="font-medium text-slate-800">{a.titre}</h3>
                  <p class="text-slate-600 text-sm mt-1">{a.description}</p>
                  <p class="text-slate-500 text-sm mt-1">
                    {fmtDateTime(a.debut)} → {fmtDateTime(a.fin)}
                  </p>
                  {#if a.noteEmploye}
                    <p class="text-slate-500 text-sm mt-1"><em>Note : {a.noteEmploye}</em></p>
                  {/if}
                </div>
                {#if role === 'patron'}
                  <form
                    method="POST"
                    action="?/notePatron"
                    use:enhance
                    class="flex-1 max-w-xs"
                  >
                    <input type="hidden" name="id" value={a.id} />
                    <label class="block text-sm text-slate-600 mb-1">Note patron</label>
                    <div class="flex gap-2">
                      <input
                        type="text"
                        name="notePatron"
                        value={a.notePatron ?? ''}
                        placeholder="Votre note"
                        class="flex-1 px-3 py-2 border border-slate-300 rounded text-sm"
                      />
                      <button
                        type="submit"
                        class="px-3 py-2 bg-slate-600 text-white text-sm rounded hover:bg-slate-700"
                      >
                        OK
                      </button>
                    </div>
                  </form>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>

    <!-- Calendrier (liste par jour du mois) -->
    <section class="bg-white rounded-xl shadow p-6">
      <h2 class="text-lg font-semibold text-slate-800 mb-4">Calendrier des absences</h2>
      {#if mois}
        {@const [y, m] = mois.split('-').map(Number)}
        {@const daysInMonth = new Date(y, m, 0).getDate()}
        <div class="grid grid-cols-7 gap-1 text-sm">
          {#each ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] as day}
            <div class="text-slate-500 font-medium text-center">{day}</div>
          {/each}
          {#each Array.from({ length: (new Date(y, m - 1, 1).getDay() + 6) % 7 }) as _}
            <div></div>
          {/each}
          {#each Array.from({ length: daysInMonth }, (_, i) => i + 1) as day}
            {@const dayAbsences = absencesAll.filter((a) => {
              const d = a.debut instanceof Date ? a.debut : new Date(a.debut as number);
              const e = a.fin instanceof Date ? a.fin : new Date(a.fin as number);
              const dayStart = new Date(y, m - 1, day, 0, 0, 0);
              const dayEnd = new Date(y, m - 1, day, 23, 59, 59);
              return d <= dayEnd && e >= dayStart;
            })}
            <div
              class="min-h-14 p-1 rounded border border-slate-100 {dayAbsences.length
                ? 'bg-amber-50 border-amber-200'
                : ''}"
            >
              <span class="text-slate-600">{day}</span>
              {#each dayAbsences as abs}
                <div class="text-xs text-amber-800 truncate" title={abs.titre}>{abs.titre}</div>
              {/each}
            </div>
          {/each}
        </div>
      {/if}
    </section>
  </main>
</div>
