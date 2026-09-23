/* Public project configuration; never add a secret/service_role key here. */
const PROJECT_URL = 'https://ynhhetcyzgnggqmrwsrc.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_WLzmFWaTOu6QkjcI3JDHTQ_20llqBlW';
const root = document.getElementById('viewRoot');
const bar = document.getElementById('actionBar');
const subtitle = document.getElementById('pageSubtitle');
const notice = document.createElement('p');
notice.setAttribute('role', 'status');
root.before(notice);
const labels = ['Offen', 'Gelöst', 'Erledigt'];
const colors = ['open', 'solved', 'done'];
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let client, profile, tasks = [], students = [], progress = [], busy = false;
function message(text, error = false) {
  notice.textContent = text;
  notice.style.color = error ? '#b42318' : '#14532d';
}
async function checked(query) {
  const result = await query;
  if (result.error) throw result.error;
  return result.data;
}
async function run(action) {
  if (busy) return;
  busy = true;
  document.querySelectorAll('button').forEach(b => b.disabled = true);
  try { await action(); }
  catch (error) { message('Aktion fehlgeschlagen: ' + error.message, true); }
  finally {
    busy = false;
    document.querySelectorAll('button').forEach(b => b.disabled = false);
  }
}
function login() {
  profile = null; tasks = []; students = []; progress = [];
  subtitle.textContent = 'Persönlich anmelden';
  bar.innerHTML = '';
  root.innerHTML = '<section class="landing-card"><h2>Willkommen</h2><p>Melde dich mit dem für dieses Portal eingerichteten Konto an.</p><form id="loginForm"><label>E-Mail<input id="email" type="email" autocomplete="username" required></label><label>Passwort<input id="password" type="password" autocomplete="current-password" required></label><button class="primary">Anmelden</button></form><p class="access-note">Noch kein Zugang oder Passwort vergessen? Wende dich an die Lehrperson.</p></section>';
  document.getElementById('loginForm').onsubmit = event => {
    event.preventDefault();
    run(async () => {
      message('Anmeldung wird geprüft …');
      await checked(client.auth.signInWithPassword({
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value
      }));
      document.getElementById('password').value = '';
      await load();
    });
  };
}
async function load() {
  const { user } = await checked(client.auth.getUser());
  profile = await checked(client.from('tracker_profiles').select('*').eq('id', user.id).maybeSingle());
  bar.innerHTML = '<button class="secondary" id="refresh">Aktualisieren</button><button class="secondary" id="logout">Abmelden</button>';
  document.getElementById('logout').onclick = () => run(async () => {
    await checked(client.auth.signOut()); login(); message('Abgemeldet.');
  });
  document.getElementById('refresh').onclick = () => run(load);
  if (!profile) {
    root.innerHTML = '<section class="panel empty">Dein Konto ist noch keiner Klasse zugeordnet. Bitte die Lehrperson um Freischaltung.</section>';
    message('Angemeldet, aber noch kein Portalprofil vorhanden.', true);
    return;
  }
  const results = await Promise.all([
    checked(client.from('tracker_tasks').select('*').order('created_at').order('id')),
    checked(client.from('tracker_profiles').select('*').eq('role', 'student').order('display_name')),
    checked(client.from('tracker_progress').select('*'))
  ]);
  [tasks, students, progress] = results;
  render();
  message('Stand geladen: ' + new Date().toLocaleTimeString('de-CH') + '. Mit „Aktualisieren“ neue Einträge abrufen.');
}
function state(student, task) {
  return progress.find(p => p.student_id === student && p.task_id === task)?.state ?? 0;
}
function percent(student) {
  return tasks.length ? Math.round(tasks.reduce((sum, task) => sum + state(student, task.id), 0) / (tasks.length * 2) * 100) : 0;
}
async function saveState(student, task, value) {
  message('Wird gespeichert …');
  await checked(client.from('tracker_progress').upsert(
    { student_id: student, task_id: task, state: value },
    { onConflict: 'student_id,task_id' }
  ));
  await load();
  message('Fortschritt online gespeichert.');
}
function render() {
  const teacher = profile.role === 'teacher';
  subtitle.textContent = teacher ? 'Klassenübersicht · ' + profile.display_name : 'Mein Fortschritt · ' + profile.display_name;
  if (teacher) {
    root.innerHTML = '<section class="panel student-panel"><form id="addTaskForm" class="key-row"><input id="taskTitle" aria-label="Neue Aufgabe" placeholder="Neue Aufgabe" maxlength="200" required><button class="primary">Aufgabe hinzufügen</button></form><p class="access-note">Schülerkonten werden im Supabase-Dashboard angelegt und zugeordnet (siehe SUPABASE_SETUP.md).</p><div class="table-wrap"><table><thead><tr><th>Schüler/in</th>' +
      tasks.map(t => '<th>' + esc(t.title) + '<br><button data-rename="' + t.id + '" class="secondary">Umbenennen</button> <button data-delete="' + t.id + '" class="danger">Entfernen</button></th>').join('') +
      '<th>Fortschritt</th></tr></thead><tbody>' +
      students.map(s => '<tr><td>' + esc(s.display_name) + '</td>' + tasks.map(t => {
        const value = state(s.id, t.id);
        return '<td><button class="status ' + colors[value] + '" data-student="' + s.id + '" data-task="' + t.id + '" data-state="' + ((value + 1) % 3) + '">' + labels[value] + '</button></td>';
      }).join('') + '<td>' + percent(s.id) + ' %</td></tr>').join('') +
      '</tbody></table></div>' + (!students.length ? '<p>Noch keine Schüler zugeordnet.</p>' : '') + '</section>';
    document.getElementById('addTaskForm').onsubmit = event => {
      event.preventDefault();
      const title = document.getElementById('taskTitle').value.trim();
      if (title) run(async () => {
        await checked(client.from('tracker_tasks').insert({ title, teacher_id: profile.id }));
        await load();
      });
    };
    root.querySelectorAll('[data-delete]').forEach(button => button.onclick = () => {
      if (confirm('Diese Aufgabe und alle zugehörigen Fortschritte löschen?')) run(async () => {
        await checked(client.from('tracker_tasks').delete().eq('id', button.dataset.delete));
        await load();
      });
    });
    root.querySelectorAll('[data-rename]').forEach(button => button.onclick = () => {
      const title = prompt('Neuer Aufgabentitel:', tasks.find(t => t.id === button.dataset.rename).title)?.trim();
      if (title && title.length <= 200) run(async () => {
        await checked(client.from('tracker_tasks').update({ title }).eq('id', button.dataset.rename));
        await load();
      });
    });
  } else {
    root.innerHTML = '<section class="panel student-panel"><h2>' + esc(profile.display_name) + '</h2><p>Dein Fortschritt: <strong>' + percent(profile.id) + ' %</strong></p><div class="task-list">' +
      tasks.map(t => '<article class="task-item"><div><h3>' + esc(t.title) + '</h3><p>Aktuell: ' + labels[state(profile.id, t.id)] + '</p></div><div class="task-actions">' +
        labels.map((label, value) => '<button aria-pressed="' + (state(profile.id, t.id) === value) + '" class="' + colors[value] + '" data-student="' + profile.id + '" data-task="' + t.id + '" data-state="' + value + '">' + label + '</button>').join('') +
        '</div></article>').join('') + (!tasks.length ? '<p>Noch keine Aufgaben vorhanden.</p>' : '') + '</div></section>';
  }
  root.querySelectorAll('[data-task]').forEach(button => button.onclick = () =>
    run(() => saveState(button.dataset.student, button.dataset.task, Number(button.dataset.state))));
}
async function start() {
  root.innerHTML = '<p>Portal wird geladen …</p>';
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.57.4');
    // Session stays in memory: shared classroom devices require login after reload.
    client = createClient(PROJECT_URL, PUBLISHABLE_KEY, { auth: { persistSession: false, detectSessionInUrl: false } });
    client.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') { login(); message('Bitte erneut anmelden.'); }
    });
    login();
  } catch {
    root.innerHTML = '<section class="panel empty">Das Portal konnte nicht geladen werden. Bitte Internetverbindung prüfen und die Seite neu laden.</section>';
  }
}
start();
