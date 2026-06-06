(function () {
  'use strict';
  var S = window.GameShared;

  GameModes.register({
    id: 'leaderboard',
    name: 'Leaderboard demo',
    desc: 'Zombie Arena with a mock global scoreboard on game over (not live yet).',
    hint: '↑ ↓ ← → or mouse · SPACE shoot · see mock ranks on death',
    flags: { gore: true, mouseMove: true, topDown: true, mockLeaderboard: true },
    extends: 'zombie'
  });
})();
