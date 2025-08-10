import React, { useState, useEffect, useRef } from "react";
import * as Tone from "tone";
import { motion } from "framer-motion";

export default function EarTrainerApp() {
  // Modes: interval, chord, scale
  const MODES = ["Interval", "Chord", "Scale"];
  const [mode, setMode] = useState("Interval");

  // Difficulty / options
  const [rootNote, setRootNote] = useState("C4");
  const [intervalsEnabled, setIntervalsEnabled] = useState([
    "m2",
    "M2",
    "m3",
    "M3",
    "P4",
    "P5",
    "m6",
    "M6",
    "m7",
    "M7",
  ]);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [message, setMessage] = useState("");

  // Generated test data
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const synthRef = useRef(null);

  useEffect(() => {
    synthRef.current = new Tone.Synth().toDestination();

    // Cleanup
    return () => {
      try {
        synthRef.current.dispose();
      } catch (e) {}
    };
  }, []);

  // Simple fallback using Tone.Synth if sampler samples not provided
  const playNote = async (note, dur = "1n") => {
    await Tone.start();
    if (!synthRef.current) synthRef.current = new Tone.Synth().toDestination();
    const s = synthRef.current;
    if (s.triggerAttackRelease) s.triggerAttackRelease(note, dur);
  };

  // Helpers
  const NOTES = [
    "C3",
    "C#3",
    "D3",
    "D#3",
    "E3",
    "F3",
    "F#3",
    "G3",
    "G#3",
    "A3",
    "A#3",
    "B3",
    "C4",
    "C#4",
    "D4",
    "D#4",
    "E4",
    "F4",
    "F#4",
    "G4",
    "G#4",
    "A4",
    "A#4",
    "B4",
    "C5",
    "C#5",
    "D5",
    "D#5",
    "E5",
  ];

  const INTERVAL_SEMITONES = {
    P1: 0,
    m2: 1,
    M2: 2,
    m3: 3,
    M3: 4,
    P4: 5,
    TT: 6,
    P5: 7,
    m6: 8,
    M6: 9,
    m7: 10,
    M7: 11,
    P8: 12,
  };

  function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function generateIntervalChallenge() {
    // choose root and interval
    const root = randomFrom(NOTES.slice(6, NOTES.length - 6)); // avoid extremes
    const intervalName = randomFrom(Object.keys(INTERVAL_SEMITONES));
    const semis = INTERVAL_SEMITONES[intervalName];
    // compute second note
    function transpose(note, semitones) {
      // simple transpose using NOTES array
      const idx = NOTES.indexOf(note);
      if (idx === -1) return note;
      const newIdx = Math.min(Math.max(0, idx + semitones), NOTES.length - 1);
      return NOTES[newIdx];
    }
    const second = transpose(root, semis);
    return { type: "interval", root, intervalName, second };
  }

  function generateChordChallenge() {
    // triad or seventh
    const roots = NOTES.slice(6, NOTES.length - 8);
    const root = randomFrom(roots);
    const chordTypes = ["maj", "min", "dim", "aug", "7", "maj7", "m7"];
    const type = randomFrom(chordTypes);
    // For playback we'll compute notes — naive voicing
    const semis = {
      maj: [0, 4, 7],
      min: [0, 3, 7],
      dim: [0, 3, 6],
      aug: [0, 4, 8],
      7: [0, 4, 7, 10],
      maj7: [0, 4, 7, 11],
      m7: [0, 3, 7, 10],
    };
    const chordNotes = semis[type].map((s) => transposeNote(root, s));
    return { type: "chord", root, chordType: type, chordNotes };

    function transposeNote(n, s) {
      const idx = NOTES.indexOf(n);
      const newIdx = Math.min(NOTES.length - 1, idx + s);
      return NOTES[newIdx];
    }
  }

  function generateScaleChallenge() {
    const roots = NOTES.slice(6, NOTES.length - 8);
    const root = randomFrom(roots);
    const scaleTypes = {
      major: [2, 2, 1, 2, 2, 2, 1],
      minor: [2, 1, 2, 2, 1, 2, 2],
      dorian: [2, 1, 2, 2, 2, 1, 2],
    };
    const st = randomFrom(Object.keys(scaleTypes));
    const pattern = scaleTypes[st];
    const notes = [root];
    let idx = NOTES.indexOf(root);
    for (const step of pattern) {
      idx += step;
      notes.push(NOTES[Math.min(idx, NOTES.length - 1)]);
    }
    return { type: "scale", root, scaleType: st, notes };
  }

  const generateChallenge = () => {
    if (mode === "Interval") return generateIntervalChallenge();
    if (mode === "Chord") return generateChordChallenge();
    return generateScaleChallenge();
  };

  const next = () => {
    setMessage("");
    const c = generateChallenge();
    setCurrentChallenge(c);
  };

  // Updated playChallenge — generate new challenge, set state, then play it
  const playChallenge = async () => {
    await Tone.start();

    const newChallenge = generateChallenge();
    setCurrentChallenge(newChallenge);

    if (newChallenge.type === "interval") {
      await playNote(newChallenge.root, "8n");
      await new Promise((r) => setTimeout(r, 250));
      await playNote(newChallenge.second, "8n");
    } else if (newChallenge.type === "chord") {
      for (const n of newChallenge.chordNotes) {
        await playNote(n, "8n");
        await new Promise((r) => setTimeout(r, 120));
      }
    } else if (newChallenge.type === "scale") {
      for (const n of newChallenge.notes) {
        await playNote(n, "16n");
        await new Promise((r) => setTimeout(r, 80));
      }
    }
  };

  // User answers
  const handleAnswer = (answer) => {
    if (!currentChallenge) return;
    let ok = false;
    if (currentChallenge.type === "interval") {
      ok = answer === currentChallenge.intervalName;
    } else if (currentChallenge.type === "chord") {
      ok = answer === `${currentChallenge.root} ${currentChallenge.chordType}`;
    } else if (currentChallenge.type === "scale") {
      ok = answer === currentChallenge.scaleType;
    }
    setScore((s) => ({
      correct: s.correct + (ok ? 1 : 0),
      total: s.total + 1,
    }));
    setMessage(
      ok
        ? "Correct!"
        : `Wrong — correct: ${
            currentChallenge.intervalName ||
            currentChallenge.chordType ||
            currentChallenge.scaleType
          }`
    );
    // auto next in 900ms
    setTimeout(next, 900);
  };

  // Initial challenge on mode change
  useEffect(() => {
    next();
  }, [mode]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">
            EarTrainer — practice intervals, chords, scales
          </h1>
          <div className="text-sm opacity-80">
            Score: {score.correct}/{score.total}
          </div>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <section className="col-span-1 md:col-span-2 bg-slate-700/30 rounded-2xl p-4 shadow-lg">
            <div className="flex gap-2 items-center mb-4">
              {MODES.map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-3 py-1 rounded-full ${
                    mode === m ? "bg-indigo-500" : "bg-slate-600/40"
                  }`}
                >
                  {m}
                </button>
              ))}
              <div className="ml-auto flex gap-2">
                <button
                  onClick={playChallenge}
                  className="px-3 py-1 rounded bg-emerald-500"
                >
                  Play
                </button>
                <button onClick={next} className="px-3 py-1 rounded bg-sky-500">
                  Next
                </button>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-800/60">
              <h2 className="text-xl font-semibold mb-2">Challenge</h2>
              {currentChallenge ? (
                <div>
                  <div className="mb-2">
                    Type:{" "}
                    <span className="font-medium">{currentChallenge.type}</span>
                  </div>
                  <div className="mb-2">
                    Hint:{" "}
                    <span className="italic">{currentChallenge.root}</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                    {mode === "Interval" &&
                      Object.keys(INTERVAL_SEMITONES).map((i) => (
                        <button
                          key={i}
                          onClick={() => handleAnswer(i)}
                          className="px-3 py-2 rounded bg-slate-600/30 hover:bg-slate-600/50"
                        >
                          {i}
                        </button>
                      ))}

                    {mode === "Chord" &&
                      ["maj", "min", "dim", "aug", "7", "maj7", "m7"].map(
                        (t) => (
                          <button
                            key={t}
                            onClick={() =>
                              handleAnswer(`${currentChallenge.root} ${t}`)
                            }
                            className="px-3 py-2 rounded bg-slate-600/30 hover:bg-slate-600/50"
                          >
                            {t}
                          </button>
                        )
                      )}

                    {mode === "Scale" &&
                      ["major", "minor", "dorian"].map((s) => (
                        <button
                          key={s}
                          onClick={() => handleAnswer(s)}
                          className="px-3 py-2 rounded bg-slate-600/30 hover:bg-slate-600/50"
                        >
                          {s}
                        </button>
                      ))}
                  </div>

                  <div className="mt-4">
                    <motion.div
                      animate={{ scale: message === "Correct!" ? 1.03 : 1 }}
                      className="inline-block px-3 py-1 rounded text-sm bg-slate-900/40"
                    >
                      {message}
                    </motion.div>
                  </div>
                </div>
              ) : (
                <div>Loading...</div>
              )}
            </div>
          </section>

          <aside className="bg-slate-700/30 rounded-2xl p-4 shadow-lg">
            <h3 className="font-semibold mb-2">Options</h3>
            <div className="mb-3">
              <label className="block text-sm mb-1">Root note</label>
              <select
                value={rootNote}
                onChange={(e) => setRootNote(e.target.value)}
                className="w-full bg-slate-600/40 rounded p-2"
              >
                {NOTES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="block text-sm mb-1">Practice</label>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setScore({ correct: 0, total: 0 });
                    setMessage("");
                  }}
                  className="px-3 py-1 rounded bg-red-500"
                >
                  Reset
                </button>
                <button
                  onClick={async () => {
                    await Tone.start();
                    setMessage("Audio unlocked");
                  }}
                  className="px-3 py-1 rounded bg-amber-500"
                >
                  Unlock Audio
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs opacity-80"></p>
            </div>
          </aside>
        </main>

        <footer className="mt-6 text-sm opacity-80"></footer>
      </div>
    </div>
  );
}
