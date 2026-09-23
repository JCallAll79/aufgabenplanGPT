# Supabase einrichten

Die Webseite verwendet Supabase für Anmeldung und Fortschritte. Das Schema wurde im Projekt bereits eingerichtet; das Einrichtungsskript nicht erneut ausführen. Die folgenden Schritte dokumentieren auch die Einrichtung eines neuen Projekts.

## 1. Datenbank anlegen
In Supabase links SQL Editor öffnen, eine neue Abfrage erstellen, den kompletten Inhalt von supabase_setup.sql einfügen und Run klicken. Einmal ausführen; bei Fehlern wird die gesamte Einrichtung zurückgerollt.

## 2. Konten erstellen
Unter Authentication > Users > Add user > Create new user zuerst dein Lehrpersonenkonto mit E-Mail und starkem Passwort erstellen. E-Mail als bestätigt markieren (Auto Confirm User), sofern angeboten.
Danach Schülerkonten ebenso erstellen. Schüler benötigen kein Microsoft- oder GitHub-Konto. Die E-Mail dient hier zur Anmeldung bei diesem eigenständigen Portal.
Kopiere jeweils die User UID.
Öffentliche Neuregistrierungen in den Auth-Einstellungen deaktivieren. Neue Konten alleine haben ohnehin keinen Zugriff auf Portaldaten.

## 3. Konten zuordnen
Neue SQL-Abfrage öffnen. Platzhalter durch die kopierten UUIDs ersetzen, dann ausführen:

```sql
insert into public.tracker_profiles (id, display_name, role)
values ('LEHRPERSON-UUID', 'Lehrperson', 'teacher');

insert into public.tracker_profiles (id, display_name, role, teacher_id)
values
 ('SCHUELER-1-UUID', 'Schüler 1', 'student', 'LEHRPERSON-UUID'),
 ('SCHUELER-2-UUID', 'Schüler 2', 'student', 'LEHRPERSON-UUID');
```

Nur die Zeilen für tatsächlich angelegte Konten ausführen. Weitere Schüler lassen sich später mit derselben INSERT-Anweisung zuordnen. teacher_id muss auf das Lehrpersonenprofil zeigen.
Rollen und Zuordnungen werden ausschliesslich im Dashboard verwaltet. Das Portal darf diese nicht ändern.

## 4. Webseite testen und veröffentlichen
index.html und portal.js gemeinsam über einen lokalen Webserver oder einen HTTPS-Webhost bereitstellen; der Webhost muss JavaScript-Module zulassen. Startseite: https://JCallAll79.github.io/aufgabenplanGPT/
Supabase hostet hier die Datenbank und Anmeldung, nicht die HTML-Datei.
Die Verbindung benötigt Internet und lädt die Supabase-Bibliothek von esm.sh.
Der Publishable Key ist öffentlich. Keine geheimen Schlüssel in Webseite oder GitHub eintragen.
Das Datenbankschema und die Zugriffsregeln müssen vor der Nutzung eingerichtet sein.

Als Lehrperson anmelden, eine Aufgabe hinzufügen. In einem separaten Browser als Schüler anmelden, Status ändern, dann in der Lehrpersonenansicht Aktualisieren klicken.
Abmelden und mit einem zweiten Schüler testen: dessen Fortschritt bleibt getrennt.
Aktualisierung erfolgt über den Knopf, nicht automatisch in Echtzeit.
Die Anmeldung bleibt nur bis zum Neuladen/Schliessen der Seite erhalten, damit gemeinsam genutzte Geräte keine dauerhafte Sitzung behalten.

## Abnahme vor dem Einsatz
- Nicht angemeldete Besucher sehen keine Namen oder Aufgaben.
- Schüler können nur eigene Fortschritte lesen und ändern, keine Aufgaben verwalten.
- Eine zweite Lehrperson sieht nur ihre eigenen Aufgaben und Schüler.
- Auch direkte API-Aufrufe dürfen diese Grenzen nicht umgehen: fremde student_id, fremde task_id und Rollenänderungen müssen abgewiesen werden.
- Ein Konto ohne tracker_profiles-Eintrag erhält keine Daten.
- Nach Netzwerkausfall wird kein Speichern behauptet; nach erneuter Anmeldung/Aktualisierung den Serverstand prüfen.

Die SQL-Regeln sind vorbereitet, aber ohne eingerichtete Datenbank und Testkonten noch nicht live geprüft.

## Bestehende Daten und Kontoverwaltung
Bisherige lokale Browserdaten werden nicht gelöscht und nicht automatisch importiert. Die Online-Datenbank beginnt leer.
Die bisherigen offenen Zugangscodes und URL-Parameter gewähren keinen Zugriff mehr.
Namen/Kürzel im Dashboard in tracker_profiles bearbeiten. Konten/Passwörter werden unter Authentication verwaltet; das Portal enthält keine automatische Passwortwiederherstellung. Bei Verlust setzt der Projektadministrator das Passwort über die verfügbaren Auth-Verwaltungsfunktionen zurück.
Aufgaben können im Portal hinzugefügt, umbenannt und gelöscht werden. Löschen entfernt auch ihre Fortschritte.
