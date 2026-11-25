'use strict';
// Nacharbeit I0007 (R00026 zweispaltig): „nur Änderungen“ zeigt in der Nebeneinander-Ansicht dieselben Lücken-Bedienelemente
// wie einspaltig; die aufgedeckten Kontextzeilen der ganzen Datei stehen in beiden Spalten (dieselbe Zeile alt/neu), ihre
// Nummern, der VS-Code-Link und das Anmerkziel (Nummer neu) stimmen — eine gezeichnete Zeilenliste als Quelle (Lehre #9).
const { test, expect } = require('../dsl/nebeneinander.js');

const KONTEXT = (nummer, text) => ({ art: 'kontext', nummer, text });
const MINUS = (nummer, text) => ({ art: 'minus', nummer, text });
const PLUS = (nummer, text) => ({ art: 'plus', nummer, text });

test.describe('Nebeneinander-Ansicht: Lücken aufklappen (R00026, Nacharbeit I0007)', () => {
  test('soll die 8 verborgenen Zeilen von lang.txt ankündigen, aufdecken und in beiden Spalten zeigen', async ({ neben }) => {
    await neben.starten({ vorbereitung: 'Repo A', commits: ['q', 'p'], modus: 'einzeln' });
    await neben.anordnungWaehlen('nebeneinander');
    await neben.dateiAnsehen('lang.txt');

    // `lang.txt`: `z03` geändert und `z18` entfernt → zwei Abschnitte, dazwischen die Zeilen 7–14.
    await expect.poll(() => neben.luecken()).toEqual([
      { text: '8 verborgene Zeilen', schritt: '8 aufklappen', ganz: 'Ganz aufklappen' },
    ]);
    expect(await neben.hatZeile(7)).toBe(false);
    expect(await neben.hatZeile(14)).toBe(false);

    await neben.lueckeAufklappen(1);

    await expect.poll(() => neben.hatZeile(7)).toBe(true);
    await expect.poll(() => neben.luecken()).toEqual([]);
    // Die aufgedeckten Zeilen stehen in beiden Spalten, mit der Nummer ihrer Seite (alt = neu, hier 7 und 14).
    await neben.paarMitZeile(7, { links: KONTEXT(7, 'z07'), rechts: KONTEXT(7, 'z07') });
    await neben.paarMitZeile(14, { links: KONTEXT(14, 'z14'), rechts: KONTEXT(14, 'z14') });
    // Der Versatz der Löschung bleibt: `z19` steht alt 19 / neu 18, `−z03` gegen `+Z03` (Nummern der Paarung).
    await neben.paarMitZeile(18, { links: KONTEXT(19, 'z19'), rechts: KONTEXT(18, 'z19') });
    await neben.paarMitZeile(3, { links: MINUS(3, 'z03'), rechts: PLUS(3, 'Z03') });
    // Aufgedeckte Zeile: eigener VS-Code-Link und Anmerkziel an der Nummer neu.
    await neben.sprungzeile(10, 'lang.txt Zeile 10, in VS Code öffnen');
    await neben.rechtsSeiteAnklicken(10);
    const name = 'Anmerkung zu lang.txt, Zeile 10';
    await neben.feldOffenMitFokus(name);
    await neben.textSchreiben(name, 'Klammer fehlt');
    await neben.speichern(name);
    await neben.anmerkungenUnter({ neu: 10 }, [{ text: 'Klammer fehlt', stelle: 'lang.txt:10' }]);

    // „untereinander“ unverändert: dieselbe Lücke, dieselbe aufgedeckte Zeile.
    await neben.anordnungWaehlen('untereinander');
    await expect.poll(() => neben.luecken()).toEqual([
      { text: '8 verborgene Zeilen', schritt: '8 aufklappen', ganz: 'Ganz aufklappen' },
    ]);
    expect(await neben.hatZeile(7)).toBe(false);

    await neben.lueckeAufklappen(1);

    await expect.poll(() => neben.zeilentext(7)).toBe('z07');
    expect(await neben.luecken()).toEqual([]);
  });

  test('soll die 23 verborgene Zeile von weit.txt je 20 aufdecken und die Zeilen beider Spalten zeigen', async ({ neben }) => {
    await neben.starten({ vorbereitung: 'Repo W', commits: ['w2', 'w1'], modus: 'einzeln' });
    await neben.anordnungWaehlen('nebeneinander');
    await neben.dateiAnsehen('weit.txt');

    // `weit.txt`: `z05` und `z35` geändert → zwei Abschnitte, die Lücke vor dem ersten (Zeile 1) und die mit 23 Zeilen (9–31);
    // die Lücke nach dem letzten Abschnitt (39–60) kennt die Ansicht erst mit der Gesamtzeilenzahl der ganzen Datei.
    await expect.poll(() => neben.luecken()).toEqual([
      { text: '1 verborgene Zeile', schritt: '1 aufklappen', ganz: 'Ganz aufklappen' },
      { text: '23 verborgene Zeilen', schritt: '20 aufklappen', ganz: 'Ganz aufklappen' },
    ]);
    expect(await neben.hatZeile(9)).toBe(false);
    expect(await neben.hatZeile(31)).toBe(false);

    await neben.lueckeAufklappen(2);

    await expect.poll(() => neben.hatZeile(9)).toBe(true);
    await expect.poll(() => neben.luecken()).toEqual([
      { text: '1 verborgene Zeile', schritt: '1 aufklappen', ganz: 'Ganz aufklappen' },
      { text: '3 verborgene Zeilen', schritt: '3 aufklappen', ganz: 'Ganz aufklappen' },
      { text: '22 verborgene Zeilen', schritt: '20 aufklappen', ganz: 'Ganz aufklappen' },
    ]);
    await neben.paarMitZeile(9, { links: KONTEXT(9, 'z09'), rechts: KONTEXT(9, 'z09') });
    await neben.paarMitZeile(28, { links: KONTEXT(28, 'z28'), rechts: KONTEXT(28, 'z28') });
    expect(await neben.hatZeile(29)).toBe(false);

    await neben.lueckeAufklappen(2);

    await expect.poll(() => neben.hatZeile(31)).toBe(true);
    await neben.paarMitZeile(31, { links: KONTEXT(31, 'z31'), rechts: KONTEXT(31, 'z31') });

    // Lücke vor dem ersten Abschnitt „ganz“: `z01` in beiden Spalten.
    await neben.lueckeAufklappen(1, true);

    await neben.paarMitZeile(1, { links: KONTEXT(1, 'z01'), rechts: KONTEXT(1, 'z01') });
    await expect.poll(() => neben.luecken()).toEqual([
      { text: '22 verborgene Zeilen', schritt: '20 aufklappen', ganz: 'Ganz aufklappen' },
    ]);
  });

  test('soll einen Fehler beim Aufdecken an der Lücke melden und sie zugeklappt lassen', async ({ neben }) => {
    await neben.starten({ vorbereitung: 'Repo W', commits: ['w2', 'w1'], modus: 'einzeln' });
    await neben.anordnungWaehlen('nebeneinander');
    await neben.dateiAnsehen('weit.txt');
    await neben.antwortErsetzen({ pfad: 'weit.txt', umfang: 'ganz', status: 500 });

    await neben.lueckeAufklappen(2);

    await neben.lueckeMeldet(2, 'Diff konnte nicht gelesen werden');
    await expect.poll(() => neben.luecken()).toHaveLength(2);
    expect(await neben.hatZeile(9)).toBe(false);
  });
});
