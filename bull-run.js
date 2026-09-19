// Bull Run join screen: shared join behaviour (game-join.js) with Bull Run's modes

initGameJoin({
  id: "bull_run",
  url: "games/bull_run/index.html",
  name: "Bull Run",
  modes: { practice: "Practice", survival: "Survival" },
  modeKey: "bull_run_mode_v1", // shared with the game, so both remember the same mode
});
